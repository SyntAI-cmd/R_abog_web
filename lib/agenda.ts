/**
 * Reglas de la agenda.
 *
 * El servidor es la única autoridad sobre la disponibilidad. La interfaz sólo
 * muestra lo que esta capa le dice, y cualquier reserva vuelve a pasar por acá
 * antes de escribirse: manipular el cuerpo de la petición no alcanza para
 * reservar un horario que no existe, que está ocupado o que cae fuera de la
 * ventana de anticipación.
 *
 * No hay horarios por defecto. Un catálogo vacío significa «sin turnos
 * disponibles», no «cualquier horario sirve». Inventar una grilla de atención
 * que nadie confirmó sería exactamente el problema que esto viene a resolver.
 */
import {
  diasEntre,
  esFechaCivil,
  esHoraCivil,
  fechaCivilDe,
  instanteDe,
  type FechaCivil,
  type HoraCivil,
} from "./fecha.ts";

/**
 * Anticipación mínima: no se puede reservar un turno que empieza dentro de las
 * próximas 2 horas, porque nadie del estudio llegaría a verlo.
 */
export const ANTICIPACION_MINIMA_MINUTOS = 120;

/** Anticipación máxima: no se abre la agenda más allá de 90 días. */
export const ANTICIPACION_MAXIMA_DIAS = 90;

/** Estados en los que un turno sigue ocupando su horario. */
export const ESTADOS_QUE_OCUPAN = [
  "pending",
  "confirmed",
  "rescheduled",
] as const;

/** Todos los estados posibles de un turno. */
export const ESTADOS = [
  ...ESTADOS_QUE_OCUPAN,
  "cancelled",
  "completed",
  "no_show",
] as const;

export type EstadoTurno = (typeof ESTADOS)[number];

export const esEstado = (valor: unknown): valor is EstadoTurno =>
  typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor);

export type Slot = { date: FechaCivil; time: HoraCivil };

/** Motivos por los que un horario puede rechazarse, con su código HTTP. */
export type MotivoRechazo =
  | { codigo: 400; motivo: "formato"; mensaje: string }
  | { codigo: 400; motivo: "pasado"; mensaje: string }
  | { codigo: 400; motivo: "muy_pronto"; mensaje: string }
  | { codigo: 400; motivo: "muy_lejos"; mensaje: string }
  | { codigo: 409; motivo: "fuera_de_catalogo"; mensaje: string }
  | { codigo: 409; motivo: "ocupado"; mensaje: string };

/**
 * Comprueba lo que se puede comprobar sin tocar la base: formato y ventana
 * temporal. Devuelve `null` si el horario es admisible hasta acá.
 *
 * Se separa de la comprobación contra el catálogo para poder probarla sin base
 * de datos y para no gastar una consulta cuando el dato ya viene mal.
 */
export function validarVentana(
  slot: Slot,
  ahora: Date = new Date(),
): MotivoRechazo | null {
  if (!esFechaCivil(slot.date) || !esHoraCivil(slot.time)) {
    return {
      codigo: 400,
      motivo: "formato",
      mensaje: "La fecha o la hora no tienen un formato válido.",
    };
  }

  const inicio = instanteDe(slot.date, slot.time);
  const minutosDeAnticipacion = (inicio.getTime() - ahora.getTime()) / 60000;

  if (minutosDeAnticipacion < 0) {
    return {
      codigo: 400,
      motivo: "pasado",
      mensaje: "Ese horario ya pasó. Elegí otro.",
    };
  }

  if (minutosDeAnticipacion < ANTICIPACION_MINIMA_MINUTOS) {
    return {
      codigo: 400,
      motivo: "muy_pronto",
      mensaje:
        "Ese horario está demasiado próximo. Elegí uno con más anticipación.",
    };
  }

  if (diasEntre(fechaCivilDe(ahora), slot.date) > ANTICIPACION_MAXIMA_DIAS) {
    return {
      codigo: 400,
      motivo: "muy_lejos",
      mensaje: "Todavía no se puede reservar tan adelante en el calendario.",
    };
  }

  return null;
}

/**
 * Decide qué horarios del catálogo se pueden ofrecer.
 *
 * `catalogo` son las filas habilitadas que cargó administración; `ocupados` son
 * los turnos que ya están tomados. La misma función alimenta la interfaz y se
 * usa para validar del lado del servidor, así que no hay forma de que muestren
 * cosas distintas.
 */
export function slotsDisponibles(
  catalogo: readonly Slot[],
  ocupados: readonly Slot[],
  ahora: Date = new Date(),
): Slot[] {
  const tomados = new Set(ocupados.map((s) => `${s.date} ${s.time}`));

  return catalogo
    .filter((slot) => !tomados.has(`${slot.date} ${slot.time}`))
    .filter((slot) => validarVentana(slot, ahora) === null)
    .sort((a, b) =>
      a.date === b.date
        ? a.time.localeCompare(b.time)
        : a.date.localeCompare(b.date),
    );
}

/** Agrupa los horarios por fecha, preservando el orden. */
export function agruparPorFecha(
  slots: readonly Slot[],
): { date: FechaCivil; horas: HoraCivil[] }[] {
  const porFecha = new Map<FechaCivil, HoraCivil[]>();
  for (const slot of slots) {
    const horas = porFecha.get(slot.date);
    if (horas) horas.push(slot.time);
    else porFecha.set(slot.date, [slot.time]);
  }
  return [...porFecha.entries()].map(([date, horas]) => ({
    date,
    horas: horas.sort(),
  }));
}
