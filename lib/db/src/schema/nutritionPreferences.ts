import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

/** Explicit user choices only. This is not a medical or allergy profile. */
export const nutritionPreferencesTable = pgTable(
  "nutrition_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    dailyCalorieTarget: integer("daily_calorie_target"),
    dailyProteinTargetG: integer("daily_protein_target_g"),
    dietStyle: text("diet_style").notNull().default("no_preference"),
    preferredCuisines: text("preferred_cuisines")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    avoidedIngredients: text("avoided_ingredients")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    learningEnabled: boolean("learning_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "nutrition_preferences_calorie_target_range_check",
      sql`${table.dailyCalorieTarget} IS NULL OR (${table.dailyCalorieTarget} >= 800 AND ${table.dailyCalorieTarget} <= 6000)`,
    ),
    check(
      "nutrition_preferences_protein_target_range_check",
      sql`${table.dailyProteinTargetG} IS NULL OR (${table.dailyProteinTargetG} >= 20 AND ${table.dailyProteinTargetG} <= 400)`,
    ),
    check(
      "nutrition_preferences_diet_style_check",
      sql`${table.dietStyle} IN ('no_preference', 'omnivore', 'vegetarian', 'vegan', 'pescatarian')`,
    ),
    check(
      "nutrition_preferences_cuisines_count_check",
      sql`cardinality(${table.preferredCuisines}) <= 10`,
    ),
    check(
      "nutrition_preferences_avoided_count_check",
      sql`cardinality(${table.avoidedIngredients}) <= 20`,
    ),
  ],
);

export const insertNutritionPreferencesSchema = createInsertSchema(
  nutritionPreferencesTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertNutritionPreferences = z.infer<
  typeof insertNutritionPreferencesSchema
>;
export type NutritionPreferences =
  typeof nutritionPreferencesTable.$inferSelect;
