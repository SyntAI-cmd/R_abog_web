import Link from "next/link";
import type { Metadata } from "next";

/**
 * Página 404 propia (I-SEO-01).
 *
 * Antes una dirección inexistente devolvía la pantalla genérica del framework,
 * sin salida ni contexto. Esta ofrece las cuatro rutas reales del sitio para que
 * nadie quede en un callejón sin salida.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La dirección que buscabas no existe o cambió.",
  robots: { index: false, follow: false },
};

const DESTINOS = [
  { href: "/", titulo: "Inicio", detalle: "Volver a la página principal." },
  {
    href: "/#areas",
    titulo: "Áreas de práctica",
    detalle: "Qué tipo de casos atiende el estudio.",
  },
  {
    href: "/#turnos",
    titulo: "Reservar un turno",
    detalle: "Solicitar una consulta.",
  },
  {
    href: "/privacidad",
    titulo: "Privacidad",
    detalle: "Qué datos recoge el sitio.",
  },
];

export default function NoEncontrada() {
  return (
    <main className="container section pagina-legal">
      <span className="eyebrow">Error 404</span>
      <h1 className="display section-title">Esta página no existe.</h1>
      <p className="lead">
        Puede que el enlace esté mal escrito o que la dirección haya cambiado.
        Desde acá llegás a cualquier sección del sitio.
      </p>

      <nav aria-label="Secciones principales">
        <ul className="lista-legal">
          {DESTINOS.map((destino) => (
            <li key={destino.href}>
              <Link href={destino.href}>
                <strong>{destino.titulo}</strong>
              </Link>{" "}
              — {destino.detalle}
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
