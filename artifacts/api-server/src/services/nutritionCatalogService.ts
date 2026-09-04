import { and, asc, eq, sql } from "drizzle-orm";
import {
  catalogFoodsTable,
  catalogMealsTable,
  db,
  type CatalogFood,
  type CatalogMeal,
  type Db,
} from "@workspace/db";
import {
  BALANCED_MEAL_CATALOG,
  BALANCED_MEAL_CATALOG_VERSION,
  CURATED_FOOD_CATALOG,
  CURATED_FOOD_CATALOG_VERSION,
  type BalancedMealTemplate,
  type CuratedFoodItem,
} from "@workspace/domain";

export type CatalogAccess = "free" | "all";

/**
 * Mirror the reviewed source catalog into Postgres. Source remains the audit
 * record; the database becomes the runtime query layer. Removed IDs are kept
 * inactive so existing user snapshots and feedback never change meaning.
 */
export async function syncNutritionCatalog(database: Db = db): Promise<void> {
  await database.transaction(async (tx) => {
    await tx.update(catalogFoodsTable).set({ isActive: false });
    await tx.update(catalogMealsTable).set({ isActive: false });

    if (CURATED_FOOD_CATALOG.length > 0) {
      await tx
        .insert(catalogFoodsTable)
        .values(
          CURATED_FOOD_CATALOG.map((food, sortOrder) => ({
            id: food.id,
            catalogVersion: CURATED_FOOD_CATALOG_VERSION,
            accessTier: "free",
            isActive: true,
            sortOrder,
            name: food.name,
            aliases: [...food.aliases],
            servingDescription: food.servingDescription,
            servingGrams: food.servingGrams,
            cuisineTags: [...food.cuisineTags],
            dietaryTags: [...food.dietaryTags],
            commonAllergens: [...food.commonAllergens],
            caloriesKcal: food.nutritionPerServing.caloriesKcal,
            proteinG: food.nutritionPerServing.proteinG,
            carbsG: food.nutritionPerServing.carbsG,
            fatG: food.nutritionPerServing.fatG,
            fiberG: food.nutritionPerServing.fiberG,
            source: food.source,
            sourceId: food.sourceId,
          })),
        )
        .onConflictDoUpdate({
          target: catalogFoodsTable.id,
          set: {
            catalogVersion: sql`excluded.catalog_version`,
            accessTier: sql`excluded.access_tier`,
            isActive: true,
            sortOrder: sql`excluded.sort_order`,
            name: sql`excluded.name`,
            aliases: sql`excluded.aliases`,
            servingDescription: sql`excluded.serving_description`,
            servingGrams: sql`excluded.serving_grams`,
            cuisineTags: sql`excluded.cuisine_tags`,
            dietaryTags: sql`excluded.dietary_tags`,
            commonAllergens: sql`excluded.common_allergens`,
            caloriesKcal: sql`excluded.calories_kcal`,
            proteinG: sql`excluded.protein_g`,
            carbsG: sql`excluded.carbs_g`,
            fatG: sql`excluded.fat_g`,
            fiberG: sql`excluded.fiber_g`,
            source: sql`excluded.source`,
            sourceId: sql`excluded.source_id`,
            updatedAt: sql`now()`,
          },
        });
    }

    if (BALANCED_MEAL_CATALOG.length > 0) {
      await tx
        .insert(catalogMealsTable)
        .values(
          BALANCED_MEAL_CATALOG.map((meal, sortOrder) => ({
            id: meal.id,
            catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
            accessTier: "free",
            isActive: true,
            sortOrder,
            name: meal.name,
            servingDescription: meal.servingDescription,
            cuisine: meal.cuisine,
            ingredients: [...meal.ingredients],
            dietaryTags: [...meal.dietaryTags],
            commonAllergens: [...meal.commonAllergens],
            caloriesKcal: meal.nutritionPerServing.caloriesKcal,
            proteinG: meal.nutritionPerServing.proteinG,
            carbsG: meal.nutritionPerServing.carbsG,
            fatG: meal.nutritionPerServing.fatG,
            fiberG: meal.nutritionPerServing.fiberG,
          })),
        )
        .onConflictDoUpdate({
          target: catalogMealsTable.id,
          set: {
            catalogVersion: sql`excluded.catalog_version`,
            accessTier: sql`excluded.access_tier`,
            isActive: true,
            sortOrder: sql`excluded.sort_order`,
            name: sql`excluded.name`,
            servingDescription: sql`excluded.serving_description`,
            cuisine: sql`excluded.cuisine`,
            ingredients: sql`excluded.ingredients`,
            dietaryTags: sql`excluded.dietary_tags`,
            commonAllergens: sql`excluded.common_allergens`,
            caloriesKcal: sql`excluded.calories_kcal`,
            proteinG: sql`excluded.protein_g`,
            carbsG: sql`excluded.carbs_g`,
            fatG: sql`excluded.fat_g`,
            fiberG: sql`excluded.fiber_g`,
            updatedAt: sql`now()`,
          },
        });
    }
  });
}

