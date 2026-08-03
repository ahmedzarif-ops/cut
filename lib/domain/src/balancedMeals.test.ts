import { describe, expect, it } from "vitest";

import {
  BALANCED_MEAL_CATALOG,
  BALANCED_MEAL_CATALOG_VERSION,
  getBalancedMealTemplate,
  isCurrentBalancedMealCatalogVersion,
  rankBalancedMeals,
  scaleNutrition,
  scoreBalancedMeal,
  sumNutrition,
} from "./balancedMeals";

describe("balanced meal catalog", () => {
  it("ships six durable, unique options with Bengali and Desi choices", () => {
    expect(BALANCED_MEAL_CATALOG_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(
      isCurrentBalancedMealCatalogVersion(BALANCED_MEAL_CATALOG_VERSION),
    ).toBe(true);
    expect(isCurrentBalancedMealCatalogVersion("2026-08-02.9")).toBe(false);
    expect(BALANCED_MEAL_CATALOG).toHaveLength(6);
    expect(new Set(BALANCED_MEAL_CATALOG.map(({ id }) => id)).size).toBe(6);
    expect(BALANCED_MEAL_CATALOG.map(({ cuisine }) => cuisine)).toEqual(
      expect.arrayContaining(["Bengali", "Desi"]),
    );

    for (const template of BALANCED_MEAL_CATALOG) {
      expect(template.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(template.ingredients.length).toBeGreaterThan(2);
      expect(template.servingDescription.length).toBeGreaterThan(10);
      expect(
        Object.values(template.nutritionPerServing).every((n) => n > 0),
      ).toBe(true);
    }
  });

  it("looks up a template by stable ID", () => {
    expect(getBalancedMealTemplate("bengali-chicken-curry-plate")?.name).toBe(
      "Bengali Chicken Curry Plate",
    );
    expect(getBalancedMealTemplate("not-a-template")).toBeUndefined();
  });
});

describe("nutrition math", () => {
  const perServing = {
    caloriesKcal: 503,
    proteinG: 31.35,
    carbsG: 62.25,
    fatG: 14.45,
    fiberG: 8.15,
  };

  it("scales servings with deterministic calorie and tenth-gram rounding", () => {
    expect(scaleNutrition(perServing, 1.5)).toEqual({
      caloriesKcal: 755,
      proteinG: 47,
      carbsG: 93.4,
      fatG: 21.7,
      fiberG: 12.2,
    });
  });

  it("accepts the launch portion boundaries and rejects invalid portions", () => {
    expect(scaleNutrition(perServing, 0.25).caloriesKcal).toBe(126);
    expect(scaleNutrition(perServing, 4).caloriesKcal).toBe(2012);
    expect(() => scaleNutrition(perServing, 0.24)).toThrow(RangeError);
    expect(() => scaleNutrition(perServing, 4.01)).toThrow(RangeError);
    expect(() => scaleNutrition(perServing, Number.NaN)).toThrow(RangeError);
  });

  it("sums once and handles an empty day", () => {
    expect(
      sumNutrition([
        {
          caloriesKcal: 125.5,
          proteinG: 10.05,
          carbsG: 20.04,
          fatG: 3.05,
          fiberG: 2.05,
        },
        {
          caloriesKcal: 125.5,
          proteinG: 10.05,
          carbsG: 20.04,
          fatG: 3.05,
          fiberG: 2.05,
        },
      ]),
    ).toEqual({
      caloriesKcal: 251,
      proteinG: 20.1,
      carbsG: 40.1,
      fatG: 6.1,
      fiberG: 4.1,
    });
    expect(sumNutrition([])).toEqual({
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    });
  });
});

describe("balanced ranking", () => {
  it("returns the published score components and ranks deterministically", () => {
    const top = rankBalancedMeals()[0];
    expect(top).toBeDefined();
    expect(top!.score.total).toBe(
      top!.score.protein + top!.score.fiber + top!.score.calorieRange,
    );
    expect(top!.score).toEqual(scoreBalancedMeal(top!.template));
    expect(rankBalancedMeals().map(({ template }) => template.id)).toEqual(
      rankBalancedMeals().map(({ template }) => template.id),
    );
  });

  it("uses stable IDs to break otherwise identical scores", () => {
    const base = BALANCED_MEAL_CATALOG[0]!;
    const ranked = rankBalancedMeals([
      { ...base, id: "z-meal" },
      { ...base, id: "a-meal" },
    ]);
    expect(ranked.map(({ template }) => template.id)).toEqual([
      "a-meal",
      "z-meal",
    ]);
  });
});
