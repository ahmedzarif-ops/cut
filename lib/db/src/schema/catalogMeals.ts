import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Global reviewed meal templates. Personalized selections stay user-private. */
export const catalogMealsTable = pgTable(
  "catalog_meals",
  {
    id: text("id").primaryKey(),
    catalogVersion: text("catalog_version").notNull(),
    accessTier: text("access_tier").notNull().default("free"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    servingDescription: text("serving_description").notNull(),
    cuisine: text("cuisine").notNull(),
    ingredients: jsonb("ingredients").$type<string[]>().notNull().default([]),
    dietaryTags: jsonb("dietary_tags").$type<string[]>().notNull().default([]),
    commonAllergens: jsonb("common_allergens")
      .$type<string[]>()
      .notNull()
      .default([]),
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
    index("catalog_meals_active_tier_order_index").on(
      table.isActive,
      table.accessTier,
      table.sortOrder,
    ),
    check(
      "catalog_meals_access_tier_check",
      sql`${table.accessTier} IN ('free', 'pro')`,
    ),
    check("catalog_meals_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "catalog_meals_nutrition_nonnegative_check",
      sql`${table.caloriesKcal} >= 0 AND ${table.proteinG} >= 0 AND ${table.carbsG} >= 0 AND ${table.fatG} >= 0 AND ${table.fiberG} >= 0`,
    ),
    check(
      "catalog_meals_nutrition_finite_check",
      sql`${table.caloriesKcal} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.proteinG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.carbsG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fatG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fiberG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)`,
    ),
  ],
);

export const insertCatalogMealSchema = createInsertSchema(
  catalogMealsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertCatalogMeal = z.infer<typeof insertCatalogMealSchema>;
export type CatalogMeal = typeof catalogMealsTable.$inferSelect;
