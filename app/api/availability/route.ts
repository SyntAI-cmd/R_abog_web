import { NextResponse } from "next/server";
import {
  agruparPorFecha,
  slotsDisponibles,
  type Slot,
} from "../../../lib/agenda";
import { getD1, hayBase } from "../../../db";

/**
 * Horarios que el estudio ofrece y todavía están libres.
 *
 * Es la única fuente de la que se alimenta el turnero de la página. Antes el
 * cliente traía una grilla fija escrita en el código —`["09:00","10:00","11:30",
 * "15:00","16:30"]` para cualquier día hábil— y ofrecía horarios que nadie había
 * habilitado (I-FUNC-02).
 *
 * Si no hay horarios cargados, esto devuelve una lista vacía y la interfaz dice
 * que no hay turnos disponibles. Es la respuesta honesta: inventar una grilla
 * sería prometer una disponibilidad que no existe.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hayBase()) {
    // Sin base no se puede saber qué hay disponible. Se responde vacío con una
    // marca explícita para que la interfaz distinga «no hay turnos» de «no se
    // pudo consultar», en vez de mostrar lo mismo en los dos casos.
    return NextResponse.json(
      { slots: [], dias: [], disponible: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const db = getD1();

    const [catalogo, ocupados] = await Promise.all([
      db
        .prepare(
          "SELECT date, time FROM availability WHERE enabled = 1 ORDER BY date, time",
        )
        .all<Slot>(),
      db
        .prepare(
          `SELECT date, time FROM appointments
           WHERE status IN ('pending', 'confirmed', 'rescheduled')`,
        )
        .all<Slot>(),
    ]);

    const libres = slotsDisponibles(
      catalogo.results ?? [],
      ocupados.results ?? [],
    );

    return NextResponse.json(
      { slots: libres, dias: agruparPorFecha(libres), disponible: true },
      {
        // Sin caché: un horario puede ocuparse en cualquier momento y mostrar
        // uno tomado lleva directo a un 409 al reservar.
        headers: { "cache-control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { slots: [], dias: [], disponible: false },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
