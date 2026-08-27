import { esProduccion, origen } from "../../lib/sitio";

/**
 * robots.txt.
 *
 * Se genera a partir del origen del build. Una preview (`SITE_URL` distinta del
 * dominio real) bloquea todo el rastreo; sólo producción se deja indexar.
 *
 * `/admin` y `/api` se excluyen siempre: no aportan nada a un buscador y no
 * tiene sentido que aparezcan en resultados.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const base = origen();

  const cuerpo = esProduccion()
    ? [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /api/",
        "",
        `Sitemap: ${base}/sitemap.xml`,
        "",
      ].join("\n")
    : [
        "# Entorno que no es produccion: no debe indexarse.",
        "User-agent: *",
        "Disallow: /",
        "",
      ].join("\n");

  return new Response(cuerpo, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
