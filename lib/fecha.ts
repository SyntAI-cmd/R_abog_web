/**
 * Fechas civiles argentinas.
 *
 * Un turno no es un instante: es una fecha y una hora del calendario de
 * Mendoza. «El martes 9 a las 10:00» significa lo mismo para el estudio esté
 * donde esté el servidor. Por eso las fechas se guardan y se comparan como
 * texto `AAAA-MM-DD` y `HH:MM`, y sólo se convierten a un instante real cuando
 * hace falta compararlas con «ahora».
 *
 * El error que esto reemplaza (I-FUNC-03) era `new Date().toISOString().slice(0,10)`.
 * `toISOString()` devuelve **UTC**. En Argentina (UTC-3) eso significa que a
 * partir de las 21:00 hora local el «hoy» calculado ya es el día siguiente:
 * entre las 21:00 y la medianoche, el turnero ofrecía y aceptaba un día
 * equivocado. No es un caso de borde raro — es todas las noches.
 */

export const ZONA = "America/Argentina/Buenos_Aires";

/** `AAAA-MM-DD`. */
export type FechaCivil = string;
/** `HH:MM` en 24 horas. */
export type HoraCivil = string;

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const esFechaCivil = (valor: unknown): valor is FechaCivil =>
  typeof valor === "string" &&
  RE_FECHA.test(valor) &&
  !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));

export const esHoraCivil = (valor: unknown): valor is HoraCivil =>
  typeof valor === "string" && RE_HORA.test(valor);

const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * La fecha civil argentina correspondiente a un instante.
 *
 * Usa `Intl` con la zona explícita en lugar de aritmética manual de offsets:
 * es la base de datos de zonas horarias del runtime la que decide, no una
 * constante que puede quedar vieja.
 */
export function fechaCivilDe(instante: Date = new Date()): FechaCivil {
  // "en-CA" formatea como AAAA-MM-DD, que es justo lo que necesitamos.
  return formateador.format(instante);
}

/** El desplazamiento de la zona respecto de UTC, en minutos, para un instante dado. */
function offsetEnMinutos(instante: Date): number {
  // Se formatea el mismo instante como si fuera UTC y como si fuera local a la
  // zona; la diferencia entre ambas lecturas es el offset. Sirve para cualquier
  // zona y sigue siendo correcto si las reglas cambian.
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);

  const leer = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? "0");
  const comoUTC = Date.UTC(
    leer("year"),
    leer("month") - 1,
    leer("day"),
    leer("hour") % 24,
    leer("minute"),
    leer("second"),
  );

  return (comoUTC - instante.getTime()) / 60000;
}

/**
 * El instante real en el que ocurre una fecha y hora civiles argentinas.
 *
 * Argentina no aplica horario de verano desde 2009, pero el offset se calcula
 * igual en vez de escribir `-03:00` a mano: si la regla cambiara, esto sigue
 * siendo correcto sin tocar el código.
 */
export function instanteDe(fecha: FechaCivil, hora: HoraCivil): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);

  // Primera aproximación tratando la hora civil como si fuera UTC; con ella se
  // averigua el offset vigente en esa fecha y se corrige.
  const aproximado = new Date(Date.UTC(a, m - 1, d, h, min, 0));
  const offset = offsetEnMinutos(aproximado);
  return new Date(aproximado.getTime() - offset * 60000);
}

/** Suma días a una fecha civil sin pasar por instantes ni zonas. */
export function sumarDias(fecha: FechaCivil, dias: number): FechaCivil {
  const [a, m, d] = fecha.split("-").map(Number);
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Días entre dos fechas civiles (`hasta - desde`). */
export function diasEntre(desde: FechaCivil, hasta: FechaCivil): number {
  const [a1, m1, d1] = desde.split("-").map(Number);
  const [a2, m2, d2] = hasta.split("-").map(Number);
  return Math.round(
    (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000,
  );
}

/** 0 = domingo … 6 = sábado, según el calendario civil (no según la zona del servidor). */
export function diaDeLaSemana(fecha: FechaCivil): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

const nombreDeDia = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  weekday: "short",
});
const nombreDeMes = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  month: "short",
});
const fechaLegible = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Partes de una fecha civil para mostrar en la interfaz. */
export function partesParaMostrar(fecha: FechaCivil): {
  dia: string;
  numero: number;
  mes: string;
  completa: string;
} {
  const [a, m, d] = fecha.split("-").map(Number);
  // Se construye en UTC y se formatea en UTC: así el texto describe exactamente
  // la fecha civil recibida, sin que la zona del navegador la corra un día.
  const referencia = new Date(Date.UTC(a, m - 1, d, 12));
  return {
    dia: nombreDeDia.format(referencia).replace(".", ""),
    numero: d,
    mes: nombreDeMes.format(referencia).replace(".", ""),
    completa: fechaLegible.format(referencia),
  };
}
