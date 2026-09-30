"use client";

export function BotonTurno({ className = "btn btn-turno-glass" }: { className?: string; calActivo?: boolean }) {
  function abrirTurnero() {
    document.querySelector("#turnos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <button className={className} type="button" onClick={abrirTurnero}>Reservar turno</button>;
}
