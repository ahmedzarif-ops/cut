import { sql } from "drizzle-orm";
import {
  check,
  date,
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

/**
 * A user's logged catalog meal. Template copy and per-serving nutrition are
 * snapshotted so historical totals remain stable after catalog releases.
 */
export const mealEntriesTable = pgTable(
  "meal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /** Client-generated idempotency key; unique within the user's account. */
    clientRequestId: uuid("client_request_id").notNull(),
    /** Canonical user-local date, computed by the server. */
    loggedOn: date("logged_on", { mode: "string" }).notNull(),
    /** Catalog release used to create this immutable nutrition snapshot. */
    catalogVersion: text("catalog_version").notNull(),
    templateId: text("template_id").notNull(),
    name: text("name").notNull(),
    servingDescription: text("serving_description").notNull(),
    servings: doublePrecision("servings").notNull(),
    caloriesKcalPerServing: doublePrecision(
      "calories_kcal_per_serving",
    ).notNull(),
    proteinGPerServing: doublePrecision("protein_g_per_serving").notNull(),
    carbsGPerServing: doublePrecision("carbs_g_per_serving").notNull(),
    fatGPerServing: doublePrecision("fat_g_per_serving").notNull(),
    fiberGPerServing: doublePrecision("fiber_g_per_serving").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("meal_entries_user_client_request_unique").on(
      table.userId,
      table.clientRequestId,
    ),
    index("meal_entries_user_logged_on_index").on(table.userId, table.loggedOn),
    check(
      "meal_entries_servings_range_check",
      sql`${table.servings} >= 0.25 AND ${table.servings} <= 4`,
    ),
    check(
      "meal_entries_nutrition_nonnegative_check",
      sql`${table.caloriesKcalPerServing} >= 0 AND ${table.proteinGPerServing} >= 0 AND ${table.carbsGPerServing} >= 0 AND ${table.fatGPerServing} >= 0 AND ${table.fiberGPerServing} >= 0`,
    ),
    check(
      "meal_entries_nutrition_finite_check",
      sql`${table.caloriesKcalPerServing} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.proteinGPerServing} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.carbsGPerServing} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fatGPerServing} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fiberGPerServing} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)`,
    ),
  ],
);

export const insertMealEntrySchema = createInsertSchema(mealEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMealEntry = z.infer<typeof insertMealEntrySchema>;
export type MealEntry = typeof mealEntriesTable.$inferSelect;
