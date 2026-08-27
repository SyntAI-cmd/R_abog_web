import { env } from "cloudflare:workers";

let ready: Promise<void> | null = null;
export function getD1() { if (!env.DB) throw new Error("Database unavailable"); return env.DB; }
export async function ensureSchema() { if (!ready) ready = (async()=>{ const db=getD1(); await db.batch([
  db.prepare("CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER NOT NULL, situation TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', internal_notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
  db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_active ON appointments(date,time) WHERE status IN ('pending','confirmed')"),
  db.prepare("CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(date,status)"),
  db.prepare("CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, display_name TEXT NOT NULL, rating INTEGER NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL)"),
  db.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews(status,created_at)"),
  db.prepare("CREATE TABLE IF NOT EXISTS availability (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1)"),
  db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_slot ON availability(date,time)")
]); })(); return ready; }
