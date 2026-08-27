import { NextResponse } from "next/server";
import { exigirAdmin } from "../../../../lib/admin";
import { leerJSON, limpiarTexto } from "../../../../lib/validacion";
import { ahoraISO, getD1 } from "../../../../db";

/**
 * Moderación de opiniones.
 *
 * Los cuatro estados posibles son deliberados:
 *   pending    recién recibida, no se muestra
 *   approved   publicada tal como se escribió
 *   rejected   no se publica (spam, difamación, datos personales del caso)
 *   withdrawn  se publicó y quien la escribió pidió retirarla
 *
 * `withdrawn` existe porque el derecho a retirar una opinión ya publicada tiene
 * que poder ejercerse, y hacerlo borrando la fila destruiría el registro de que
 * hubo consentimiento.
 */
export const dynamic = "force-dynamic";

const ESTADOS = ["pending", "approved", "rejected", "withdrawn"];

export async function PATCH(request: Request) {
  const rechazo = await exigirAdmin();
  if (rechazo) return rechazo;

  const cuerpo = await leerJSON(request);
  if (!cuerpo)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const id = Number(cuerpo.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Identificador de opinión inválido." },
      { status: 400 },
    );
  }

  if (typeof cuerpo.status !== "string" || !ESTADOS.includes(cuerpo.status)) {
    return NextResponse.json(
      { error: "Estado no reconocido." },
      { status: 400 },
    );
  }

  const notas = limpiarTexto(cuerpo.moderationNotes, 500);

  const actualizado = await getD1()
    .prepare(
      `UPDATE reviews SET status = ?1, moderation_notes = ?2, updated_at = ?3
       WHERE id = ?4 RETURNING id, status, moderation_notes`,
    )
    .bind(cuerpo.status, notas, ahoraISO(), id)
    .first<{ id: number; status: string; moderation_notes: string }>();

  if (!actualizado)
    return NextResponse.json(
      { error: "No existe esa opinión." },
      { status: 404 },
    );
  return NextResponse.json({ item: actualizado });
}
