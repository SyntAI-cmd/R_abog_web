/**
 * Quién puede administrar el sitio.
 *
 * La versión anterior hacía:
 *
 *   process.env.ADMIN_EMAILS || "estudiojuridicofernandezrr@gmail.com"
 *
 * Es decir: si la variable faltaba o venía vacía —un despliegue nuevo, una
 * variable mal escrita, un entorno de staging sin configurar— el panel quedaba
 * abierto para una dirección fija escrita en el código. Una configuración
 * ausente **concedía** acceso. Eso es fallar abierto, y es lo contrario de lo
 * que tiene que hacer un control de acceso (I-SEC-02).
 *
 * Acá no hay valor por defecto. Sin `ADMIN_EMAILS`, nadie es administrador y el
 * panel responde 503: es un error de configuración, no una invitación.
 */

export type ResultadoAutorizacion =
  | { estado: "autorizado"; email: string }
  | { estado: "sin_sesion" }
  | { estado: "prohibido"; email: string }
  | { estado: "sin_configurar" };

/** Direcciones autorizadas, normalizadas. Lista vacía = sin configurar. */
export function emailsAutorizados(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

export const hayConfiguracionDeAdmin = (): boolean =>
  emailsAutorizados().length > 0;

/**
 * Decide si una sesión puede administrar.
 *
 * `usuario` es null cuando no hay sesión iniciada. Se distinguen los cuatro
 * casos porque cada uno merece una respuesta distinta: iniciar sesión (401),
 * cuenta no autorizada (403), o configuración faltante (503).
 */
export function autorizar(
  usuario: { email: string } | null,
): ResultadoAutorizacion {
  const autorizados = emailsAutorizados();
  if (autorizados.length === 0) return { estado: "sin_configurar" };
  if (!usuario) return { estado: "sin_sesion" };

  const email = usuario.email.trim().toLowerCase();
  return autorizados.includes(email)
    ? { estado: "autorizado", email }
    : { estado: "prohibido", email };
}

/** Código HTTP y mensaje para cada resultado. El mensaje no filtra la lista de autorizados. */
export function respuestaDeAutorizacion(resultado: ResultadoAutorizacion): {
  status: number;
  error: string;
} {
  switch (resultado.estado) {
    case "sin_configurar":
      return {
        status: 503,
        error: "La administración no está configurada en este entorno.",
      };
    case "sin_sesion":
      return { status: 401, error: "Iniciá sesión para continuar." };
    case "prohibido":
      return {
        status: 403,
        error: "Esta cuenta no está autorizada para administrar el sitio.",
      };
    case "autorizado":
      return { status: 200, error: "" };
  }
}
