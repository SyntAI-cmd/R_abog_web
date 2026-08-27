"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Dialogo } from "./Dialogo";

/**
 * Opiniones de clientes.
 *
 * Tres cosas cambiaron acá, y las tres eran problemas de honestidad, no de
 * código:
 *
 * 1. **No hay testimonios de respaldo** (I-CONT-01). Si la API no devuelve
 *    opiniones aprobadas, antes se mostraban cuatro escritas en el código, sin
 *    ninguna evidencia de que existieran esas personas ni de que hubieran dado
 *    su acuerdo. Ahora, sin opiniones reales, se dice que todavía no hay.
 *
 * 2. **La calificación que se muestra es la que se recibió** (I-FUNC-01). Antes
 *    se imprimía `★★★★★` fijo para todas, sin mirar el valor guardado, y el
 *    formulario sólo ofrecía 3, 4 y 5 estrellas. Eso no es moderar: es sesgar la
 *    recolección para que el promedio salga bien. La escala completa es 1 a 5.
 *
 * 3. **El carrusel no repite el texto para los lectores de pantalla**
 *    (I-A11Y-04). La animación necesita el contenido duplicado; la copia va
 *    `aria-hidden`, y se puede pausar con un botón real, no sólo pasando el
 *    mouse por encima.
 */

type Opinion = {
  id: number;
  display_name: string;
  rating: number;
  content: string;
};

type Estado =
  | { fase: "cargando" }
  | { fase: "listo"; opiniones: Opinion[] }
  | { fase: "sin_servicio" };

type Envio =
  | { fase: "inactivo" }
  | { fase: "enviando" }
  | { fase: "ok"; mensaje: string }
  | { fase: "error"; mensaje: string };

function Estrellas({ puntaje }: { puntaje: number }) {
  const enteras = Math.max(0, Math.min(5, Math.round(puntaje)));
  return (
    <span className="stars">
      {/* El dibujo es decorativo; el dato lo lleva el texto para lectores. */}
      <span aria-hidden="true">
        {"★".repeat(enteras)}
        {"☆".repeat(5 - enteras)}
      </span>
      <span className="sr-only">{enteras} de 5 estrellas</span>
    </span>
  );
}

