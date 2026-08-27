import { RUTAS_PUBLICAS, origen } from "../../lib/sitio";

/**
 * Sitemap.
 *
 * Sólo lista páginas públicas e indexables. `/admin` y las rutas de API quedan
 * fuera a propósito.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const base = origen();
  const hoy = new Date().toISOString().slice(0, 10);

  const urls = RUTAS_PUBLICAS.map(
    ({ ruta, prioridad }) =>
      `  <url>\n    <loc>${base}${ruta}</loc>\n    <lastmod>${hoy}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${prioridad.toFixed(1)}</priority>\n  </url>`,
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
