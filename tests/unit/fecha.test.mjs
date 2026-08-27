/**
 * Fechas civiles argentinas (I-FUNC-03).
 *
 * El caso que motiva estas pruebas: `new Date().toISOString().slice(0,10)`
 * devuelve la fecha en UTC. Argentina está en UTC-3, así que entre las 21:00 y
 * la medianoche hora local el «hoy» calculado así ya es el día siguiente. No es
 * un caso de borde exótico: pasa todas las noches, tres horas por día.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  fechaCivilDe,
  instanteDe,
  sumarDias,
  diasEntre,
  diaDeLaSemana,
  partesParaMostrar,
} from "../../lib/fecha.ts";

test("a las 21:00 de Argentina el día civil todavía no cambió", () => {
  // 2026-08-27 21:30 en Buenos Aires = 2026-08-28 00:30 UTC.
  const instante = new Date("2026-08-28T00:30:00Z");

  assert.equal(
    instante.toISOString().slice(0, 10),
    "2026-08-28",
    "así se veía con el cálculo viejo: ya es el día siguiente",
  );
  assert.equal(
    fechaCivilDe(instante),
    "2026-08-27",
    "en Mendoza todavía es el 27",
  );
});

test("a las 23:59 de Argentina el día civil sigue siendo el mismo", () => {
  const instante = new Date("2026-08-28T02:59:00Z"); // 23:59 del 27 en Argentina
  assert.equal(fechaCivilDe(instante), "2026-08-27");
});

test("pasada la medianoche argentina el día civil avanza", () => {
  const instante = new Date("2026-08-28T03:01:00Z"); // 00:01 del 28 en Argentina
  assert.equal(fechaCivilDe(instante), "2026-08-28");
});

test("el borde de mes y de año se resuelve con la hora local, no con UTC", () => {
  // 31/12/2026 22:00 en Argentina = 01/01/2027 01:00 UTC.
  const finDeAnio = new Date("2027-01-01T01:00:00Z");
  assert.equal(finDeAnio.toISOString().slice(0, 10), "2027-01-01");
  assert.equal(
    fechaCivilDe(finDeAnio),
    "2026-12-31",
    "en Argentina todavía es 2026",
  );

  // 31/08 22:00 local = 01/09 01:00 UTC.
  const finDeMes = new Date("2026-09-01T01:00:00Z");
  assert.equal(fechaCivilDe(finDeMes), "2026-08-31");
});

test("instanteDe convierte una fecha y hora civiles al instante correcto", () => {
  // Argentina está en UTC-3 todo el año desde 2009.
  assert.equal(
    instanteDe("2026-08-27", "10:00").toISOString(),
    "2026-08-27T13:00:00.000Z",
  );
  assert.equal(
    instanteDe("2026-01-15", "00:00").toISOString(),
    "2026-01-15T03:00:00.000Z",
  );
  assert.equal(
    instanteDe("2026-12-31", "23:30").toISOString(),
    "2027-01-01T02:30:00.000Z",
  );
});

test("instanteDe y fechaCivilDe son consistentes entre sí", () => {
  // Recorrer las 24 horas de un día y comprobar que ninguna se corre de fecha.
  for (let hora = 0; hora < 24; hora++) {
    const texto = `${String(hora).padStart(2, "0")}:00`;
    const instante = instanteDe("2026-08-27", texto);
    assert.equal(fechaCivilDe(instante), "2026-08-27", `falló a las ${texto}`);
  }
});

test("sumarDias no se corre por zonas horarias", () => {
  assert.equal(sumarDias("2026-08-27", 1), "2026-08-28");
  assert.equal(sumarDias("2026-08-31", 1), "2026-09-01");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(sumarDias("2028-03-01", -1), "2028-02-29", "2028 es bisiesto");
});

test("diasEntre cuenta días de calendario", () => {
  assert.equal(diasEntre("2026-08-27", "2026-08-28"), 1);
  assert.equal(diasEntre("2026-08-27", "2026-08-27"), 0);
  assert.equal(diasEntre("2026-08-28", "2026-08-27"), -1);
  assert.equal(diasEntre("2026-12-31", "2027-01-01"), 1);
  assert.equal(diasEntre("2026-01-01", "2026-12-31"), 364);
});

test("diaDeLaSemana usa el calendario, no la zona del servidor", () => {
  // 2026-08-27 es jueves.
  assert.equal(diaDeLaSemana("2026-08-27"), 4);
  assert.equal(diaDeLaSemana("2026-08-29"), 6, "sábado");
  assert.equal(diaDeLaSemana("2026-08-30"), 0, "domingo");
});

test("partesParaMostrar describe la fecha recibida, sin correrla", () => {
  const partes = partesParaMostrar("2026-08-27");
  assert.equal(
    partes.numero,
    27,
    "el número del día tiene que ser el de la fecha pedida",
  );
  assert.ok(partes.dia.length > 0);
  assert.ok(partes.mes.length > 0);
  assert.ok(partes.completa.includes("27"));
});
