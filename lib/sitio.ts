/**
 * Identidad y origen del sitio.
 *
 * `SITE_URL` permite construir para una preview sin que el canonical, el
 * sitemap y el JSON-LD apunten al dominio de producción. Si no está definida se
 * usa el dominio real, y `esProduccion` decide si el sitio se deja indexar: así
 * una preview no puede terminar en un buscador por olvidarse de editar un
 * archivo aparte.
 */
export const ORIGEN_PRODUCCION = "https://impactoestudiojuridico.com.ar";

export const origen = (): string =>
  process.env.SITE_URL?.replace(/\/$/, "") || ORIGEN_PRODUCCION;

export const esProduccion = (): boolean => origen() === ORIGEN_PRODUCCION;

/** Rutas públicas del sitio, con su prioridad para el sitemap. */
export const RUTAS_PUBLICAS = [
  { ruta: "/", prioridad: 1.0 },
  { ruta: "/privacidad", prioridad: 0.4 },
] as const;

/**
 * Datos del estudio para Schema.org.
 *
 * Sólo se declara lo verificable desde el propio sitio: nombre, área servida,
 * teléfonos y correo que ya figuran en el pie. No se declaran calificación
 * agregada, cantidad de reseñas, premios ni fecha de fundación: nada de eso
 * está confirmado, y un dato inventado en datos estructurados es exactamente el
 * tipo de afirmación que un buscador puede mostrar como si fuera un hecho.
 */
export function schemaDelEstudio() {
  const base = origen();
  return {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${base}/#estudio`,
    name: "IMPACTO Estudio Jurídico",
    description:
      "Estudio jurídico en Mendoza especializado en accidentes de tránsito, accidentes laborales (ART) y derecho laboral.",
    url: base,
    email: "estudiojuridicofernandezrr@gmail.com",
    telephone: ["+54 263 421 0691", "+54 263 475 9950"],
    areaServed: { "@type": "State", name: "Mendoza, Argentina" },
    inLanguage: "es-AR",
    knowsAbout: [
      "Accidentes de tránsito",
      "Accidentes laborales y ART",
      "Derecho laboral",
    ],
  };
}
