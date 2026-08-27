-- Turnero server-authoritative, moderación honesta de reseñas y límite de
-- peticiones persistido.
--
-- Reemplaza al `ensureSchema()` que creaba tablas e índices en caliente durante
-- la primera petición (I-FUNC-04). Las migraciones pasan a ser la única fuente
-- de verdad del esquema.
--
-- Es incremental y no destructiva: no borra ninguna fila existente.

-- ── appointments ────────────────────────────────────────────────────────────

ALTER TABLE `appointments` ADD `request_id` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `updated_at` text NOT NULL DEFAULT '';--> statement-breakpoint

-- Las filas anteriores a esta migración no tenían updated_at.
UPDATE `appointments` SET `updated_at` = `created_at` WHERE `updated_at` = '';--> statement-breakpoint

-- Idempotencia: dos envíos del mismo formulario comparten request_id y crean un
-- solo turno. SQLite trata cada NULL como distinto, así que las filas viejas
-- (request_id NULL) no chocan entre sí.
CREATE UNIQUE INDEX `idx_appointments_request_id` ON `appointments` (`request_id`);--> statement-breakpoint

-- Prevención de doble reserva EN LA BASE, no sólo en la aplicación.
--
-- Es lo que hace que dos peticiones simultáneas por el mismo horario no puedan
-- ganar las dos: la segunda viola la restricción y la API responde 409. Sin
-- esto, dos comprobaciones "¿está libre?" pueden dar «sí» a la vez y escribir
-- las dos.
--
-- Es parcial a propósito: un turno cancelado libera su horario.
CREATE UNIQUE INDEX `idx_appointments_slot_activo`
  ON `appointments` (`date`, `time`)
  WHERE `status` IN ('pending', 'confirmed', 'rescheduled');--> statement-breakpoint

-- ── reviews ─────────────────────────────────────────────────────────────────

ALTER TABLE `reviews` ADD `consent_at` text;--> statement-breakpoint
ALTER TABLE `reviews` ADD `moderation_notes` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `reviews` ADD `updated_at` text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE `reviews` SET `updated_at` = `created_at` WHERE `updated_at` = '';--> statement-breakpoint

-- ── availability ────────────────────────────────────────────────────────────

ALTER TABLE `availability` ADD `note` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `availability` ADD `created_at` text NOT NULL DEFAULT '';--> statement-breakpoint

-- ── rate_limits ─────────────────────────────────────────────────────────────

CREATE TABLE `rate_limits` (
	`bucket` text NOT NULL,
	`window_start` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX `idx_rate_limits_bucket_window` ON `rate_limits` (`bucket`, `window_start`);
