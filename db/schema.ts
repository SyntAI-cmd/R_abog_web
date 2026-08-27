import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Esquema de la base.
 *
 * Las migraciones de `drizzle/` son la ÚNICA fuente de verdad del esquema
 * (I-FUNC-04). Antes había un `ensureSchema()` que creaba tablas e índices en
 * caliente, en la primera petición: eso hacía que el esquema real dependiera de
 * qué versión del código atendió esa petición, que dos instancias arrancando a
 * la vez compitieran por crear lo mismo, y que una base restaurada desde backup
 * no fuera necesariamente idéntica a la de producción.
 */

/**
 * Turnos solicitados.
 *
 * `date` y `time` son fecha y hora CIVILES de Argentina (`AAAA-MM-DD`, `HH:MM`),
 * no instantes UTC. Ver `lib/fecha.ts` para el porqué.
 */
export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    age: integer("age").notNull(),
    situation: text("situation").notNull(),
    date: text("date").notNull(),
    time: text("time").notNull(),
    /** pending | confirmed | rescheduled | cancelled | completed | no_show */
    status: text("status").notNull().default("pending"),
    internalNotes: text("internal_notes").notNull().default(""),
    /**
     * Clave de idempotencia que genera el navegador. Dos envíos del mismo
     * formulario —un doble clic, un reintento por red inestable— comparten
     * clave y crean un solo turno.
     */
    requestId: text("request_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_appointments_date_status").on(table.date, table.status),
    uniqueIndex("idx_appointments_request_id").on(table.requestId),
  ],
);

/**
 * Opiniones.
 *
 * `rating` es un entero de 1 a 5 y se muestra tal cual. La versión anterior
 * imprimía cinco estrellas fijas sin mirar este valor.
 */
export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    displayName: text("display_name").notNull(),
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    /** pending | approved | rejected | withdrawn */
    status: text("status").notNull().default("pending"),
    /**
     * Registro de que quien la envió aceptó que se publique. Sin esto, publicar
     * el texto de otra persona no tiene respaldo.
     */
    consentAt: text("consent_at"),
    moderationNotes: text("moderation_notes").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_reviews_status_created").on(table.status, table.createdAt),
  ],
);

/**
 * Catálogo de horarios ofrecidos.
 *
 * Cada fila es un turno concreto que administración habilitó. **No hay grilla
 * por defecto:** una tabla vacía significa «sin horarios disponibles», no
 * «cualquier horario sirve». El servidor sólo acepta reservas que coincidan con
 * una fila habilitada de acá.
 */
export const availability = sqliteTable(
  "availability",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    time: text("time").notNull(),
    /** Un horario deshabilitado deja de ofrecerse sin borrar su historial. */
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    /** Motivo cuando se deshabilita: feriado, licencia, audiencia. */
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("idx_availability_slot").on(table.date, table.time)],
);

/**
 * Contadores del límite de peticiones.
 *
 * Vive en la base y no en memoria porque cada petición puede atenderla una
 * instancia distinta del Worker: un contador en memoria no contaría nada.
 */
export const rateLimits = sqliteTable(
  "rate_limits",
  {
    bucket: text("bucket").notNull(),
    windowStart: integer("window_start").notNull(),
    hits: integer("hits").notNull().default(0),
  },
  (table) => [
    uniqueIndex("idx_rate_limits_bucket_window").on(
      table.bucket,
      table.windowStart,
    ),
  ],
);
