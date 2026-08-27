import { NextResponse } from "next/server";
import { consumirIntento, identificarOrigen } from "../../../lib/limite";
import {
  leerJSON,
  pareceBot,
  validarCalificacion,
  validarNombrePublico,
  validarOpinion,
} from "../../../lib/validacion";
import { ahoraISO, getD1, hayBase } from "../../../db";

/**
 * Opiniones del público.
 *
 * GET devuelve **sólo** las aprobadas, con su calificación real. Si no hay
 * ninguna, devuelve una lista vacía: la interfaz muestra un estado vacío honesto
 * en lugar de rellenar con testimonios escritos en el código (I-CONT-01).
 *
 * POST las recibe en estado `pending`. Nada se publica solo.
 */
export const dynamic = "force-dynamic";

/** 3 opiniones por día y por origen. Nadie legítimo escribe más que eso. */
const MAXIMO_POR_VENTANA = 3;
const VENTANA_SEGUNDOS = 86400;

export async function GET() {
  if (!hayBase()) {
    return NextResponse.json(
      { reviews: [], disponible: false },
      { headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const filas = await getD1()
      .prepare(
        `SELECT id, display_name, rating, content, created_at
         FROM reviews
         WHERE status = 'approved'
         ORDER BY created_at DESC
         LIMIT 12`,
      )
      .all<{
        id: number;
        display_name: string;
        rating: number;
        content: string;
        created_at: string;
      }>();

    return NextResponse.json(
      { reviews: filas.results ?? [], disponible: true },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { reviews: [], disponible: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  if (!hayBase()) {
    return NextResponse.json(
      { error: "No podemos recibir opiniones en este momento." },
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

  if (pareceBot(cuerpo.website)) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const db = getD1();

  let veredicto;
  try {
    veredicto = await consumirIntento(
      db,
      `resenias:${identificarOrigen(request)}`,
      MAXIMO_POR_VENTANA,
      VENTANA_SEGUNDOS,
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos procesar la opinión." },
      { status: 503 },
    );
  }

  if (!veredicto.permitido) {
    return NextResponse.json(
      {
        error:
          "Ya recibimos varias opiniones desde esta conexión. Probá más tarde.",
      },
      {
        status: 429,
        headers: { "retry-after": String(veredicto.reintentarEnSegundos) },
      },
    );
  }

  const nombre = validarNombrePublico(cuerpo.displayName);
  if (!nombre.ok) {
    return NextResponse.json(
      { error: nombre.error, campo: "displayName" },
      { status: 400 },
    );
  }

  const calificacion = validarCalificacion(cuerpo.rating);
  if (!calificacion.ok) {
    return NextResponse.json(
      { error: calificacion.error, campo: "rating" },
      { status: 400 },
    );
  }

  const opinion = validarOpinion(cuerpo.content);
  if (!opinion.ok) {
    return NextResponse.json(
      { error: opinion.error, campo: "content" },
      { status: 400 },
    );
  }

  // El consentimiento es una casilla explícita del formulario. Sin él no se
  // guarda: publicar el texto de otra persona sin su acuerdo no tiene respaldo.
  if (cuerpo.consent !== true) {
    return NextResponse.json(
      {
        error: "Necesitamos tu autorización para publicar la opinión.",
        campo: "consent",
      },
      { status: 400 },
    );
  }

  try {
    const ahora = ahoraISO();
    await db
      .prepare(
        `INSERT INTO reviews
           (display_name, rating, content, status, consent_at, moderation_notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'pending', ?4, '', ?4, ?4)`,
      )
      .bind(nombre.valor, calificacion.valor, opinion.valor, ahora)
      .run();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    console.error("[resenias] fallo al registrar la opinion");
    return NextResponse.json(
      { error: "No pudimos recibir la opinión." },
      { status: 500 },
    );
  }
}
