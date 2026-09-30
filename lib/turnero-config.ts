export type ProveedorTurnos = "local" | "cal" | "pausado";

export function resolverTurnero(proveedor: string | undefined, enlace: string | undefined) {
  const ruta = (enlace || "").trim().replace(/^https?:\/\/(www\.)?cal\.com\//, "").replace(/^\/+|\/+$/g, "");
  const valida = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(ruta) && !/usuario|evento|example|ejemplo/i.test(ruta);
  const activo: ProveedorTurnos = proveedor === "cal" && valida ? "cal" : proveedor === "local" ? "local" : "pausado";
  return { proveedor: activo, ruta: valida ? ruta : "" };
}

const resuelto = resolverTurnero(process.env.NEXT_PUBLIC_TURNERO_PROVIDER, process.env.NEXT_PUBLIC_CAL_LINK);

export const CAL_NAMESPACE = "consulta-juridica";
export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
export const CAL_LINK = resuelto.ruta;
export const CAL_URL = CAL_LINK ? `https://cal.com/${CAL_LINK}` : "";
export const PROVEEDOR_TURNOS: ProveedorTurnos = resuelto.proveedor;
export const CAL_PANEL_URL = "https://app.cal.com/event-types";

export const agendaLocalActiva = () => PROVEEDOR_TURNOS === "local";
