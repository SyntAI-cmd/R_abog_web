import { Navegacion } from "./components/Navegacion";
import { Opiniones } from "./components/Opiniones";
import { Turnero } from "./components/Turnero";
import { Preguntas } from "./components/Preguntas";
import {
  Areas,
  Diferencia,
  Estudio,
  Hero,
  LlamadoFinal,
  Metodo,
  PieDePagina,
} from "./components/Secciones";
import { whatsapp } from "../lib/contacto";

/**
 * Composición de la página principal.
 *
 * Antes esto era un solo archivo de 50 líneas físicas con líneas de más de
 * 3.000 caracteres, donde convivían todas las secciones, el turnero, las
 * reseñas, el modal y el pie (I-TECH-03). Ahora cada parte vive en su archivo,
 * se puede leer sin desplazamiento horizontal y se puede probar por separado.
 *
 * Sólo son componentes de cliente los tres que necesitan interacción:
 * navegación, opiniones y turnero. El resto se renderiza en el servidor y no
 * viaja como JavaScript.
 */
export function ImpactoSite() {
  return (
    <>
      {/* Primer elemento enfocable de la página: quien navega con teclado o
          lector de pantalla puede saltarse la navegación en lugar de recorrerla
          en cada carga. */}
      <a className="saltar-al-contenido" href="#inicio">
        Ir al contenido principal
      </a>

      <Navegacion />

      <main>
        <Hero />
        <Estudio />
        <Areas />
        <Metodo />
        <Diferencia />
        <Opiniones />
        <Turnero />
        <Preguntas />
        <LlamadoFinal />
      </main>

      <PieDePagina />

      <a
        className="whatsapp"
        aria-label="Contactar por WhatsApp"
        target="_blank"
        rel="noreferrer noopener"
        href={whatsapp(
          "Hola, quiero realizar una consulta con IMPACTO Estudio Jurídico.",
        )}
      >
        <span aria-hidden="true">WA</span>
      </a>
    </>
  );
}
