import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalogFoodsTable, catalogMealsTable, type Db } from "@workspace/db";
import { BALANCED_MEAL_CATALOG, CURATED_FOOD_CATALOG } from "@workspace/domain";

import { createTestContext, type TestContext } from "../test/helpers";
import {
  getCatalogMeal,
  listCatalogFoods,
  listCatalogMeals,
  syncNutritionCatalog,
} from "./nutritionCatalogService";

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.close();
});

describe("database-backed nutrition catalog", () => {
  it("mirrors every reviewed launch food and meal as free content", async () => {
    const foods = await ctx.db.select().from(catalogFoodsTable);
    const meals = await ctx.db.select().from(catalogMealsTable);

    expect(foods).toHaveLength(CURATED_FOOD_CATALOG.length);
    expect(meals).toHaveLength(BALANCED_MEAL_CATALOG.length);
    expect(
      foods.every((item) => item.accessTier === "free" && item.isActive),
    ).toBe(true);
    expect(
      meals.every((item) => item.accessTier === "free" && item.isActive),
    ).toBe(true);
    expect(
      meals.filter((item) => /bengali|desi/iu.test(item.cuisine)),
    ).toHaveLength(11);
  });

  it("is idempotent and preserves deterministic database ordering", async () => {
    await syncNutritionCatalog(ctx.db as unknown as Db);
    await syncNutritionCatalog(ctx.db as unknown as Db);

    expect((await listCatalogFoods("free")).map((item) => item.id)).toEqual(
      CURATED_FOOD_CATALOG.map((item) => item.id),
    );
    expect((await listCatalogMeals("free")).map((item) => item.id)).toEqual(
      BALANCED_MEAL_CATALOG.map((item) => item.id),
    );
  });

  it("keeps free endpoints separate from future Pro-only catalog rows", async () => {
    await ctx.db.insert(catalogMealsTable).values({
      id: "future-pro-meal",
      catalogVersion: "future-test",
      accessTier: "pro",
      isActive: true,
      sortOrder: 999,
      name: "Future Pro meal",
      servingDescription: "1 plate",
      cuisine: "Test",
      ingredients: ["reviewed ingredient"],
      dietaryTags: [],
      commonAllergens: [],
      caloriesKcal: 500,
      proteinG: 40,
      carbsG: 50,
      fatG: 15,
      fiberG: 8,
    });

    expect(
      (await listCatalogMeals("free")).some(
        (meal) => meal.id === "future-pro-meal",
      ),
    ).toBe(false);
    expect(
      (await listCatalogMeals("all")).some(
        (meal) => meal.id === "future-pro-meal",
      ),
    ).toBe(true);
    expect(await getCatalogMeal("future-pro-meal")).toBeUndefined();
    expect((await getCatalogMeal("future-pro-meal", "all"))?.id).toBe(
      "future-pro-meal",
    );
  });
});
