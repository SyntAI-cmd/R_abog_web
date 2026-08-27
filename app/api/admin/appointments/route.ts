import { NextResponse } from "next/server";
import { esEstado } from "../../../../lib/agenda";
import { exigirAdmin } from "../../../../lib/admin";
import { leerJSON, limpiarTexto } from "../../../../lib/validacion";
import { ahoraISO, getD1 } from "../../../../db";

/**
 * Gestión de turnos desde el panel.
 *
 * Cambiar el estado y anotar notas internas. Un turno cancelado libera su
 * horario automáticamente, porque el índice único de la base es parcial y sólo
 * cubre los estados que ocupan.
 */
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const rechazo = await exigirAdmin();
  if (rechazo) return rechazo;

  const cuerpo = await leerJSON(request);
  if (!cuerpo)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const id = Number(cuerpo.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Identificador de turno inválido." },
      { status: 400 },
    );
  }

  const db = getD1();
  const ahora = ahoraISO();

  if (cuerpo.status !== undefined) {
    if (!esEstado(cuerpo.status)) {
      return NextResponse.json(
        { error: "Estado no reconocido." },
        { status: 400 },
      );
    }

    try {
      const actualizado = await db
        .prepare(
          "UPDATE appointments SET status = ?1, updated_at = ?2 WHERE id = ?3 RETURNING id, status",
        )
        .bind(cuerpo.status, ahora, id)
        .first<{ id: number; status: string }>();

      if (!actualizado) {
        return NextResponse.json(
          { error: "No existe ese turno." },
          { status: 404 },
        );
      }
      return NextResponse.json({ item: actualizado });
    } catch (fallo) {
      // Reactivar un turno cancelado puede chocar con otro que ya tomó ese
      // horario. El índice único lo impide y hay que explicarlo, no tirar 500.
      const mensaje = fallo instanceof Error ? fallo.message : "";
      if (/UNIQUE|constraint/i.test(mensaje)) {
        return NextResponse.json(
          { error: "Ese horario ya está ocupado por otro turno activo." },
          { status: 409 },
        );
      }
      console.error("[admin/turnos] fallo al actualizar el estado");
      return NextResponse.json(
        { error: "No pudimos actualizar el turno." },
        { status: 500 },
      );
    }
  }

  if (cuerpo.internalNotes !== undefined) {
    const notas = limpiarTexto(cuerpo.internalNotes, 1500);
    const actualizado = await db
      .prepare(
        "UPDATE appointments SET internal_notes = ?1, updated_at = ?2 WHERE id = ?3 RETURNING id, internal_notes",
      )
      .bind(notas, ahora, id)
      .first<{ id: number; internal_notes: string }>();

    if (!actualizado)
      return NextResponse.json(
        { error: "No existe ese turno." },
        { status: 404 },
      );
    return NextResponse.json({ item: actualizado });
  }

  return NextResponse.json(
    { error: "No se indicó qué cambiar." },
    { status: 400 },
  );
}
