import { describe, expect, it } from "vitest";

import type { NutritionFacts } from "./balancedMeals";
import {
  DIASPORA_MEAL_CATALOG,
  DIASPORA_MEAL_SOURCE_RECIPES,
} from "./diasporaMeals";
import { getCuratedFood } from "./foodCatalog";

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculateRecipe(
  ingredients: (typeof DIASPORA_MEAL_SOURCE_RECIPES)[number]["ingredients"],
): NutritionFacts {
  const total = ingredients.reduce<NutritionFacts>(
    (sum, ingredient) => {
      const food = getCuratedFood(ingredient.foodId);
      if (!food) throw new Error(`Missing food ${ingredient.foodId}`);
      const factor = ingredient.grams / food.servingGrams;
      return {
        caloriesKcal:
          sum.caloriesKcal + food.nutritionPerServing.caloriesKcal * factor,
        proteinG: sum.proteinG + food.nutritionPerServing.proteinG * factor,
        carbsG: sum.carbsG + food.nutritionPerServing.carbsG * factor,
        fatG: sum.fatG + food.nutritionPerServing.fatG * factor,
        fiberG: sum.fiberG + food.nutritionPerServing.fiberG * factor,
      };
    },
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
  return {
    caloriesKcal: round(total.caloriesKcal, 0),
    proteinG: round(total.proteinG, 1),
    carbsG: round(total.carbsG, 1),
    fatG: round(total.fatG, 1),
    fiberG: round(total.fiberG, 1),
  };
}

describe("Bengali and South Asian diaspora meal expansion", () => {
  it("ships seventy-one deliberate source recipes with stable unique IDs", () => {
    expect(DIASPORA_MEAL_SOURCE_RECIPES).toHaveLength(71);
    expect(DIASPORA_MEAL_CATALOG).toHaveLength(71);
    expect(new Set(DIASPORA_MEAL_SOURCE_RECIPES.map(({ id }) => id)).size).toBe(
      71,
    );
    expect(
      DIASPORA_MEAL_CATALOG.every(({ cuisine }) =>
        /bengali|bangladeshi|desi|south asian/iu.test(cuisine),
      ),
    ).toBe(true);
  });

  it("recalculates every meal only from source-linked food IDs and gram weights", () => {
    expect(DIASPORA_MEAL_CATALOG.map(({ id }) => id)).toEqual(
      DIASPORA_MEAL_SOURCE_RECIPES.map(({ id }) => id),
    );

    for (const [index, recipe] of DIASPORA_MEAL_SOURCE_RECIPES.entries()) {
      expect(recipe.ingredients.length).toBeGreaterThan(2);
      expect(
        recipe.ingredients.every(
          ({ foodId, grams }) =>
            Boolean(getCuratedFood(foodId)) &&
            Number.isFinite(grams) &&
            grams > 0 &&
            grams <= 500,
        ),
      ).toBe(true);
      expect(DIASPORA_MEAL_CATALOG[index]?.nutritionPerServing).toEqual(
        calculateRecipe(recipe.ingredients),
      );
    }
  });

  it("derives allergen and diet labels from the underlying foods", () => {
    expect(
      DIASPORA_MEAL_CATALOG.find(({ id }) => id === "chingri-lau-bhaat"),
    ).toMatchObject({
      dietaryTags: ["pescatarian"],
      commonAllergens: ["shellfish"],
    });
    expect(
      DIASPORA_MEAL_CATALOG.find(({ id }) => id === "palak-paneer-roti"),
    ).toMatchObject({
      dietaryTags: ["vegetarian"],
      commonAllergens: ["milk", "wheat"],
    });
    expect(
      DIASPORA_MEAL_CATALOG.find(({ id }) => id === "mung-shobji-khichuri"),
    ).toMatchObject({ dietaryTags: ["vegan"], commonAllergens: [] });
  });
});
