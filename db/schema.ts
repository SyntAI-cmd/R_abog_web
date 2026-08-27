import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), age: integer("age").notNull(), situation: text("situation").notNull(), date: text("date").notNull(), time: text("time").notNull(), status: text("status").notNull().default("pending"), internalNotes: text("internal_notes").notNull().default(""), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_appointments_date_status").on(table.date, table.status)]);
export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }), displayName: text("display_name").notNull(), rating: integer("rating").notNull(), content: text("content").notNull(), status: text("status").notNull().default("pending"), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_reviews_status_created").on(table.status, table.createdAt)]);
export const availability = sqliteTable("availability", {
  id: integer("id").primaryKey({ autoIncrement: true }), date: text("date").notNull(), time: text("time").notNull(), enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
}, (table) => [uniqueIndex("idx_availability_slot").on(table.date, table.time)]);
