import { env } from "cloudflare:workers";
import type { D1Database } from "@cloudflare/workers-types";

/**
 * Acceso a la base.
 *
 * Antes había además un `db/runtime.ts` con `ensureSchema()`, que creaba tablas
 * e índices en la primera petición. Se eliminó (I-FUNC-04): el esquema lo
 * definen las migraciones de `drizzle/`, que el hosting aplica en el despliegue.
 * Crear esquema en caliente hacía que la forma real de la base dependiera de qué
 * versión del código atendió esa primera petición.
 */

export class BaseNoDisponible extends Error {
  constructor() {
    super(
      "El binding D1 `DB` no está disponible. Verificá el campo `d1` de .openai/hosting.json " +
        "y que el entorno inyecte el binding.",
    );
    this.name = "BaseNoDisponible";
  }
}

export function getD1(): D1Database {
  const db = (env as { DB?: D1Database }).DB;
  if (!db) throw new BaseNoDisponible();
  return db;
}

/** `true` si hay base disponible. Sirve para degradar en vez de romper. */
export function hayBase(): boolean {
  return Boolean((env as { DB?: D1Database }).DB);
}

/** Marca de tiempo para las columnas `created_at` / `updated_at`. */
export const ahoraISO = (): string => new Date().toISOString();
