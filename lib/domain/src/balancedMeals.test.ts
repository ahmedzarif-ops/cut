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
    expect(BALANCED_MEAL_CATALOG_VERSION).toBe("2026-08-03.2");
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

  it("matches the fixed recipe quantities and USDA-based calculation record", () => {
    expect(
      BALANCED_MEAL_CATALOG.map(
        ({
          id,
          servingDescription,
          ingredients,
          dietaryTags,
          commonAllergens,
          nutritionPerServing,
        }) => ({
          id,
          servingDescription,
          ingredients,
          dietaryTags,
          commonAllergens,
          nutritionPerServing,
        }),
      ),
    ).toEqual([
      {
        id: "bengali-chicken-curry-plate",
        servingDescription:
          "Entire recipe: 150 g chicken, 160 g rice, curry vegetables, spinach and cucumber",
        ingredients: [
          "150 g cooked stewed chicken breast",
          "160 g cooked long-grain white rice",
          "100 g cooked drained spinach",
          "100 g raw cucumber with peel",
          "100 g raw tomato",
          "50 g raw onion",
          "8 g olive oil",
          "5 g raw garlic",
          "5 g raw ginger",
          "1 g ground cumin seed",
          "1 g ground turmeric",
          "1 g iodized salt",
        ],
        dietaryTags: [],
        commonAllergens: [],
        nutritionPerServing: {
          caloriesKcal: 600,
          proteinG: 53.5,
          carbsG: 64.7,
          fatG: 13.9,
          fiberG: 6.1,
        },
      },
      {
        id: "desi-masoor-dal-egg-bowl",
        servingDescription:
          "Entire recipe: 180 g lentils, 100 g egg, 120 g brown rice, spinach and tomato",
        ingredients: [
          "180 g cooked drained red lentils",
          "100 g peeled hard-boiled egg",
          "120 g cooked long-grain brown rice",
          "75 g cooked drained spinach",
          "100 g raw tomato",
          "50 g raw onion",
          "5 g olive oil",
          "5 g raw garlic",
          "1 g ground cumin seed",
          "1 g ground turmeric",
          "1 g iodized salt",
        ],
        dietaryTags: ["vegetarian"],
        commonAllergens: ["egg"],
        nutritionPerServing: {
          caloriesKcal: 625,
          proteinG: 36.4,
          carbsG: 82.2,
          fatG: 18.2,
          fiberG: 20.4,
        },
      },
      {
        id: "lemon-herb-chicken-grain-bowl",
        servingDescription:
          "Entire recipe: 150 g chicken, 160 g quinoa, zucchini, pepper and lemon herbs",
        ingredients: [
          "150 g cooked roasted chicken breast",
          "160 g cooked quinoa",
          "120 g cooked drained zucchini",
          "100 g raw red bell pepper",
          "10 g olive oil",
          "30 g raw lemon juice",
          "5 g raw garlic",
          "10 g fresh parsley",
          "1 g iodized salt",
        ],
        dietaryTags: [],
        commonAllergens: [],
        nutritionPerServing: {
          caloriesKcal: 590,
          proteinG: 56.6,
          carbsG: 47.7,
          fatG: 19.3,
          fiberG: 8.3,
        },
      },
      {
        id: "salmon-sweet-potato-plate",
        servingDescription:
          "Entire recipe: 150 g salmon, 220 g sweet potato, broccoli and romaine",
        ingredients: [
          "150 g dry-heat cooked Atlantic salmon",
          "220 g baked sweet potato flesh",
          "150 g cooked drained broccoli",
          "75 g raw romaine lettuce",
          "5 g olive oil",
          "15 g raw lemon juice",
          "1 g iodized salt",
        ],
        dietaryTags: ["pescatarian"],
        commonAllergens: ["fish"],
        nutritionPerServing: {
          caloriesKcal: 620,
          proteinG: 42.1,
          carbsG: 59.8,
          fatG: 24.7,
          fiberG: 13.8,
        },
      },
      {
        id: "tofu-edamame-rice-bowl",
        servingDescription:
          "Entire recipe: 150 g tofu, 100 g edamame, 120 g brown rice and vegetables",
        ingredients: [
          "150 g firm calcium-set tofu",
          "100 g prepared edamame",
          "120 g cooked long-grain brown rice",
          "100 g cooked drained broccoli",
          "75 g raw red cabbage",
          "10 g whole dried sesame seeds",
          "5 g sesame oil",
          "5 g raw ginger",
          "1 g iodized salt",
        ],
        dietaryTags: ["vegan"],
        commonAllergens: ["soy", "sesame"],
        nutritionPerServing: {
          caloriesKcal: 648,
          proteinG: 46.4,
          carbsG: 59.7,
          fatG: 30,
          fiberG: 16.7,
        },
      },
      {
        id: "greek-yogurt-oat-berry-bowl",
        servingDescription:
          "Entire recipe: 250 g Greek yogurt, 40 g oats, berries, banana and chia",
        ingredients: [
          "250 g plain nonfat Greek yogurt",
          "40 g dry rolled oats",
          "80 g raw strawberries",
          "50 g raw blueberries",
          "80 g raw banana",
          "10 g dried chia seeds",
        ],
        dietaryTags: ["vegetarian"],
        commonAllergens: ["milk"],
        nutritionPerServing: {
          caloriesKcal: 473,
          proteinG: 34.2,
          carbsG: 72,
          fatG: 7.3,
          fiberG: 12.4,
        },
      },
    ]);
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
