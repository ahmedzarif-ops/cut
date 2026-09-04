import { describe, expect, it } from "vitest";

import {
  CURATED_FOOD_CATALOG,
  CURATED_FOOD_CATALOG_VERSION,
  curatedFoodSupportsDiet,
  getCuratedFood,
  searchCuratedFoods,
} from "./foodCatalog";

describe("curated food catalog", () => {
  it("ships a substantial free, source-linked food library", () => {
    expect(CURATED_FOOD_CATALOG_VERSION).toBe("2026-09-04.1");
    expect(CURATED_FOOD_CATALOG).toHaveLength(35);
    expect(new Set(CURATED_FOOD_CATALOG.map(({ id }) => id)).size).toBe(35);

    for (const food of CURATED_FOOD_CATALOG) {
      expect(food.source).toBe("USDA FoodData Central");
      expect(food.sourceId).toBeGreaterThan(0);
      expect(food.servingGrams).toBeGreaterThan(0);
      expect(food.servingDescription).toBe(`${food.servingGrams} g`);
      expect(
        Object.values(food.nutritionPerServing).every(
          (value) => Number.isFinite(value) && value >= 0,
        ),
      ).toBe(true);
    }
  });

  it("finds Desi foods using English, Bengali, and Hindi/Urdu aliases", () => {
    expect(searchCuratedFoods("dal").map(({ id }) => id)).toContain(
      "lentils-cooked",
    );
    expect(searchCuratedFoods("bhaat").map(({ id }) => id)).toContain(
      "rice-white-cooked",
    );
    expect(searchCuratedFoods("palak").map(({ id }) => id)).toContain(
      "spinach-cooked",
    );
    expect(searchCuratedFoods("desi chicken").map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "chicken-breast-roasted",
        "chicken-breast-stewed",
      ]),
    );
  });

  it("returns the full library for an empty query", () => {
    expect(searchCuratedFoods(" ")).toHaveLength(35);
  });

  it("exposes explicit diet compatibility for bounded meal generation", () => {
    const chicken = getCuratedFood("chicken-breast-roasted")!;
    const salmon = getCuratedFood("salmon-cooked")!;
    const tofu = getCuratedFood("tofu-firm")!;
    expect(curatedFoodSupportsDiet(chicken, "omnivore")).toBe(true);
    expect(curatedFoodSupportsDiet(chicken, "pescatarian")).toBe(false);
    expect(curatedFoodSupportsDiet(salmon, "pescatarian")).toBe(true);
    expect(curatedFoodSupportsDiet(salmon, "vegetarian")).toBe(false);
    expect(curatedFoodSupportsDiet(tofu, "vegan")).toBe(true);
  });
});