export function Opiniones() {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const [abierto, setAbierto] = useState(false);
  const [envio, setEnvio] = useState<Envio>({ fase: "inactivo" });
  const [pausada, setPausada] = useState(false);
  const idBase = useId();
  const tituloId = `${idBase}-titulo`;

  useEffect(() => {
    let vigente = true;
    fetch("/api/reviews", { cache: "no-store" })
      .then(
        (r) =>
          r.json() as Promise<{ reviews?: Opinion[]; disponible?: boolean }>,
      )
      .then((datos) => {
        if (!vigente) return;
        if (datos.disponible === false) {
          setEstado({ fase: "sin_servicio" });
          return;
        }
        setEstado({ fase: "listo", opiniones: datos.reviews ?? [] });
      })
      .catch(() => vigente && setEstado({ fase: "sin_servicio" }));
    return () => {
      vigente = false;
    };
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    setEnvio({ fase: "enviando" });

    try {
      const respuesta = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: datos.get("displayName"),
          rating: Number(datos.get("rating")),
          content: datos.get("content"),
          consent: datos.get("consent") === "on",
          website: datos.get("website"),
        }),
      });

      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!respuesta.ok) {
        setEnvio({
          fase: "error",
          mensaje: cuerpo.error ?? "No pudimos enviar la opinión.",
        });
        return;
      }

      setEnvio({
        fase: "ok",
        mensaje:
          "Gracias. La opinión queda pendiente de revisión: se publica sólo si no expone datos del caso ni de terceros.",
      });
      formulario.reset();
    } catch {
      setEnvio({
        fase: "error",
        mensaje: "No hubo conexión con el servidor. La opinión no se envió.",
      });
    }
  }

  const opiniones = estado.fase === "listo" ? estado.opiniones : [];
  const hayOpiniones = opiniones.length > 0;

  return (
    <section className="section reviews" aria-labelledby="h-opiniones">
      <div className="container">
        <span className="eyebrow">Experiencias</span>
        <h2 id="h-opiniones" className="display section-title">
          La confianza de quienes
          <br />
          acompañamos.
        </h2>
      </div>

      {hayOpiniones ? (
        <>
          <div className="container marquee-controles">
            <button
              type="button"
              className="link-btn"
              onClick={() => setPausada((p) => !p)}
              aria-pressed={pausada}
            >
              {pausada
                ? "Reanudar el desplazamiento"
                : "Pausar el desplazamiento"}
            </button>
          </div>

          <div className={`marquee ${pausada ? "marquee--pausada" : ""}`}>
            {/* Lista real: es la que leen los lectores de pantalla. */}
            <ul className="marquee-pista">
              {opiniones.map((opinion) => (
                <li className="review" key={opinion.id}>
                  <Estrellas puntaje={opinion.rating} />
                  <p>“{opinion.content}”</p>
                  <p className="review-firma">
                    <span>{opinion.display_name}</span>
                    <span>Opinión verificada por el estudio</span>
                  </p>
                </li>
              ))}
            </ul>

            {/* Copia sólo para que la animación no deje un hueco al reiniciar.
                Va aria-hidden para que no se lea dos veces. */}
            <ul className="marquee-pista" aria-hidden="true">
              {opiniones.map((opinion) => (
                <li className="review" key={`copia-${opinion.id}`}>
                  <Estrellas puntaje={opinion.rating} />
                  <p>“{opinion.content}”</p>
                  <p className="review-firma">
                    <span>{opinion.display_name}</span>
                    <span>Opinión verificada por el estudio</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="container">
          <div className="review-vacio">
            <p className="lead">
              {estado.fase === "cargando"
                ? "Cargando opiniones…"
                : "Todavía no publicamos opiniones. Cuando haya experiencias compartidas y revisadas, van a aparecer acá."}
            </p>
          </div>
        </div>
      )}

      <div className="container review-form">
        <button className="link-btn" onClick={() => setAbierto(true)}>
          Compartir mi experiencia →
        </button>
        <p className="lead" style={{ fontSize: ".72rem" }}>
          Todas las opiniones se revisan antes de publicarse. Se rechazan las
          que exponen datos del caso o de terceros. Podés pedir que retiremos la
          tuya en cualquier momento escribiendo al estudio.
        </p>
      </div>

      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulaId={tituloId}
      >
        <form onSubmit={enviar}>
          <button
            type="button"
            className="modal-close"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar"
          >
            ×
          </button>

          <span className="eyebrow">Tu opinión</span>
          <h2 id={tituloId} className="display" style={{ fontSize: "2.4rem" }}>
            Contanos cómo fue tu experiencia.
          </h2>

          <div className="honeypot" aria-hidden="true">
            <label htmlFor={`${idBase}-web`}>No completes este campo</label>
            <input
              id={`${idBase}-web`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="fields">
            <div className="field">
              <label htmlFor={`${idBase}-nombre`}>Nombre o iniciales</label>
              <input
                id={`${idBase}-nombre`}
                name="displayName"
                required
                maxLength={50}
              />
            </div>

            <div className="field">
              <label htmlFor={`${idBase}-rating`}>Calificación</label>
              <select id={`${idBase}-rating`} name="rating" defaultValue="5">
                {/* La escala completa, incluidas 1 y 2. Ofrecer sólo 3, 4 y 5
                    sesgaría la recolección. */}
                <option value="5">5 — Muy buena</option>
                <option value="4">4 — Buena</option>
                <option value="3">3 — Regular</option>
                <option value="2">2 — Mala</option>
                <option value="1">1 — Muy mala</option>
              </select>
            </div>

            <div className="field full">
              <label htmlFor={`${idBase}-contenido`}>Tu experiencia</label>
              <textarea
                id={`${idBase}-contenido`}
                name="content"
                required
                minLength={25}
                maxLength={600}
                placeholder="Sin datos del caso, ni de terceros, ni información sensible."
              />
            </div>

            <div className="field full field--consentimiento">
              <input
                id={`${idBase}-consent`}
                name="consent"
                type="checkbox"
                required
              />
              <label htmlFor={`${idBase}-consent`}>
                Autorizo al estudio a publicar esta opinión con el nombre que
                indiqué. Sé que puedo pedir que la retiren.
              </label>
            </div>
          </div>

          <button
            className="btn btn-dark"
            style={{ marginTop: 18 }}
            disabled={envio.fase === "enviando"}
          >
            {envio.fase === "enviando" ? "Enviando…" : "Enviar para revisión"}
          </button>

          {envio.fase === "error" && (
            <div className="status status--error" role="alert">
              {envio.mensaje}
            </div>
          )}
          {envio.fase === "ok" && (
            <div className="status status--ok" role="status">
              {envio.mensaje}
            </div>
          )}
        </form>
      </Dialogo>
    </section>
  );
}
