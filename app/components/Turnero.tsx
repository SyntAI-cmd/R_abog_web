"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { partesParaMostrar } from "../../lib/fecha";

/**
 * Turnero.
 *
 * Los horarios vienen del servidor y de ningún otro lado. La versión anterior
 * los tenía escritos en el cliente —siete días hábiles calculados en el
 * navegador y una grilla fija `["09:00","10:00","11:30","15:00","16:30"]`— sin
 * consultar nunca la disponibilidad real (I-FUNC-02). Ofrecía horarios que el
 * estudio no había habilitado y que podían estar ya tomados.
 *
 * Además calculaba la fecha con `toISOString().slice(0,10)`, que devuelve UTC:
 * a partir de las 21:00 de Argentina, el día ofrecido era el siguiente
 * (I-FUNC-03). Ahora las fechas llegan del servidor como texto civil y no se
 * vuelven a convertir.
 *
 * Si no hay horarios, se dice. Es preferible a mostrar una grilla que no
 * significa nada.
 */

type Dia = { date: string; horas: string[] };

type Estado =
  | { fase: "cargando" }
  | { fase: "listo"; dias: Dia[] }
  | { fase: "sin_servicio" };

type Envio =
  | { fase: "inactivo" }
  | { fase: "enviando" }
  | { fase: "ok"; mensaje: string }
  | { fase: "error"; mensaje: string; campo?: string };

