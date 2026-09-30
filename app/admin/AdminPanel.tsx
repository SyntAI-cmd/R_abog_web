"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { partesParaMostrar } from "../../lib/fecha";

/**
 * Panel de administración.
 *
 * Sobre el manejo de errores (I-P3-04): la versión anterior sólo actualizaba la
 * pantalla cuando `response.ok` era verdadero, y no hacía nada cuando no lo era.
 * Un cambio que fallaba se veía exactamente igual que uno que funcionaba, así
 * que quien administraba podía creer que confirmó un turno sin haberlo hecho.
 * Acá cada operación deja un estado visible —en curso, listo o el error que
 * devolvió el servidor— y ningún fallo pasa en silencio.
 */

type Fila = Record<string, unknown>;

type Aviso = { tipo: "ok" | "error" | "cargando"; texto: string };

/**
 * Estado de una operación. Se define fuera del componente a propósito: si se
 * declarara adentro, React lo trataría como un tipo de componente nuevo en cada
 * render y desmontaría el nodo cada vez.
 */
function AvisoOperacion({ aviso }: { aviso: Aviso | undefined }) {
  if (!aviso) return null;
  return (
    <p
      className={`admin-aviso admin-aviso--${aviso.tipo}`}
      role={aviso.tipo === "error" ? "alert" : "status"}
    >
      {aviso.texto}
    </p>
  );
}

type Props = {
  usuario: string;
  turnosIniciales: Fila[];
  opinionesIniciales: Fila[];
  horariosIniciales: Fila[];
  proveedorTurnos: "local" | "cal" | "pausado";
  calPanelUrl: string;
};

const ESTADOS_TURNO = [
  ["pending", "Pendiente"],
  ["confirmed", "Confirmado"],
  ["rescheduled", "Reprogramado"],
  ["completed", "Realizado"],
  ["cancelled", "Cancelado"],
  ["no_show", "No asistió"],
] as const;

const ESTADOS_OPINION = [
  ["pending", "Pendiente"],
  ["approved", "Publicada"],
  ["rejected", "Rechazada"],
  ["withdrawn", "Retirada"],
] as const;

const texto = (fila: Fila, clave: string): string => String(fila[clave] ?? "");
const numero = (fila: Fila, clave: string): number => Number(fila[clave] ?? 0);

