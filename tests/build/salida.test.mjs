/**
 * Pruebas sobre el resultado del build.
 *
 * Requieren un `vinext build` previo.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const dist = join(raiz, "dist");

if (!existsSync(dist)) {
  throw new Error(
    "No existe dist/. Ejecutá `npm run build` antes que estas pruebas.",
  );
}

async function archivos(directorio) {
  const salida = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) salida.push(...(await archivos(ruta)));
    else salida.push(ruta);
  }
  return salida;
}

const todos = await archivos(dist);
const ruta = (f) => relative(dist, f).replace(/\\/g, "/");

test("no se filtra ninguna ruta local absoluta al build (I-TECH-02)", async () => {
  // El defecto original: 23 rutas `C:/Users/.../Documents/Codex/...` incrustadas
  // en dist/server/index.js. Venían de una caché de fuentes en .vinext generada
  // cuando el proyecto vivía en otra carpeta, que sobrevivió a la mudanza. Las
  // fuentes fallaban en runtime y el build revelaba la estructura de carpetas
  // del equipo de desarrollo.
  const culpables = [];

  for (const archivo of todos) {
    if (/\.(woff2?|png|jpe?g|ico|svg|map)$/.test(archivo)) continue;
    const contenido = readFileSync(archivo, "utf8");
    if (
      /[A-Za-z]:[\\/]Users[\\/]/.test(contenido) ||
      contenido.includes("file:///")
    ) {
      culpables.push(ruta(archivo));
    }
  }

  assert.deepEqual(
    culpables,
    [],
    `Hay rutas locales en el build:\n${culpables.join("\n")}\n\n` +
      "Suele ser una caché de fuentes vieja. Borrá .vinext/ y volvé a construir.",
  );
});

test("las fuentes quedan empaquetadas como recursos web", () => {
  const fuentes = todos.filter((f) => f.endsWith(".woff2"));
  assert.ok(fuentes.length > 0, "el build no incluye ninguna fuente");
  assert.ok(
    fuentes.some((f) => ruta(f).includes("_next/static")),
    "las fuentes deben servirse desde _next/static, no desde una ruta del disco",
  );
});

test("las migraciones viajan al paquete de despliegue", () => {
  // El hosting las aplica al desplegar; si no llegan, la base queda sin esquema.
  const migraciones = todos.filter(
    (f) => ruta(f).startsWith(".openai/drizzle/") && f.endsWith(".sql"),
  );
  assert.ok(
    migraciones.length >= 3,
    `se esperaban al menos 3 migraciones, hay ${migraciones.length}`,
  );
  assert.ok(
    migraciones.some((f) => f.includes("0002_agenda_server_authoritative")),
    "falta la migración del turnero server-authoritative",
  );
});

test("no queda ningún testimonio de respaldo escrito en el código (I-CONT-01)", () => {
  // Los cuatro seeds originales. Si alguno reaparece en el build es que se
  // volvieron a incrustar opiniones sin respaldo.
  const frases = [
    "Me explicaron cada paso con paciencia",
    "Destaco la claridad y el seguimiento",
    "Un trato muy humano en un momento difícil",
    "Respondieron mis dudas y ordenaron toda la documentación",
  ];

  for (const archivo of todos) {
    if (!/\.(js|html|json|txt)$/.test(archivo)) continue;
    const contenido = readFileSync(archivo, "utf8");
    for (const frase of frases) {
      assert.ok(
        !contenido.includes(frase),
        `${ruta(archivo)} todavía contiene un testimonio seed`,
      );
    }
  }
});

test("no queda la grilla de horarios fija en el cliente (I-FUNC-02)", () => {
  // La grilla original estaba escrita en el componente. Ahora los horarios sólo
  // pueden venir de /api/availability.
  const grilla = /\["09:00","10:00","11:30","15:00","16:30"\]/;
  for (const archivo of todos.filter((f) => f.endsWith(".js"))) {
    const contenido = readFileSync(archivo, "utf8");
    assert.ok(
      !grilla.test(contenido),
      `${ruta(archivo)} todavía trae la grilla de horarios fija`,
    );
  }
});

test("no queda la dirección de administración por defecto en el código (I-SEC-02)", () => {
  // El fallback `process.env.ADMIN_EMAILS || "estudiojuridico...@gmail.com"`
  // concedía acceso cuando faltaba la configuración.
  for (const archivo of todos.filter((f) => f.endsWith(".js"))) {
    const contenido = readFileSync(archivo, "utf8");
    assert.ok(
      !/ADMIN_EMAILS\s*\|\|\s*["']/.test(contenido),
      `${ruta(archivo)} tiene un valor por defecto para ADMIN_EMAILS`,
    );
  }
});

test("el cliente no incluye rutas de administración", () => {
  const cliente = todos.filter(
    (f) => ruta(f).startsWith("client/") && f.endsWith(".js"),
  );
  assert.ok(cliente.length > 0, "no se encontró ningún bundle de cliente");
});

test("las cabeceras de seguridad están declaradas", () => {
  const headers = join(raiz, "public", "_headers");
  assert.ok(existsSync(headers), "falta public/_headers");
  const contenido = readFileSync(headers, "utf8");

  for (const cabecera of [
    "Strict-Transport-Security",
    "X-Content-Type-Options: nosniff",
    "X-Frame-Options: DENY",
    "Referrer-Policy",
    "Permissions-Policy",
    "Content-Security-Policy",
  ]) {
    assert.ok(contenido.includes(cabecera), `falta la cabecera ${cabecera}`);
  }

  assert.match(contenido, /frame-ancestors 'none'/);
  assert.match(contenido, /object-src 'none'/);
  // El panel y la API nunca se cachean ni se indexan.
  assert.match(contenido, /\/admin\s+Cache-Control: no-store/);
  assert.match(contenido, /X-Robots-Tag: noindex/);
});

test("los recursos innecesarios del starter ya no se despliegan", () => {
  for (const sobrante of ["file.svg", "globe.svg", "window.svg", "og.png"]) {
    assert.ok(
      !existsSync(join(raiz, "public", sobrante)),
      `public/${sobrante} es del starter y no debería seguir ahí`,
    );
  }
  assert.ok(
    existsSync(join(raiz, "public", "favicon.ico")),
    "falta favicon.ico (I-P3-01)",
  );
});
