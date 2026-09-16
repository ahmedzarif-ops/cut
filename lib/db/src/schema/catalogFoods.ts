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

/**
 * Global, source-evidenced foods available to CUT users. This table contains
 * product content only; it never contains user identifiers or diary history.
 */
export const catalogFoodsTable = pgTable(
  "catalog_foods",
  {
    id: text("id").primaryKey(),
    catalogVersion: text("catalog_version").notNull(),
    accessTier: text("access_tier").notNull().default("free"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    servingDescription: text("serving_description").notNull(),
    servingGrams: doublePrecision("serving_grams").notNull(),
    cuisineTags: jsonb("cuisine_tags").$type<string[]>().notNull().default([]),
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
    source: text("source").notNull(),
    sourceId: integer("source_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("catalog_foods_active_tier_order_index").on(
      table.isActive,
      table.accessTier,
      table.sortOrder,
    ),
    check(
      "catalog_foods_access_tier_check",
      sql`${table.accessTier} IN ('free', 'pro')`,
    ),
    check("catalog_foods_sort_order_check", sql`${table.sortOrder} >= 0`),
    check(
      "catalog_foods_serving_positive_check",
      sql`${table.servingGrams} > 0`,
    ),
    check(
      "catalog_foods_nutrition_nonnegative_check",
      sql`${table.caloriesKcal} >= 0 AND ${table.proteinG} >= 0 AND ${table.carbsG} >= 0 AND ${table.fatG} >= 0 AND ${table.fiberG} >= 0`,
    ),
    check(
      "catalog_foods_nutrition_finite_check",
      sql`${table.servingGrams} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.caloriesKcal} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.proteinG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.carbsG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fatG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision) AND ${table.fiberG} NOT IN ('NaN'::double precision, 'Infinity'::double precision, '-Infinity'::double precision)`,
    ),
  ],
);

export const insertCatalogFoodSchema = createInsertSchema(
  catalogFoodsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertCatalogFood = z.infer<typeof insertCatalogFoodSchema>;
export type CatalogFood = typeof catalogFoodsTable.$inferSelect;
