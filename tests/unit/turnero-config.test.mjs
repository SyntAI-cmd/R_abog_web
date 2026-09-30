import assert from "node:assert/strict";
import test from "node:test";
import { resolverTurnero } from "../../lib/turnero-config.ts";

test("Cal sólo se activa con una ruta pública real", () => {
  assert.deepEqual(resolverTurnero("cal", "rocio/consulta-juridica"), { proveedor: "cal", ruta: "rocio/consulta-juridica" });
  assert.equal(resolverTurnero("cal", "usuario/evento").proveedor, "pausado");
  assert.equal(resolverTurnero("cal", "").proveedor, "pausado");
});

test("el modo local debe declararse y el resto falla cerrado", () => {
  assert.equal(resolverTurnero("local", undefined).proveedor, "local");
  assert.equal(resolverTurnero(undefined, undefined).proveedor, "pausado");
  assert.equal(resolverTurnero("cualquier-cosa", "rocio/consulta").proveedor, "pausado");
});
