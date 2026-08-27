/**
 * Validación de entradas y autorización.
 *
 * Cubre I-FUNC-01 (la escala de calificación es 1–5 completa), I-SEC-01
 * (honeypot y saneamiento) e I-SEC-02 (la autorización falla cerrada).
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  limpiarTexto,
  neutralizarFormula,
  pareceBot,
  validarCalificacion,
  validarEdad,
  validarNombre,
  validarNombrePublico,
  validarOpinion,
  validarSituacion,
} from "../../lib/validacion.ts";
import {
  autorizar,
  emailsAutorizados,
  respuestaDeAutorizacion,
} from "../../lib/autorizacion.ts";

test("limpiarTexto quita caracteres de control y normaliza espacios", () => {
  assert.equal(limpiarTexto("  hola   mundo  ", 100), "hola mundo");
  assert.equal(limpiarTexto("con\u0000 nulo", 100), "con nulo");
  assert.equal(limpiarTexto("a\n\n\n\n\nb", 100), "a\n\nb");
  assert.equal(limpiarTexto("recorta esto", 7), "recorta");
  assert.equal(limpiarTexto(null, 10), "");
  assert.equal(limpiarTexto(42, 10), "");
});

test("limpiarTexto no escapa HTML: eso es tarea del punto de salida", () => {
  // React escapa al renderizar. Guardar el texto ya escapado haría que en el
  // panel se leyera "&amp;" en lugar de "&".
  assert.equal(
    limpiarTexto("Fernández & Asociados", 100),
    "Fernández & Asociados",
  );
  assert.equal(limpiarTexto("<b>hola</b>", 100), "<b>hola</b>");
});

test("neutralizarFormula protege una exportación a planilla", () => {
  assert.equal(neutralizarFormula("=1+1"), "'=1+1");
  assert.equal(neutralizarFormula("+54 9 263"), "'+54 9 263");
  assert.equal(neutralizarFormula("-5"), "'-5");
  assert.equal(neutralizarFormula("@usuario"), "'@usuario");
  assert.equal(
    neutralizarFormula("  =IMPORTXML(1)").charAt(0),
    "'",
    "no se evade con espacios",
  );
  assert.equal(neutralizarFormula("María Pérez"), "María Pérez");
});

test("la calificación acepta el rango completo 1 a 5", () => {
  // I-FUNC-01: el formulario anterior sólo ofrecía 3, 4 y 5. Eso no es
  // moderación, es sesgar la recolección.
  for (const puntaje of [1, 2, 3, 4, 5]) {
    const resultado = validarCalificacion(puntaje);
    assert.equal(resultado.ok, true, `${puntaje} estrellas debe aceptarse`);
    assert.equal(resultado.valor, puntaje);
  }
});

test("la calificación rechaza lo que está fuera de rango o no es entero", () => {
  for (const invalido of [
    0,
    6,
    -1,
    4.5,
    "cinco",
    null,
    undefined,
    NaN,
    Infinity,
  ]) {
    assert.equal(
      validarCalificacion(invalido).ok,
      false,
      `${String(invalido)} no debe aceptarse`,
    );
  }
});

test("el nombre exige longitud mínima y al menos una letra", () => {
  assert.equal(validarNombre("Ana Gómez").ok, true);
  assert.equal(validarNombre("Ab").ok, false, "demasiado corto");
  assert.equal(validarNombre("12345").ok, false, "sin letras");
  assert.equal(validarNombre("   ").ok, false);
  assert.equal(validarNombre(null).ok, false);
});

test("la edad exige un entero de 18 a 110", () => {
  assert.equal(validarEdad(18).ok, true);
  assert.equal(
    validarEdad("35").ok,
    true,
    "acepta el número como texto del formulario",
  );
  assert.equal(validarEdad(110).ok, true);
  assert.equal(validarEdad(17).ok, false);
  assert.equal(validarEdad(111).ok, false);
  assert.equal(validarEdad(30.5).ok, false);
  assert.equal(validarEdad("treinta").ok, false);
});

test("la situación y la opinión exigen un mínimo de contenido", () => {
  assert.equal(validarSituacion("corto").ok, false);
  assert.equal(
    validarSituacion("Tuve un accidente de tránsito el mes pasado.").ok,
    true,
  );
  assert.equal(validarOpinion("Muy bien").ok, false);
  assert.equal(
    validarOpinion("Me explicaron cada paso con mucha claridad y paciencia.")
      .ok,
    true,
  );
  assert.equal(validarNombrePublico("A").ok, false);
  assert.equal(validarNombrePublico("M. A.").ok, true);
});

test("el honeypot detecta un campo trampa completado", () => {
  assert.equal(pareceBot("https://spam.example"), true);
  assert.equal(pareceBot("  algo  "), true);
  assert.equal(pareceBot(""), false, "vacío es lo que deja una persona");
  assert.equal(pareceBot("   "), false, "sólo espacios no cuenta");
  assert.equal(pareceBot(undefined), false);
});

/* ── Autorización: I-SEC-02 ─────────────────────────────────────────────── */

test("sin ADMIN_EMAILS no hay ningún administrador", () => {
  const previo = process.env.ADMIN_EMAILS;
  try {
    delete process.env.ADMIN_EMAILS;
    assert.deepEqual(emailsAutorizados(), []);

    // El punto de la corrección: una configuración ausente NO concede acceso.
    const resultado = autorizar({
      email: "estudiojuridicofernandezrr@gmail.com",
    });
    assert.equal(resultado.estado, "sin_configurar");
    assert.equal(respuestaDeAutorizacion(resultado).status, 503);
  } finally {
    if (previo === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previo;
  }
});

test("con ADMIN_EMAILS vacío tampoco hay administrador", () => {
  const previo = process.env.ADMIN_EMAILS;
  try {
    process.env.ADMIN_EMAILS = "   ,  ,";
    assert.deepEqual(emailsAutorizados(), []);
    assert.equal(
      autorizar({ email: "quien@sea.com" }).estado,
      "sin_configurar",
    );
  } finally {
    if (previo === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previo;
  }
});

test("la comparación de direcciones ignora mayúsculas y espacios", () => {
  const previo = process.env.ADMIN_EMAILS;
  try {
    process.env.ADMIN_EMAILS = " Admin@Estudio.com , otra@estudio.com ";
    assert.deepEqual(emailsAutorizados(), [
      "admin@estudio.com",
      "otra@estudio.com",
    ]);
    assert.equal(
      autorizar({ email: "ADMIN@ESTUDIO.COM" }).estado,
      "autorizado",
    );
    assert.equal(
      autorizar({ email: " otra@estudio.com " }).estado,
      "autorizado",
    );
  } finally {
    if (previo === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previo;
  }
});

test("cada desenlace tiene su código HTTP y ninguno filtra la lista", () => {
  const previo = process.env.ADMIN_EMAILS;
  try {
    process.env.ADMIN_EMAILS = "admin@estudio.com";

    assert.equal(
      respuestaDeAutorizacion(autorizar(null)).status,
      401,
      "sin sesión",
    );
    const prohibido = respuestaDeAutorizacion(
      autorizar({ email: "otro@ejemplo.com" }),
    );
    assert.equal(prohibido.status, 403);
    assert.ok(
      !prohibido.error.includes("admin@estudio.com"),
      "el mensaje no debe revelar quién sí está autorizado",
    );
    assert.equal(
      respuestaDeAutorizacion(autorizar({ email: "admin@estudio.com" })).status,
      200,
    );
  } finally {
    if (previo === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previo;
  }
});
