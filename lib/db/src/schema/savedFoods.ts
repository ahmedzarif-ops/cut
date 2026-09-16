import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/** A private, user-reviewed reusable nutrition snapshot. */
export const savedFoodsTable = pgTable(
  "saved_foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceRef: text("source_ref"),
    fingerprint: text("fingerprint").notNull(),
    name: text("name").notNull(),
    servingDescription: text("serving_description").notNull(),
    caloriesKcal: doublePrecision("calories_kcal").notNull(),
    proteinG: doublePrecision("protein_g").notNull(),
    carbsG: doublePrecision("carbs_g").notNull(),
    fatG: doublePrecision("fat_g").notNull(),
    fiberG: doublePrecision("fiber_g").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("saved_foods_user_fingerprint_unique").on(
      table.userId,
      table.fingerprint,
    ),
    index("saved_foods_user_updated_index").on(table.userId, table.updatedAt),
    check(
      "saved_foods_source_check",
      sql`${table.source} IN ('curated', 'barcode', 'manual')`,
    ),
    check(
      "saved_foods_nutrition_nonnegative_check",
      sql`${table.caloriesKcal} >= 0 AND ${table.proteinG} >= 0 AND ${table.carbsG} >= 0 AND ${table.fatG} >= 0 AND ${table.fiberG} >= 0`,
    ),
    check(
      "saved_foods_nutrition_finite_check",
      sql`${table.caloriesKcal} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.proteinG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.carbsG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fatG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fiberG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)`,
    ),
  ],
);

export const insertSavedFoodSchema = createInsertSchema(savedFoodsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSavedFood = z.infer<typeof insertSavedFoodSchema>;
export type SavedFood = typeof savedFoodsTable.$inferSelect;
