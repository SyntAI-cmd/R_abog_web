/**
 * Aplica las migraciones de `drizzle/` a la base D1 local de Miniflare.
 *
 * En producción las aplica el hosting durante el despliegue. En desarrollo no
 * las aplica nadie, y antes eso quedaba tapado porque el código creaba las
 * tablas al vuelo con `ensureSchema()` en la primera petición — justo lo que se
 * eliminó (I-FUNC-04). Sin este script, un checkout limpio levanta el sitio con
 * la base vacía y todo responde 503.
 *
 *   node scripts/d1-local.mjs            aplica las migraciones pendientes
 *   node scripts/d1-local.mjs --estado   muestra qué hay aplicado
 *   node scripts/d1-local.mjs --semilla  carga horarios de prueba (sólo local)
 *
 * Usa `node:sqlite`, incluido en Node 22.5+, así que no agrega dependencias.
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("../", import.meta.url));
const carpetaD1 = join(raiz, ".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
const carpetaMigraciones = join(raiz, "drizzle");

function localizarBase() {
  if (!existsSync(carpetaD1)) {
    throw new Error(
      "No existe la base local. Levantá el servidor una vez con `npm run dev` para que Miniflare la cree.",
    );
  }
  const archivos = readdirSync(carpetaD1).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite");
  if (archivos.length === 0) throw new Error("No se encontró ningún archivo .sqlite de D1.");
  // El de nombre más largo es el hash de la base de la aplicación; `metadata`
  // es el registro interno de Miniflare.
  return join(carpetaD1, archivos.sort((a, b) => b.length - a.length)[0]);
}

const db = new DatabaseSync(localizarBase());

db.exec(`CREATE TABLE IF NOT EXISTS __migraciones_aplicadas (
  tag TEXT PRIMARY KEY,
  aplicada_en TEXT NOT NULL
)`);

const aplicadas = new Set(
  db.prepare("SELECT tag FROM __migraciones_aplicadas").all().map((f) => f.tag),
);

const migraciones = readdirSync(carpetaMigraciones)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (process.argv.includes("--estado")) {
  console.log("Migraciones:");
  for (const archivo of migraciones) {
    const tag = archivo.replace(/\.sql$/, "");
    console.log(`  ${aplicadas.has(tag) ? "✓" : "·"} ${tag}`);
  }
  const tablas = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((f) => f.name);
  console.log(`\nTablas: ${tablas.join(", ")}`);
  process.exit(0);
}

if (process.argv.includes("--semilla")) {
  // Horarios de PRUEBA para verificar el turnero en local. Nunca se ejecuta en
  // producción: la agenda real la carga el estudio desde el panel.
  const hoy = new Date();
  const ahora = new Date().toISOString();
  let cargados = 0;

  for (let dia = 2; dia <= 6; dia++) {
    const fecha = new Date(hoy.getTime() + dia * 86400000).toISOString().slice(0, 10);
    for (const hora of ["09:00", "10:30", "15:00", "16:30"]) {
      db.prepare(
        `INSERT INTO availability (date, time, enabled, note, created_at) VALUES (?, ?, 1, '', ?)
         ON CONFLICT(date, time) DO UPDATE SET enabled = 1`,
      ).run(fecha, hora, ahora);
      cargados++;
    }
  }
  console.log(`Cargados ${cargados} horarios de prueba en la base LOCAL.`);
  process.exit(0);
}

let aplicadasAhora = 0;

for (const archivo of migraciones) {
  const tag = archivo.replace(/\.sql$/, "");
  if (aplicadas.has(tag)) continue;

  const sql = readFileSync(join(carpetaMigraciones, archivo), "utf8");
  // Drizzle separa las sentencias con este marcador.
  const sentencias = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentencia of sentencias) {
    try {
      db.exec(sentencia);
    } catch (error) {
      // Una base local puede venir de la época del `ensureSchema()`, con parte
      // del esquema ya creado. Se ignoran los choques por objeto existente y se
      // informa cualquier otro fallo.
      const mensaje = String(error?.message ?? error);
      if (/already exists|duplicate column/i.test(mensaje)) continue;
      console.error(`\nFalló en ${tag}:\n${sentencia.slice(0, 200)}\n${mensaje}`);
      process.exit(1);
    }
  }

  db.prepare("INSERT INTO __migraciones_aplicadas (tag, aplicada_en) VALUES (?, ?)").run(
    tag,
    new Date().toISOString(),
  );
  console.log(`✓ ${tag}`);
  aplicadasAhora++;
}

console.log(
  aplicadasAhora === 0 ? "La base local ya está al día." : `${aplicadasAhora} migración(es) aplicada(s).`,
);
