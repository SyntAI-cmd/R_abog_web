import { NextResponse } from "next/server";
import { exigirAdmin } from "../../../../lib/admin";
import { esFechaCivil, esHoraCivil } from "../../../../lib/fecha";
import { leerJSON, limpiarTexto } from "../../../../lib/validacion";
import { ahoraISO, getD1 } from "../../../../db";
import { agendaLocalActiva } from "../../../../lib/turnero-config";

/**
 * Carga y baja de horarios ofrecidos.
 *
 * Acá cambió la semántica respecto de la versión anterior, y el cambio es el
 * corazón de la corrección (I-FUNC-02).
 *
 * Antes, la tabla `availability` guardaba **bloqueos**: una fila con
 * `enabled = 0` significaba «este horario no». Todo lo demás se consideraba
 * disponible, lo que quiere decir que la agenda estaba implícitamente abierta
 * las 24 horas de todos los días y había que ir tapando agujeros.
 *
 * Ahora la tabla es el **catálogo**: una fila con `enabled = 1` es un turno que
 * el estudio ofrece, y no existe nada fuera de esa lista. Tabla vacía significa
 * «sin turnos disponibles». Es lo que permite afirmar que el servidor no puede
 * aceptar un horario que nadie habilitó.
 *
 * Los feriados y las licencias no necesitan un modelo aparte: son días para los
 * que sencillamente no se cargan horarios, o cuyos horarios se deshabilitan.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const rechazo = await exigirAdmin();
  if (rechazo) return rechazo;

  const filas = await getD1()
    .prepare(
      `SELECT a.id, a.date, a.time, a.enabled, a.note,
              (SELECT COUNT(*) FROM appointments t
               WHERE t.date = a.date AND t.time = a.time
                 AND t.status IN ('pending','confirmed','rescheduled')) AS ocupado
       FROM availability a
       ORDER BY a.date, a.time`,
    )
    .all();

  return NextResponse.json(
    { items: filas.results ?? [] },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Alta o rehabilitación de un horario. */
export async function POST(request: Request) {
  const rechazo = await exigirAdmin();
  if (rechazo) return rechazo;
  if (!agendaLocalActiva()) return NextResponse.json({ error: "La disponibilidad vigente se administra en Cal.com." }, { status: 409 });

  const cuerpo = await leerJSON(request);
  if (!cuerpo)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const date = limpiarTexto(cuerpo.date, 10);
  const time = limpiarTexto(cuerpo.time, 5);

  if (!esFechaCivil(date) || !esHoraCivil(time)) {
    return NextResponse.json(
      { error: "Usá el formato AAAA-MM-DD y HH:MM." },
      { status: 400 },
    );
  }

  const item = await getD1()
    .prepare(
      `INSERT INTO availability (date, time, enabled, note, created_at)
       VALUES (?1, ?2, 1, '', ?3)
       ON CONFLICT(date, time) DO UPDATE SET enabled = 1, note = ''
       RETURNING id, date, time, enabled, note`,
    )
    .bind(date, time, ahoraISO())
    .first();

  return NextResponse.json({ item }, { status: 201 });
}

/**
 * Baja de un horario.
 *
 * Se deshabilita en lugar de borrarse: así queda constancia de que existió, y
 * un horario que ya tiene un turno tomado no puede desaparecer del historial.
 * Si hay un turno activo se avisa, pero no se cancela solo: cancelar un turno
 * reservado por alguien es una decisión que tiene que tomar una persona.
 */
export async function DELETE(request: Request) {
  const rechazo = await exigirAdmin();
  if (rechazo) return rechazo;
  if (!agendaLocalActiva()) return NextResponse.json({ error: "La disponibilidad vigente se administra en Cal.com." }, { status: 409 });

  const cuerpo = await leerJSON(request);
  if (!cuerpo)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const id = Number(cuerpo.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Identificador inválido." },
      { status: 400 },
    );
  }

  const db = getD1();
  const nota = limpiarTexto(cuerpo.note, 200);

  const item = await db
    .prepare(
      "UPDATE availability SET enabled = 0, note = ?1 WHERE id = ?2 RETURNING id, date, time, enabled, note",
    )
    .bind(nota, id)
    .first<{ id: number; date: string; time: string }>();

  if (!item)
    return NextResponse.json(
      { error: "No existe ese horario." },
      { status: 404 },
    );

  const ocupado = await db
    .prepare(
      `SELECT id FROM appointments
       WHERE date = ?1 AND time = ?2 AND status IN ('pending','confirmed','rescheduled')`,
    )
    .bind(item.date, item.time)
    .first<{ id: number }>();

  return NextResponse.json({
    item,
    aviso: ocupado
      ? "Este horario tiene un turno activo. Dejó de ofrecerse, pero el turno sigue en pie: cancelalo desde la lista de turnos si corresponde."
      : null,
  });
}
