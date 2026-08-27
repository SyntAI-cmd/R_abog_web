import { NextResponse } from "next/server";
import { validarVentana } from "../../../lib/agenda";
import {
  consumirIntento,
  identificarOrigen,
  purgarVentanasViejas,
} from "../../../lib/limite";
import {
  leerJSON,
  limpiarTexto,
  pareceBot,
  validarEdad,
  validarNombre,
  validarSituacion,
} from "../../../lib/validacion";
import { ahoraISO, getD1, hayBase } from "../../../db";

/**
 * Solicitud de turno.
 *
 * El servidor es la autoridad. La versión anterior sólo comprobaba el formato y
 * que la fecha fuera futura, y consultaba la tabla `availability` únicamente
 * para ver si el horario estaba bloqueado: cualquier fecha y hora con formato
 * válido entraba, aunque el estudio nunca la hubiera ofrecido (I-FUNC-02).
 *
 * Ahora todo envío atraviesa, en este orden:
 *   1. honeypot y límite de peticiones      → antiabuso barato primero
 *   2. formato y ventana de anticipación    → sin tocar la base
 *   3. idempotencia                         → un doble clic no crea dos turnos
 *   4. el horario existe y está habilitado  → contra el catálogo real
 *   5. inserción con la restricción única   → la base decide quién gana
 *
 * Un turno nace `pending`. No se confirma solo y no requiere pago: ambas cosas
 * son decisiones del estudio, no del código.
 */
export const dynamic = "force-dynamic";

/** 5 solicitudes por hora y por origen. Holgado para una persona, corto para un script. */
const MAXIMO_POR_VENTANA = 5;
const VENTANA_SEGUNDOS = 3600;

export async function POST(request: Request) {
  if (!hayBase()) {
    return NextResponse.json(
      {
        error:
          "El turnero no está disponible en este momento. Escribinos por WhatsApp.",
      },
      { status: 503 },
    );
  }

  const cuerpo = await leerJSON(request);
  if (!cuerpo) {
    return NextResponse.json(
      { error: "No pudimos leer los datos enviados." },
      { status: 400 },
    );
  }

  // 1. Antiabuso.
  if (pareceBot(cuerpo.website)) {
    // Se responde como si hubiera salido bien: decirle al bot que lo detectamos
    // sólo le sirve para ajustar el siguiente intento. No se escribe nada.
    return NextResponse.json({ ok: true, estado: "pending" }, { status: 201 });
  }

  const db = getD1();
  const origen = identificarOrigen(request);

  let veredicto;
  try {
    veredicto = await consumirIntento(
      db,
      `turnos:${origen}`,
      MAXIMO_POR_VENTANA,
      VENTANA_SEGUNDOS,
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos procesar la solicitud. Intentá de nuevo en un momento.",
      },
      { status: 503 },
    );
  }

  if (!veredicto.permitido) {
    return NextResponse.json(
      {
        error:
          "Recibimos varias solicitudes desde esta conexión. Esperá unos minutos o escribinos por WhatsApp.",
      },
      {
        status: 429,
        headers: { "retry-after": String(veredicto.reintentarEnSegundos) },
      },
    );
  }

  // 2. Datos y ventana temporal.
  const nombre = validarNombre(cuerpo.name);
  if (!nombre.ok)
    return NextResponse.json(
      { error: nombre.error, campo: "name" },
      { status: 400 },
    );

  const edad = validarEdad(cuerpo.age);
  if (!edad.ok)
    return NextResponse.json(
      { error: edad.error, campo: "age" },
      { status: 400 },
    );

  const situacion = validarSituacion(cuerpo.situation);
  if (!situacion.ok) {
    return NextResponse.json(
      { error: situacion.error, campo: "situation" },
      { status: 400 },
    );
  }

  const slot = {
    date: limpiarTexto(cuerpo.date, 10),
    time: limpiarTexto(cuerpo.time, 5),
  };
  const rechazo = validarVentana(slot);
  if (rechazo) {
    return NextResponse.json(
      { error: rechazo.mensaje, motivo: rechazo.motivo },
      { status: rechazo.codigo },
    );
  }

  const requestId = limpiarTexto(cuerpo.requestId, 64) || null;

  try {
    // 3. Idempotencia: si esta misma solicitud ya se registró, se devuelve el
    //    mismo resultado en vez de crear un turno duplicado.
    if (requestId) {
      const existente = await db
        .prepare("SELECT id, status FROM appointments WHERE request_id = ?1")
        .bind(requestId)
        .first<{ id: number; status: string }>();

      if (existente) {
        return NextResponse.json({
          ok: true,
          id: existente.id,
          estado: existente.status,
          repetida: true,
        });
      }
    }

    // 4. El horario tiene que estar en el catálogo y habilitado.
    const ofrecido = await db
      .prepare(
        "SELECT id FROM availability WHERE date = ?1 AND time = ?2 AND enabled = 1",
      )
      .bind(slot.date, slot.time)
      .first<{ id: number }>();

    if (!ofrecido) {
      return NextResponse.json(
        {
          error:
            "Ese horario no está disponible. Elegí uno de los que aparecen en el calendario.",
          motivo: "fuera_de_catalogo",
        },
        { status: 409 },
      );
    }

    // 5. La restricción única parcial de la base es la que resuelve la carrera:
    //    si dos personas piden el mismo horario a la vez, una de las dos
    //    inserciones falla y se responde 409.
    const ahora = ahoraISO();
    const insertado = await db
      .prepare(
        `INSERT INTO appointments
           (name, age, situation, date, time, status, internal_notes, request_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', '', ?6, ?7, ?7)
         RETURNING id`,
      )
      .bind(
        nombre.valor,
        edad.valor,
        situacion.valor,
        slot.date,
        slot.time,
        requestId,
        ahora,
      )
      .first<{ id: number }>();

    // Limpieza oportunista de contadores viejos; que falle no debe afectar al turno.
    void purgarVentanasViejas(
      db,
      Math.floor(Date.now() / 1000) - VENTANA_SEGUNDOS * 24,
    ).catch(() => {});

    return NextResponse.json(
      { ok: true, id: insertado?.id, estado: "pending" },
      { status: 201 },
    );
  } catch (fallo) {
    // Los mensajes de error de la base pueden incluir el contenido de la fila:
    // no se reenvían al cliente ni se registran con los datos de la persona.
    const mensaje = fallo instanceof Error ? fallo.message : "";

    if (/UNIQUE|constraint/i.test(mensaje)) {
      return NextResponse.json(
        {
          error: "Ese horario acaba de ocuparse. Elegí otro.",
          motivo: "ocupado",
        },
        { status: 409 },
      );
    }

    console.error("[turnos] fallo al registrar la solicitud");
    return NextResponse.json(
      { error: "No pudimos registrar la solicitud. Intentá nuevamente." },
      { status: 500 },
    );
  }
}
