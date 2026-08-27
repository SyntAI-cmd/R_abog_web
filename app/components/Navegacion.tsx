"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Navegación principal.
 *
 * El botón «☰» de la versión anterior no abría ningún menú: llamaba a
 * `document.querySelector("#turnos").scrollIntoView()`, es decir, saltaba al
 * turnero (I-UX-01). Su `aria-label` incluso decía «Ir a reservar turno», o sea
 * que el código sabía lo que hacía — pero el icono de tres líneas significa
 * «menú» para cualquiera que lo vea, y por debajo de 900 px era la única forma
 * de llegar a Áreas, Cómo trabajamos y Preguntas. Esas secciones quedaban
 * inaccesibles desde la navegación en teléfonos.
 *
 * Ahora abre un menú de verdad, con el mismo cuidado de foco que el diálogo:
 * el foco entra, queda contenido, Escape cierra y al cerrar vuelve al botón.
 */

const ENLACES = [
  { href: "#estudio", texto: "El estudio" },
  { href: "#areas", texto: "Áreas" },
  { href: "#metodo", texto: "Cómo trabajamos" },
  { href: "#faq", texto: "Preguntas" },
  { href: "#turnos", texto: "Reservar turno" },
];

export function Navegacion() {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cerrar = useCallback((devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;

    const enfocables = () =>
      panel.current
        ? Array.from(
            panel.current.querySelectorAll<HTMLElement>("a[href], button"),
          )
        : [];

    enfocables()[0]?.focus();

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }
      if (evento.key !== "Tab") return;

      const lista = enfocables();
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    // Al pasar a escritorio el menú deja de mostrarse: hay que cerrarlo o el
    // body queda bloqueado y el foco atrapado en algo invisible.
    const consulta = window.matchMedia("(min-width: 900px)");
    const alCambiarAncho = (evento: MediaQueryListEvent) => {
      if (evento.matches) cerrar(false);
    };

    document.addEventListener("keydown", alPresionar, true);
    consulta.addEventListener("change", alCambiarAncho);

    return () => {
      document.removeEventListener("keydown", alPresionar, true);
      consulta.removeEventListener("change", alCambiarAncho);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto, cerrar]);

  return (
    <nav className="nav" aria-label="Navegación principal">
      <div className="container nav-in">
        <a className="brand" href="#inicio">
          <span className="brand-mark" aria-hidden="true">
            <span>I</span>
          </span>
          <span>
            <span className="brand-name">IMPACTO</span>
            <span className="brand-sub">ESTUDIO JURÍDICO</span>
          </span>
        </a>

        <div className="nav-links">
          {ENLACES.slice(0, 4).map((enlace) => (
            <a key={enlace.href} href={enlace.href}>
              {enlace.texto}
            </a>
          ))}
        </div>

        <a className="btn btn-primary nav-cta" href="#turnos">
          Reservar turno <span aria-hidden="true">↗</span>
        </a>

        <button
          ref={boton}
          className="menu-btn"
          type="button"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          onClick={() => setAbierto((previo) => !previo)}
        >
          <span aria-hidden="true">{abierto ? "✕" : "☰"}</span>
        </button>
      </div>

      <div
        id="menu-movil"
        ref={panel}
        className={`menu-movil ${abierto ? "menu-movil--abierto" : ""}`}
        hidden={!abierto}
      >
        <ul>
          {ENLACES.map((enlace) => (
            <li key={enlace.href}>
              <a href={enlace.href} onClick={() => cerrar(false)}>
                {enlace.texto}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
