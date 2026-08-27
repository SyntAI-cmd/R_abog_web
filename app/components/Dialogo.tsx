"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * Diálogo modal accesible.
 *
 * El modal anterior era un `<div role="dialog" aria-modal="true">` sin ninguna
 * gestión de foco (I-A11Y-01): al abrirlo el foco se quedaba detrás, el
 * tabulador recorría la página tapada, Escape no cerraba y al cerrar el foco no
 * volvía a ningún lado. Para alguien que navega con teclado, eso es una trampa.
 *
 * Este componente implementa el patrón completo:
 *
 *   - el foco entra al abrir, en el primer elemento enfocable;
 *   - queda contenido: Tab y Shift+Tab circulan dentro;
 *   - Escape cierra;
 *   - un clic en el fondo cierra, pero un clic que EMPIEZA adentro y termina
 *     afuera (soltar el mouse tras seleccionar texto) no;
 *   - al cerrar, el foco vuelve al elemento que lo abrió;
 *   - el resto de la página queda `inert`, así ni el tabulador ni el lector de
 *     pantalla la alcanzan;
 *   - el scroll del fondo se bloquea sin que la página salte.
 *
 * Está separado del formulario de opiniones a propósito: es un problema
 * resuelto, no algo que haya que volver a resolver en el próximo modal.
 */

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  /** Id del elemento que titula el diálogo. Se referencia con aria-labelledby. */
  titulaId: string;
  children: ReactNode;
};

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialogo({ abierto, onCerrar, titulaId, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  const arranqueDentro = useRef(false);

  const enfocables = useCallback(
    () =>
      panel.current
        ? Array.from(
            panel.current.querySelectorAll<HTMLElement>(ENFOCABLES),
          ).filter(
            (el) => el.offsetParent !== null || el === document.activeElement,
          )
        : [],
    [],
  );

  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // El resto de la página se vuelve inerte. Es la forma correcta de decir
    // "esto no existe mientras el diálogo está abierto": lo entienden tanto el
    // orden de tabulación como los lectores de pantalla.
    const hermanos = Array.from(document.body.children).filter(
      (hijo) => hijo !== panel.current?.parentElement,
    ) as HTMLElement[];
    const inertesPrevios = hermanos.map((el) => el.inert);
    hermanos.forEach((el) => (el.inert = true));

    // Se compensa el ancho de la barra de scroll para que el fondo no salte.
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth;
    const overflowPrevio = document.body.style.overflow;
    const paddingPrevio = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`;

    // El foco entra en el primer control, no en el panel: quien usa lector de
    // pantalla escucha directamente qué tiene que completar.
    const primero = enfocables()[0] ?? panel.current;
    primero?.focus();

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCerrar();
        return;
      }

      if (evento.key !== "Tab") return;

      const lista = enfocables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }

      const primeroDeLista = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;

      if (
        evento.shiftKey &&
        (activo === primeroDeLista || !panel.current?.contains(activo))
      ) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primeroDeLista.focus();
      }
    };

    // El cierre por clic fuera se escucha en el documento, no con handlers en
    // un <div>: un div con onClick es un control interactivo improvisado que ni
    // el teclado ni los lectores de pantalla reconocen. Acá el div es sólo el
    // fondo visual, y cerrar con teclado ya lo cubre Escape.
    const alPresionarPuntero = (evento: MouseEvent) => {
      arranqueDentro.current =
        panel.current?.contains(evento.target as Node) ?? false;
    };
    const alSoltarPuntero = (evento: MouseEvent) => {
      const fuera = !panel.current?.contains(evento.target as Node);
      // Sólo cierra si el gesto EMPEZÓ afuera: soltar el mouse fuera del panel
      // después de seleccionar texto adentro no debe cerrar nada.
      if (fuera && !arranqueDentro.current) onCerrar();
      arranqueDentro.current = false;
    };

    document.addEventListener("keydown", alPresionar, true);
    document.addEventListener("mousedown", alPresionarPuntero, true);
    document.addEventListener("mouseup", alSoltarPuntero, true);

    return () => {
      document.removeEventListener("keydown", alPresionar, true);
      document.removeEventListener("mousedown", alPresionarPuntero, true);
      document.removeEventListener("mouseup", alSoltarPuntero, true);
      hermanos.forEach((el, i) => (el.inert = inertesPrevios[i]));
      document.body.style.overflow = overflowPrevio;
      document.body.style.paddingRight = paddingPrevio;
      focoPrevio.current?.focus();
    };
  }, [abierto, onCerrar, enfocables]);

  if (!abierto) return null;

  return (
    <div className="modal-backdrop">
      <div
        ref={panel}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulaId}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
