/**
 * Reglas de la agenda (I-FUNC-02).
 *
 * Lo que se está probando es la afirmación central de la corrección: **la
 * interfaz no puede reservar un horario inválido manipulando el payload**,
 * porque quien decide es esta capa y la interfaz consume exactamente la misma
 * función que valida el servidor.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  ANTICIPACION_MAXIMA_DIAS,
  ANTICIPACION_MINIMA_MINUTOS,
  agruparPorFecha,
  esEstado,
  slotsDisponibles,
  validarVentana,
} from "../../lib/agenda.ts";
import { instanteDe } from "../../lib/fecha.ts";

/** Instante de referencia: 27/08/2026, 10:00 en Argentina. */
const AHORA = instanteDe("2026-08-27", "10:00");

test("rechaza formatos inválidos con 400", () => {
  const casos = [
    { date: "27-08-2026", time: "10:00" },
    { date: "2026-08-27", time: "10:00:00" },
    { date: "2026-08-27", time: "25:00" },
    { date: "2026-13-01", time: "10:00" },
    { date: "", time: "" },
    { date: "2026-08-27", time: "9:00" },
  ];

  for (const slot of casos) {
    const resultado = validarVentana(slot, AHORA);
    assert.ok(resultado, `debería rechazar ${JSON.stringify(slot)}`);
    assert.equal(resultado.codigo, 400);
    assert.equal(resultado.motivo, "formato");
  }
});

test("rechaza un horario que ya pasó", () => {
  const resultado = validarVentana(
    { date: "2026-08-27", time: "09:00" },
    AHORA,
  );
  assert.equal(resultado?.motivo, "pasado");
  assert.equal(resultado?.codigo, 400);
});

test("rechaza un horario demasiado próximo", () => {
  // Falta media hora; el mínimo son 2.
  const resultado = validarVentana(
    { date: "2026-08-27", time: "10:30" },
    AHORA,
  );
  assert.equal(resultado?.motivo, "muy_pronto");
  assert.equal(ANTICIPACION_MINIMA_MINUTOS, 120);
});

test("acepta justo en el límite de anticipación mínima", () => {
  assert.equal(
    validarVentana({ date: "2026-08-27", time: "12:00" }, AHORA),
    null,
  );
});

test("rechaza un horario más allá de la ventana máxima", () => {
  const resultado = validarVentana(
    { date: "2027-08-27", time: "10:00" },
    AHORA,
  );
  assert.equal(resultado?.motivo, "muy_lejos");
  assert.equal(ANTICIPACION_MAXIMA_DIAS, 90);
});

test("acepta un horario válido dentro de la ventana", () => {
  assert.equal(
    validarVentana({ date: "2026-08-28", time: "09:00" }, AHORA),
    null,
  );
  assert.equal(
    validarVentana({ date: "2026-11-20", time: "16:00" }, AHORA),
    null,
  );
});

test("un horario ocupado deja de ofrecerse", () => {
  const catalogo = [
    { date: "2026-08-28", time: "09:00" },
    { date: "2026-08-28", time: "10:00" },
    { date: "2026-08-29", time: "09:00" },
  ];
  const ocupados = [{ date: "2026-08-28", time: "09:00" }];

  const libres = slotsDisponibles(catalogo, ocupados, AHORA);

  assert.equal(libres.length, 2);
  assert.ok(
    !libres.some((s) => s.date === "2026-08-28" && s.time === "09:00"),
    "el horario tomado no puede aparecer como disponible",
  );
});

test("los horarios fuera de la ventana no se ofrecen aunque estén en el catálogo", () => {
  const catalogo = [
    { date: "2026-08-27", time: "09:00" }, // ya pasó
    { date: "2026-08-27", time: "10:30" }, // demasiado pronto
    { date: "2028-01-01", time: "10:00" }, // demasiado lejos
    { date: "2026-08-28", time: "10:00" }, // válido
  ];

  const libres = slotsDisponibles(catalogo, [], AHORA);

  assert.deepEqual(libres, [{ date: "2026-08-28", time: "10:00" }]);
});

test("un catálogo vacío da una agenda vacía, no una agenda abierta", () => {
  // Es el punto central: sin horarios cargados no hay nada disponible. La
  // versión anterior consideraba disponible todo lo que no estuviera bloqueado.
  assert.deepEqual(slotsDisponibles([], [], AHORA), []);
});

test("los horarios salen ordenados por fecha y hora", () => {
  const catalogo = [
    { date: "2026-08-29", time: "14:00" },
    { date: "2026-08-28", time: "16:00" },
    { date: "2026-08-28", time: "09:00" },
    { date: "2026-08-29", time: "09:00" },
  ];

  const libres = slotsDisponibles(catalogo, [], AHORA);

  assert.deepEqual(libres, [
    { date: "2026-08-28", time: "09:00" },
    { date: "2026-08-28", time: "16:00" },
    { date: "2026-08-29", time: "09:00" },
    { date: "2026-08-29", time: "14:00" },
  ]);
});

test("agruparPorFecha arma los días que consume la interfaz", () => {
  const dias = agruparPorFecha([
    { date: "2026-08-28", time: "09:00" },
    { date: "2026-08-28", time: "16:00" },
    { date: "2026-08-29", time: "09:00" },
  ]);

  assert.deepEqual(dias, [
    { date: "2026-08-28", horas: ["09:00", "16:00"] },
    { date: "2026-08-29", horas: ["09:00"] },
  ]);
});

test("sólo se reconocen los estados definidos", () => {
  for (const estado of [
    "pending",
    "confirmed",
    "rescheduled",
    "cancelled",
    "completed",
    "no_show",
  ]) {
    assert.ok(esEstado(estado), `${estado} debería ser válido`);
  }
  for (const invalido of [
    "paid",
    "PENDING",
    "",
    null,
    undefined,
    1,
    "'; DROP TABLE appointments;--",
  ]) {
    assert.ok(!esEstado(invalido), `${String(invalido)} no debería aceptarse`);
  }
});

test("no existe ningún estado que implique pago ni confirmación automática", () => {
  // El requisito es explícito: no hardcodear "pagado = confirmado" ni asumir
  // que todo turno se confirma solo. Un turno nace pending y sólo una persona
  // lo mueve de ahí.
  assert.ok(!esEstado("paid"));
  assert.ok(!esEstado("auto_confirmed"));
});