export function catalogFoodToDomain(row: CatalogFood): CuratedFoodItem {
  return {
    id: row.id,
    name: row.name,
    aliases: row.aliases,
    servingDescription: row.servingDescription,
    servingGrams: row.servingGrams,
    cuisineTags: row.cuisineTags,
    dietaryTags: row.dietaryTags as CuratedFoodItem["dietaryTags"],
    commonAllergens: row.commonAllergens as CuratedFoodItem["commonAllergens"],
    nutritionPerServing: {
      caloriesKcal: row.caloriesKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
    },
    source: row.source as CuratedFoodItem["source"],
    sourceId: row.sourceId,
  };
}

export function catalogMealToDomain(row: CatalogMeal): BalancedMealTemplate {
  return {
    id: row.id,
    name: row.name,
    servingDescription: row.servingDescription,
    cuisine: row.cuisine,
    ingredients: row.ingredients,
    dietaryTags: row.dietaryTags,
    commonAllergens:
      row.commonAllergens as BalancedMealTemplate["commonAllergens"],
    nutritionPerServing: {
      caloriesKcal: row.caloriesKcal,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fiberG: row.fiberG,
    },
  };
}

export async function listCatalogFoods(
  access: CatalogAccess = "free",
): Promise<CuratedFoodItem[]> {
  const where =
    access === "free"
      ? and(
          eq(catalogFoodsTable.isActive, true),
          eq(catalogFoodsTable.accessTier, "free"),
        )
      : eq(catalogFoodsTable.isActive, true);
  const rows = await db
    .select()
    .from(catalogFoodsTable)
    .where(where)
    .orderBy(asc(catalogFoodsTable.sortOrder), asc(catalogFoodsTable.id));
  return rows.map(catalogFoodToDomain);
}

export async function listCatalogMeals(
  access: CatalogAccess = "free",
): Promise<BalancedMealTemplate[]> {
  const where =
    access === "free"
      ? and(
          eq(catalogMealsTable.isActive, true),
          eq(catalogMealsTable.accessTier, "free"),
        )
      : eq(catalogMealsTable.isActive, true);
  const rows = await db
    .select()
    .from(catalogMealsTable)
    .where(where)
    .orderBy(asc(catalogMealsTable.sortOrder), asc(catalogMealsTable.id));
  return rows.map(catalogMealToDomain);
}

export async function getCatalogFood(
  foodId: string,
  access: CatalogAccess = "free",
): Promise<CuratedFoodItem | undefined> {
  const where = and(
    eq(catalogFoodsTable.id, foodId),
    eq(catalogFoodsTable.isActive, true),
    access === "free" ? eq(catalogFoodsTable.accessTier, "free") : undefined,
  );
  const [row] = await db.select().from(catalogFoodsTable).where(where);
  return row ? catalogFoodToDomain(row) : undefined;
}

export async function getCatalogMeal(
  mealId: string,
  access: CatalogAccess = "free",
): Promise<BalancedMealTemplate | undefined> {
  const where = and(
    eq(catalogMealsTable.id, mealId),
    eq(catalogMealsTable.isActive, true),
    access === "free" ? eq(catalogMealsTable.accessTier, "free") : undefined,
  );
  const [row] = await db.select().from(catalogMealsTable).where(where);
  return row ? catalogMealToDomain(row) : undefined;
}
