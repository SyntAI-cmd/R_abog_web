"use client";

import { useId, useState } from "react";

const PREGUNTAS = [
  [
    "¿Qué tipo de casos atiende el estudio?",
    "Trabajamos principalmente en accidentes de tránsito, accidentes laborales y reclamos ante ART, y conflictos de derecho laboral.",
  ],
  [
    "¿Cómo solicito una consulta?",
    "Podés elegir uno de los horarios disponibles en el turnero. La solicitud queda pendiente hasta que el estudio la confirme.",
  ],
  [
    "¿Puedo consultar por WhatsApp?",
    "Sí. El botón de WhatsApp abre un mensaje directo para que nos cuentes brevemente tu situación.",
  ],
  [
    "¿Qué necesito para la primera consulta?",
    "Traé o tené a mano toda la documentación vinculada con el hecho. Si todavía no la reuniste, te indicaremos por dónde empezar.",
  ],
  [
    "¿Atienden en toda Mendoza?",
    "Sí. El estudio se encuentra en Mendoza y evalúa consultas de distintos puntos de la provincia.",
  ],
] as const;

/**
 * Preguntas frecuentes.
 *
 * Acordeón con botones reales: cada uno declara `aria-expanded` y `aria-controls`,
 * y el panel se oculta con `hidden` en lugar de desmontarse, para que la relación
 * entre control y contenido no desaparezca del árbol de accesibilidad.
 */
export function Preguntas() {
  const [abierta, setAbierta] = useState<number>(0);
  const idBase = useId();

  return (
    <section className="section" id="faq" aria-labelledby="h-faq">
      <div className="container faq-grid">
        <div>
          <span className="eyebrow">Preguntas frecuentes</span>
          <h2 id="h-faq" className="display section-title">
            Antes de dar el primer paso.
          </h2>
        </div>
        <div>
          {PREGUNTAS.map(([pregunta, respuesta], indice) => {
            const panelId = `${idBase}-panel-${indice}`;
            const botonId = `${idBase}-boton-${indice}`;
            const expandida = abierta === indice;
            return (
              <div className="faq-item" key={pregunta}>
                <h3>
                  <button
                    id={botonId}
                    type="button"
                    aria-expanded={expandida}
                    aria-controls={panelId}
                    onClick={() => setAbierta(expandida ? -1 : indice)}
                  >
                    <b>{pregunta}</b>
                    <span aria-hidden="true">{expandida ? "−" : "+"}</span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={botonId}
                  hidden={!expandida}
                >
                  <p>{respuesta}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

