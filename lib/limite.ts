/**
 * Límite de peticiones, persistido en D1.
 *
 * Los endpoints públicos —pedir un turno, dejar una opinión— no tenían ninguna
 * defensa: ni límite, ni honeypot, ni idempotencia (I-SEC-01). Un script podía
 * llenar la agenda y la tabla de reseñas en segundos, y cada envío repetido por
 * un doble clic creaba un turno duplicado.
 *
 * El contador vive en la base y no en memoria porque el sitio corre sobre
 * Workers: cada petición puede tocar una instancia distinta, así que un contador
 * en memoria no cuenta nada. Es una ventana fija, no deslizante: más simple, más
 * barata y suficiente para lo que hace falta frenar.
 */
import type { D1Database } from "@cloudflare/workers-types";

export type Veredicto =
  | { permitido: true; restantes: number }
  | { permitido: false; reintentarEnSegundos: number };

/**
 * Identifica a quien llama, para contar por origen.
 *
 * Cloudflare pone la IP real en `CF-Connecting-IP`; el resto son alternativas
 * para entornos de desarrollo. Si no hay ninguna, todas las peticiones caen en
 * el mismo balde `desconocido`, que es el comportamiento seguro: prefiere ser
 * estricto de más antes que no contar nada.
 */
export function identificarOrigen(request: Request): string {
  const cabeceras = request.headers;
  const ip =
    cabeceras.get("cf-connecting-ip") ??
    cabeceras.get("x-real-ip") ??
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocido";
  return ip.slice(0, 60);
}

/**
 * Registra un intento y dice si se puede seguir.
 *
 * Se escribe siempre, incluso cuando se rechaza, para que una ráfaga no se
 * "reinicie" por dejar de contar los intentos bloqueados.
 */
export async function consumirIntento(
  db: D1Database,
  clave: string,
  maximo: number,
  ventanaSegundos: number,
  ahora: Date = new Date(),
): Promise<Veredicto> {
  const inicioVentana =
    Math.floor(ahora.getTime() / 1000 / ventanaSegundos) * ventanaSegundos;

  // INSERT ... ON CONFLICT hace el incremento atómico: dos peticiones
  // simultáneas no pueden leer el mismo contador y pisarse.
  await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, hits)
       VALUES (?1, ?2, 1)
       ON CONFLICT(bucket, window_start) DO UPDATE SET hits = hits + 1`,
    )
    .bind(clave, inicioVentana)
    .run();

  const fila = await db
    .prepare(
      "SELECT hits FROM rate_limits WHERE bucket = ?1 AND window_start = ?2",
    )
    .bind(clave, inicioVentana)
    .first<{ hits: number }>();

  const usados = fila?.hits ?? 1;

  if (usados > maximo) {
    const finVentana = (inicioVentana + ventanaSegundos) * 1000;
    return {
      permitido: false,
      reintentarEnSegundos: Math.max(
        1,
        Math.ceil((finVentana - ahora.getTime()) / 1000),
      ),
    };
  }

  return { permitido: true, restantes: maximo - usados };
}

/**
 * Borra ventanas viejas.
 *
 * Se llama de forma oportunista después de escribir, no en un cron: la tabla
 * crece poco y así no hace falta infraestructura extra. Sin esto, la tabla
 * crecería para siempre.
 */
export async function purgarVentanasViejas(
  db: D1Database,
  anterioresASegundos: number,
): Promise<void> {
  await db
    .prepare("DELETE FROM rate_limits WHERE window_start < ?1")
    .bind(anterioresASegundos)
    .run();
}