export function AdminPanel({
  usuario,
  turnosIniciales,
  opinionesIniciales,
  horariosIniciales,
  proveedorTurnos,
  calPanelUrl,
}: Props) {
  const [turnos, setTurnos] = useState(turnosIniciales);
  const [opiniones, setOpiniones] = useState(opinionesIniciales);
  const [horarios, setHorarios] = useState(horariosIniciales);

  /** Mensaje por operación en curso, indexado por una clave estable. */
  const [avisos, setAvisos] = useState<Record<string, Aviso>>({});

  const avisar = useCallback(
    (clave: string, tipo: "ok" | "error" | "cargando", texto: string) => {
      setAvisos((previos) => ({ ...previos, [clave]: { tipo, texto } }));
    },
    [],
  );

  /** Forma de las respuestas de la API de administración. */
  type RespuestaAdmin = { item?: Fila; error?: string; aviso?: string };

  /**
   * Envuelve una llamada a la API con su estado visible.
   * Devuelve el cuerpo cuando salió bien, o `null` cuando falló.
   */
  const llamar = useCallback(
    async (
      clave: string,
      url: string,
      opciones: RequestInit,
      exito: string,
    ): Promise<RespuestaAdmin | null> => {
      avisar(clave, "cargando", "Guardando…");
      try {
        const respuesta = await fetch(url, {
          ...opciones,
          headers: {
            "content-type": "application/json",
            ...(opciones.headers ?? {}),
          },
        });
        const datos = (await respuesta
          .json()
          .catch(() => ({}))) as RespuestaAdmin;

        if (!respuesta.ok) {
          avisar(
            clave,
            "error",
            datos.error || `No se pudo guardar (HTTP ${respuesta.status}).`,
          );
          return null;
        }

        avisar(clave, "ok", datos.aviso || exito);
        return datos;
      } catch {
        avisar(
          clave,
          "error",
          "No hubo conexión con el servidor. El cambio no se guardó.",
        );
        return null;
      }
    },
    [avisar],
  );

  async function cambiarEstadoTurno(id: number, status: string) {
    const datos = await llamar(
      `turno-${id}`,
      "/api/admin/appointments",
      { method: "PATCH", body: JSON.stringify({ id, status }) },
      "Estado actualizado.",
    );
    if (datos?.item) {
      setTurnos((previos) =>
        previos.map((t) =>
          numero(t, "id") === id ? { ...t, ...datos.item } : t,
        ),
      );
    }
  }

  async function guardarNotas(id: number, internalNotes: string) {
    const datos = await llamar(
      `notas-${id}`,
      "/api/admin/appointments",
      { method: "PATCH", body: JSON.stringify({ id, internalNotes }) },
      "Notas guardadas.",
    );
    if (datos?.item) {
      setTurnos((previos) =>
        previos.map((t) =>
          numero(t, "id") === id ? { ...t, ...datos.item } : t,
        ),
      );
    }
  }

  async function moderar(id: number, status: string) {
    const datos = await llamar(
      `opinion-${id}`,
      "/api/admin/reviews",
      { method: "PATCH", body: JSON.stringify({ id, status }) },
      "Opinión actualizada.",
    );
    if (datos?.item) {
      setOpiniones((previas) =>
        previas.map((o) =>
          numero(o, "id") === id ? { ...o, ...datos.item } : o,
        ),
      );
    }
  }

  async function agregarHorario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datosForm = new FormData(formulario);

    const datos = await llamar(
      "nuevo-horario",
      "/api/admin/availability",
      {
        method: "POST",
        body: JSON.stringify({
          date: datosForm.get("date"),
          time: datosForm.get("time"),
        }),
      },
      "Horario agregado a la agenda.",
    );

    const nuevo = datos?.item;
    if (nuevo) {
      setHorarios((previos) => {
        const sinDuplicado = previos.filter(
          (h) => numero(h, "id") !== numero(nuevo, "id"),
        );
        return [...sinDuplicado, nuevo].sort((a, b) =>
          `${texto(a, "date")}${texto(a, "time")}`.localeCompare(
            `${texto(b, "date")}${texto(b, "time")}`,
          ),
        );
      });
      formulario.reset();
    }
  }

  async function quitarHorario(id: number) {
    const datos = await llamar(
      `horario-${id}`,
      "/api/admin/availability",
      { method: "DELETE", body: JSON.stringify({ id }) },
      "El horario dejó de ofrecerse.",
    );
    if (datos?.item) {
      setHorarios((previos) =>
        previos.map((h) =>
          numero(h, "id") === id ? { ...h, ...datos.item } : h,
        ),
      );
    }
  }

  const pendientes = turnos.filter(
    (t) => texto(t, "status") === "pending",
  ).length;
  const opinionesPendientes = opiniones.filter(
    (o) => texto(o, "status") === "pending",
  ).length;

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <h1 className="display">Administración</h1>
          <p className="admin-usuario">Sesión de {usuario}</p>
        </div>
        <Link className="btn" href="/">
          Ver el sitio
        </Link>
      </header>

      <section className="admin-seccion" aria-labelledby="h-agenda">
        <h2 id="h-agenda">Agenda</h2>
        {proveedorTurnos !== "local" && <div className="admin-migracion"><strong>Nuevas reservas: {proveedorTurnos === "cal" ? "Cal.com" : "agenda pausada"}</strong><p>Los registros que siguen debajo son historial anterior y permanecen en modo de solo lectura.</p><a className="btn btn-dark" href={calPanelUrl} target="_blank" rel="noreferrer noopener">Gestionar agenda en Cal.com</a></div>}
        <p className="admin-nota">
          Un horario existe sólo si está cargado acá. Si la lista está vacía, el
          sitio informa que no hay turnos disponibles: nunca ofrece horarios que
          el estudio no habilitó.
        </p>

        {proveedorTurnos === "local" && <form className="admin-form-horario" onSubmit={agregarHorario}>
          <div className="admin-campo">
            <label htmlFor="nuevo-horario-fecha">Fecha</label>
            <input id="nuevo-horario-fecha" name="date" type="date" required />
          </div>
          <div className="admin-campo">
            <label htmlFor="nuevo-horario-hora">Hora</label>
            <input
              id="nuevo-horario-hora"
              name="time"
              type="time"
              required
              step={900}
            />
          </div>
          <button className="btn btn-dark" type="submit">
            Agregar horario
          </button>
        </form>}
        <AvisoOperacion aviso={avisos["nuevo-horario"]} />

        {horarios.length === 0 ? (
          <p className="admin-vacio">Todavía no hay horarios cargados.</p>
        ) : (
          <ul className="admin-lista">
            {horarios.map((horario) => {
              const id = numero(horario, "id");
              const habilitado = Boolean(horario.enabled);
              const ocupado = numero(horario, "ocupado") > 0;
              return (
                <li key={id} className="admin-item">
                  <span>
                    <strong>
                      {partesParaMostrar(texto(horario, "date")).completa}
                    </strong>{" "}
                    · {texto(horario, "time")}
                    {ocupado && (
                      <span className="admin-etiqueta">con turno</span>
                    )}
                    {!habilitado && (
                      <span className="admin-etiqueta">no se ofrece</span>
                    )}
                  </span>
                  {habilitado && (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => quitarHorario(id)}
                    >
                      Dejar de ofrecer
                    </button>
                  )}
                  <AvisoOperacion aviso={avisos[`horario-${id}`]} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-seccion" aria-labelledby="h-turnos">
        <h2 id="h-turnos">
          Turnos{" "}
          {pendientes > 0 && (
            <span className="admin-contador">{pendientes} sin responder</span>
          )}
        </h2>

        {turnos.length === 0 ? (
          <p className="admin-vacio">No hay turnos solicitados.</p>
        ) : (
          <ul className="admin-lista">
            {turnos.map((turno) => {
              const id = numero(turno, "id");
              return (
                <li key={id} className="admin-turno">
                  <div className="admin-turno-cabecera">
                    <strong>
                      {partesParaMostrar(texto(turno, "date")).completa} ·{" "}
                      {texto(turno, "time")}
                    </strong>
                    <span
                      className={`admin-estado admin-estado--${texto(turno, "status")}`}
                    >
                      {ESTADOS_TURNO.find(
                        ([valor]) => valor === texto(turno, "status"),
                      )?.[1] ?? texto(turno, "status")}
                    </span>
                  </div>

                  <p className="admin-turno-persona">
                    {texto(turno, "name")} · {numero(turno, "age")} años
                  </p>
                  <p className="admin-turno-situacion">
                    {texto(turno, "situation")}
                  </p>

                  <div className="admin-campo">
                    <label htmlFor={`estado-${id}`}>Estado</label>
                    <select
                      id={`estado-${id}`}
                      defaultValue={texto(turno, "status")}
                      onChange={(evento) =>
                        cambiarEstadoTurno(id, evento.target.value)
                      }
                    >
                      {ESTADOS_TURNO.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <AvisoOperacion aviso={avisos[`turno-${id}`]} />

                  <div className="admin-campo">
                    <label htmlFor={`notas-${id}`}>Notas internas</label>
                    <textarea
                      id={`notas-${id}`}
                      defaultValue={texto(turno, "internal_notes")}
                      rows={2}
                      onBlur={(evento) => {
                        if (
                          evento.target.value !== texto(turno, "internal_notes")
                        ) {
                          guardarNotas(id, evento.target.value);
                        }
                      }}
                    />
                  </div>
                  <AvisoOperacion aviso={avisos[`notas-${id}`]} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-seccion" aria-labelledby="h-opiniones">
        <h2 id="h-opiniones">
          Opiniones{" "}
          {opinionesPendientes > 0 && (
            <span className="admin-contador">
              {opinionesPendientes} sin moderar
            </span>
          )}
        </h2>
        <p className="admin-nota">
          Sólo se publican las aprobadas, con la calificación que puso quien la
          escribió. «Retirada» es para cuando alguien pide dar de baja una
          opinión ya publicada: conserva el registro del consentimiento en lugar
          de borrar la fila.
        </p>

        {opiniones.length === 0 ? (
          <p className="admin-vacio">No hay opiniones recibidas.</p>
        ) : (
          <ul className="admin-lista">
            {opiniones.map((opinion) => {
              const id = numero(opinion, "id");
              const puntaje = numero(opinion, "rating");
              return (
                <li key={id} className="admin-turno">
                  <div className="admin-turno-cabecera">
                    <strong>{texto(opinion, "display_name")}</strong>
                    <span aria-label={`${puntaje} de 5`}>
                      {"★".repeat(puntaje)}
                      {"☆".repeat(5 - puntaje)}
                    </span>
                  </div>
                  <p className="admin-turno-situacion">
                    {texto(opinion, "content")}
                  </p>

                  <div className="admin-campo">
                    <label htmlFor={`opinion-${id}`}>Estado</label>
                    <select
                      id={`opinion-${id}`}
                      defaultValue={texto(opinion, "status")}
                      onChange={(evento) => moderar(id, evento.target.value)}
                    >
                      {ESTADOS_OPINION.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <AvisoOperacion aviso={avisos[`opinion-${id}`]} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