export function Turnero() {
  const [agenda, setAgenda] = useState<Estado>({ fase: "cargando" });
  const [fecha, setFecha] = useState<string>("");
  const [hora, setHora] = useState<string>("");
  const [envio, setEnvio] = useState<Envio>({ fase: "inactivo" });
  const idBase = useId();

  /**
   * Clave de idempotencia: se genera una vez por formulario. Si la persona
   * hace doble clic o la red reintenta, el servidor reconoce que es la misma
   * solicitud y no crea dos turnos.
   */
  const [claveEnvio, setClaveEnvio] = useState<string>(() =>
    crypto.randomUUID(),
  );

  /**
   * Trae la agenda del servidor. Se usa al montar y cada vez que algo pudo
   * haberla cambiado: después de reservar, o tras un 409 que indica que el
   * horario elegido se ocupó mientras se completaba el formulario.
   */
  const cargarAgenda = useCallback(async (): Promise<void> => {
    return fetch("/api/availability", { cache: "no-store" })
      .then((respuesta) =>
        (
          respuesta.json() as Promise<{ dias?: Dia[]; disponible?: boolean }>
        ).then((datos) => {
          if (!respuesta.ok || datos.disponible === false) {
            setAgenda({ fase: "sin_servicio" });
            return;
          }
          setAgenda({ fase: "listo", dias: datos.dias ?? [] });
        }),
      )
      .catch(() => setAgenda({ fase: "sin_servicio" }));
  }, []);

  useEffect(() => {
    // Se descarta el resultado si el componente se desmontó mientras tanto: sin
    // esto, React avisa por actualizar el estado de algo que ya no está.
    let vigente = true;
    fetch("/api/availability", { cache: "no-store" })
      .then((respuesta) =>
        (
          respuesta.json() as Promise<{ dias?: Dia[]; disponible?: boolean }>
        ).then((datos) => {
          if (!vigente) return;
          if (!respuesta.ok || datos.disponible === false) {
            setAgenda({ fase: "sin_servicio" });
            return;
          }
          setAgenda({ fase: "listo", dias: datos.dias ?? [] });
        }),
      )
      .catch(() => {
        if (vigente) setAgenda({ fase: "sin_servicio" });
      });
    return () => {
      vigente = false;
    };
  }, []);

  /**
   * La selección se DERIVA de la agenda en cada render, no se sincroniza con
   * efectos. `fecha` y `hora` guardan sólo la intención de la persona; si la
   * agenda se recarga y ese horario dejó de existir, la selección efectiva pasa
   * a ser otra sin que haga falta un `setState` dentro de un `useEffect` —que
   * además provocaría renders en cascada.
   */
  const dias = agenda.fase === "listo" ? agenda.dias : [];
  const diaElegido = dias.find((d) => d.date === fecha) ?? dias[0];
  const horaElegida = diaElegido?.horas.includes(hora) ? hora : "";

  async function reservar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;

    if (!diaElegido || !horaElegida) {
      setEnvio({
        fase: "error",
        mensaje: "Elegí un día y un horario antes de enviar.",
      });
      return;
    }

    setEnvio({ fase: "enviando" });
    const datos = new FormData(formulario);

    try {
      const respuesta = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: datos.get("name"),
          age: datos.get("age"),
          situation: datos.get("situation"),
          website: datos.get("website"),
          date: diaElegido.date,
          time: horaElegida,
          requestId: claveEnvio,
        }),
      });

      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        campo?: string;
      };

      if (!respuesta.ok) {
        setEnvio({
          fase: "error",
          mensaje: cuerpo.error ?? "No pudimos registrar la solicitud.",
          campo: cuerpo.campo,
        });
        // Un 409 significa que el horario dejó de estar libre: se recarga la
        // agenda para que lo que se ve vuelva a ser cierto.
        if (respuesta.status === 409) void cargarAgenda();
        return;
      }

      setEnvio({
        fase: "ok",
        mensaje:
          "Recibimos tu solicitud. Queda pendiente hasta que el estudio la confirme; te vamos a contactar.",
      });
      formulario.reset();
      setHora("");
      setClaveEnvio(crypto.randomUUID());
      void cargarAgenda();
    } catch {
      setEnvio({
        fase: "error",
        mensaje:
          "No hubo conexión con el servidor. Revisá tu red e intentá de nuevo.",
      });
    }
  }

  return (
    <section className="section booking" id="turnos">
      <div className="container booking-shell">
        <div className="booking-info">
          <span className="eyebrow">Reservá una consulta</span>
          <h2 className="display">El primer paso puede ser simple.</h2>
          <p>
            Elegí uno de los horarios disponibles y contanos brevemente tu
            situación. La solicitud queda
            <strong> pendiente</strong> hasta que el estudio la revise y la
            confirme.
          </p>
          <p className="privacy-note">
            Tus datos se usan únicamente para gestionar la consulta. No incluyas
            información médica ni documentación sensible en este formulario.
          </p>
        </div>

        <form className="booking-form" onSubmit={reservar} noValidate>
          {/* Campo trampa: invisible para las personas, tentador para un bot. */}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor={`${idBase}-website`}>No completes este campo</label>
            <input
              id={`${idBase}-website`}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {agenda.fase === "cargando" && (
            <p className="status" role="status">
              Consultando horarios disponibles…
            </p>
          )}

          {agenda.fase === "sin_servicio" && (
            <div className="status status--error" role="alert">
              No pudimos consultar la agenda en este momento. Escribinos por
              WhatsApp y coordinamos la consulta.
            </div>
          )}

          {agenda.fase === "listo" && dias.length === 0 && (
            <div className="status" role="status">
              No hay horarios disponibles por ahora. Escribinos por WhatsApp y
              te avisamos en cuanto se abra la agenda.
            </div>
          )}

          {agenda.fase === "listo" && dias.length > 0 && (
            <>
              <fieldset className="campo-grupo">
                <legend className="month-head">
                  <b>Elegí una fecha</b>
                  <span>Días con horarios disponibles</span>
                </legend>
                <div className="dates">
                  {dias.map((dia) => {
                    const partes = partesParaMostrar(dia.date);
                    const activo = dia.date === (diaElegido?.date ?? "");
                    return (
                      <button
                        type="button"
                        className={`date ${activo ? "active" : ""}`}
                        key={dia.date}
                        onClick={() => setFecha(dia.date)}
                        aria-pressed={activo}
                      >
                        <small>{partes.dia}</small>
                        {partes.numero} {partes.mes}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="campo-grupo">
                <legend className="month-head">
                  <b>Elegí un horario</b>
                  <span>
                    {diaElegido
                      ? partesParaMostrar(diaElegido.date).completa
                      : ""}
                  </span>
                </legend>
                <div className="times">
                  {(diaElegido?.horas ?? []).map((h) => (
                    <button
                      type="button"
                      className={`time ${horaElegida === h ? "active" : ""}`}
                      key={h}
                      onClick={() => setHora(h)}
                      aria-pressed={horaElegida === h}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="fields">
                <div className="field">
                  <label htmlFor={`${idBase}-name`}>Nombre y apellido</label>
                  <input
                    id={`${idBase}-name`}
                    name="name"
                    minLength={3}
                    maxLength={80}
                    required
                    autoComplete="name"
                    aria-invalid={
                      envio.fase === "error" && envio.campo === "name"
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${idBase}-age`}>Edad</label>
                  <input
                    id={`${idBase}-age`}
                    name="age"
                    type="number"
                    min={18}
                    max={110}
                    required
                    aria-invalid={
                      envio.fase === "error" && envio.campo === "age"
                    }
                  />
                </div>
                <div className="field full">
                  <label htmlFor={`${idBase}-situation`}>
                    ¿Por qué querés consultarnos?
                  </label>
                  <textarea
                    id={`${idBase}-situation`}
                    name="situation"
                    minLength={15}
                    maxLength={700}
                    required
                    placeholder="Contanos lo esencial, sin incluir datos sensibles."
                    aria-invalid={
                      envio.fase === "error" && envio.campo === "situation"
                    }
                  />
                </div>
              </div>

              <button
                className="btn btn-dark"
                type="submit"
                style={{ marginTop: 20 }}
                disabled={envio.fase === "enviando" || !horaElegida}
              >
                {envio.fase === "enviando" ? "Enviando…" : "Solicitar turno ↗"}
              </button>

              {!horaElegida && (
                <p className="status status--hint">
                  Elegí un horario para poder enviar la solicitud.
                </p>
              )}
            </>
          )}

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
      </div>
    </section>
  );
}
