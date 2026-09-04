import { describe, expect, it } from "vitest";

import {
  BALANCED_MEAL_CATALOG,
  getBalancedMealTemplate,
  type NutritionFacts,
} from "./balancedMeals";

/**
 * USDA FoodData Central values per 100 g retrieved August 3, 2026. Exact FDC
 * record links, food descriptions, recipe methods, and review limitations live
 * in NUTRITION_CATALOG_EVIDENCE.md. Salt record 746775 lists none of these five
 * nutrients, so it contributes zero to this five-field calculation.
 */
const FDC_PER_100_G: Readonly<Record<number, NutritionFacts>> = {
  167747: {
    caloriesKcal: 22,
    proteinG: 0.35,
    carbsG: 6.9,
    fatG: 0.24,
    fiberG: 0.3,
  },
  167762: {
    caloriesKcal: 32,
    proteinG: 0.67,
    carbsG: 7.68,
    fatG: 0.3,
    fiberG: 2,
  },
  168409: {
    caloriesKcal: 15,
    proteinG: 0.65,
    carbsG: 3.63,
    fatG: 0.11,
    fiberG: 0.5,
  },
  168411: {
    caloriesKcal: 121,
    proteinG: 11.91,
    carbsG: 8.91,
    fatG: 5.2,
    fiberG: 5.2,
  },
  168463: {
    caloriesKcal: 23,
    proteinG: 2.97,
    carbsG: 3.75,
    fatG: 0.26,
    fiberG: 2.4,
  },
  168483: {
    caloriesKcal: 90,
    proteinG: 2.01,
    carbsG: 20.71,
    fatG: 0.15,
    fiberG: 3.3,
  },
  168878: {
    caloriesKcal: 130,
    proteinG: 2.69,
    carbsG: 28.17,
    fatG: 0.28,
    fiberG: 0.4,
  },
  168917: {
    caloriesKcal: 120,
    proteinG: 4.4,
    carbsG: 21.3,
    fatG: 1.92,
    fiberG: 2.8,
  },
  169230: {
    caloriesKcal: 149,
    proteinG: 6.36,
    carbsG: 33.06,
    fatG: 0.5,
    fiberG: 2.1,
  },
  169231: {
    caloriesKcal: 80,
    proteinG: 1.82,
    carbsG: 17.77,
    fatG: 0.75,
    fiberG: 2,
  },
  169247: {
    caloriesKcal: 17,
    proteinG: 1.23,
    carbsG: 3.29,
    fatG: 0.3,
    fiberG: 2.1,
  },
  169292: {
    caloriesKcal: 15,
    proteinG: 1.14,
    carbsG: 2.69,
    fatG: 0.36,
    fiberG: 1,
  },
  169704: {
    caloriesKcal: 123,
    proteinG: 2.74,
    carbsG: 25.58,
    fatG: 0.97,
    fiberG: 1.6,
  },
  169967: {
    caloriesKcal: 35,
    proteinG: 2.38,
    carbsG: 7.18,
    fatG: 0.41,
    fiberG: 3.3,
  },
  169977: {
    caloriesKcal: 31,
    proteinG: 1.43,
    carbsG: 7.37,
    fatG: 0.16,
    fiberG: 2.1,
  },
  170000: {
    caloriesKcal: 40,
    proteinG: 1.1,
    carbsG: 9.34,
    fatG: 0.1,
    fiberG: 1.7,
  },
  170108: {
    caloriesKcal: 26,
    proteinG: 0.99,
    carbsG: 6.03,
    fatG: 0.3,
    fiberG: 2.1,
  },
  170150: {
    caloriesKcal: 573,
    proteinG: 17.73,
    carbsG: 23.45,
    fatG: 49.67,
    fiberG: 11.8,
  },
  170416: {
    caloriesKcal: 36,
    proteinG: 2.97,
    carbsG: 6.33,
    fatG: 0.79,
    fiberG: 3.3,
  },
  170457: {
    caloriesKcal: 18,
    proteinG: 0.88,
    carbsG: 3.89,
    fatG: 0.2,
    fiberG: 1.2,
  },
  170554: {
    caloriesKcal: 486,
    proteinG: 16.54,
    carbsG: 42.12,
    fatG: 30.74,
    fiberG: 34.4,
  },
  170894: {
    caloriesKcal: 59,
    proteinG: 10.19,
    carbsG: 3.6,
    fatG: 0.39,
    fiberG: 0,
  },
  170923: {
    caloriesKcal: 375,
    proteinG: 17.81,
    carbsG: 44.24,
    fatG: 22.27,
    fiberG: 10.5,
  },
  171016: { caloriesKcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fiberG: 0 },
  171413: { caloriesKcal: 884, proteinG: 0, carbsG: 0, fatG: 100, fiberG: 0 },
  171477: {
    caloriesKcal: 165,
    proteinG: 31.02,
    carbsG: 0,
    fatG: 3.57,
    fiberG: 0,
  },
  171478: {
    caloriesKcal: 151,
    proteinG: 28.98,
    carbsG: 0,
    fatG: 3.03,
    fiberG: 0,
  },
  171711: {
    caloriesKcal: 57,
    proteinG: 0.74,
    carbsG: 14.49,
    fatG: 0.33,
    fiberG: 2.4,
  },
  172231: {
    caloriesKcal: 312,
    proteinG: 9.68,
    carbsG: 67.14,
    fatG: 3.25,
    fiberG: 22.7,
  },
  172421: {
    caloriesKcal: 116,
    proteinG: 9.02,
    carbsG: 20.13,
    fatG: 0.38,
    fiberG: 7.9,
  },
  172475: {
    caloriesKcal: 144,
    proteinG: 17.27,
    carbsG: 2.78,
    fatG: 8.72,
    fiberG: 2.3,
  },
  173424: {
    caloriesKcal: 155,
    proteinG: 12.58,
    carbsG: 1.12,
    fatG: 10.61,
    fiberG: 0,
  },
  173904: {
    caloriesKcal: 379,
    proteinG: 13.15,
    carbsG: 67.7,
    fatG: 6.52,
    fiberG: 10.1,
  },
  173944: {
    caloriesKcal: 89,
    proteinG: 1.09,
    carbsG: 22.84,
    fatG: 0.33,
    fiberG: 2.6,
  },
  175168: {
    caloriesKcal: 206,
    proteinG: 22.1,
    carbsG: 0,
    fatG: 12.35,
    fiberG: 0,
  },
  746775: { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
};

const RECIPE_GRAMS = {
  "bengali-chicken-curry-plate": [
    [171478, 150],
    [168878, 160],
    [168463, 100],
    [168409, 100],
    [170457, 100],
    [170000, 50],
    [171413, 8],
    [169230, 5],
    [169231, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "desi-masoor-dal-egg-bowl": [
    [172421, 180],
    [173424, 100],
    [169704, 120],
    [168463, 75],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169230, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "lemon-herb-chicken-grain-bowl": [
    [171477, 150],
    [168917, 160],
    [169292, 120],
    [170108, 100],
    [171413, 10],
    [167747, 30],
    [169230, 5],
    [170416, 10],
    [746775, 1],
  ],
  "salmon-sweet-potato-plate": [
    [175168, 150],
    [168483, 220],
    [169967, 150],
    [169247, 75],
    [171413, 5],
    [167747, 15],
    [746775, 1],
  ],
  "tofu-edamame-rice-bowl": [
    [172475, 150],
    [168411, 100],
    [169704, 120],
    [169967, 100],
    [169977, 75],
    [170150, 10],
    [171016, 5],
    [169231, 5],
    [746775, 1],
  ],
  "greek-yogurt-oat-berry-bowl": [
    [170894, 250],
    [173904, 40],
    [167762, 80],
    [171711, 50],
    [173944, 80],
    [170554, 10],
  ],
  "desi-chicken-masoor-rice-bowl": [
    [171477, 150],
    [172421, 150],
    [168878, 100],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169230, 5],
    [169231, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "desi-chicken-quinoa-sabzi-bowl": [
    [171477, 150],
    [168917, 140],
    [168463, 100],
    [169292, 100],
    [170457, 100],
    [171413, 5],
    [169230, 5],
    [169231, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "egg-masoor-spinach-plate": [
    [173424, 150],
    [172421, 200],
    [168463, 100],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169230, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "bengali-salmon-rice-spinach": [
    [175168, 140],
    [168878, 140],
    [168463, 100],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169231, 5],
    [172231, 1],
    [746775, 1],
  ],
  "desi-tofu-masoor-bowl": [
    [172475, 150],
    [172421, 180],
    [168463, 75],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169230, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "chicken-sweet-potato-masala-plate": [
    [171477, 150],
    [168483, 220],
    [169967, 120],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169230, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "masoor-brown-rice-sabzi-bowl": [
    [172421, 220],
    [169704, 100],
    [168463, 100],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [169230, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "yogurt-oat-banana-bowl": [
    [170894, 250],
    [173904, 50],
    [173944, 100],
    [170554, 10],
  ],
  "chicken-rice-kachumber-bowl": [
    [171477, 150],
    [169704, 140],
    [168409, 120],
    [170457, 100],
    [169247, 75],
    [167747, 20],
    [171413, 5],
    [746775, 1],
  ],
  "egg-quinoa-spinach-bowl": [
    [173424, 150],
    [168917, 150],
    [168463, 100],
    [170457, 100],
    [170000, 50],
    [171413, 5],
    [170923, 1],
    [172231, 1],
    [746775, 1],
  ],
  "salmon-quinoa-vegetable-bowl": [
    [175168, 140],
    [168917, 150],
    [169967, 120],
    [170108, 100],
    [167747, 20],
    [171413, 5],
    [746775, 1],
  ],
  "tofu-edamame-quinoa-bowl": [
    [172475, 150],
    [168411, 100],
    [168917, 140],
    [169967, 100],
    [169977, 75],
    [171016, 5],
    [169231, 5],
    [746775, 1],
  ],
} as const;

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function calculateRecipe(
  inputs: ReadonlyArray<readonly [number, number]>,
): NutritionFacts {
  const raw = inputs.reduce<NutritionFacts>(
    (total, [fdcId, grams]) => {
      const source = FDC_PER_100_G[fdcId];
      if (!source) throw new Error(`Missing FDC source ${fdcId}`);
      const factor = grams / 100;
      return {
        caloriesKcal: total.caloriesKcal + source.caloriesKcal * factor,
        proteinG: total.proteinG + source.proteinG * factor,
        carbsG: total.carbsG + source.carbsG * factor,
        fatG: total.fatG + source.fatG * factor,
        fiberG: total.fiberG + source.fiberG * factor,
      };
    },
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );

  return {
    caloriesKcal: round(raw.caloriesKcal, 0),
    proteinG: round(raw.proteinG, 1),
    carbsG: round(raw.carbsG, 1),
    fatG: round(raw.fatG, 1),
    fiberG: round(raw.fiberG, 1),
  };
}

describe("balanced meal nutrition evidence", () => {
  it("keeps the original eighteen estimates reproducible from frozen FDC inputs", () => {
    expect(Object.keys(RECIPE_GRAMS).sort()).toEqual(
      BALANCED_MEAL_CATALOG.slice(0, 18)
        .map(({ id }) => id)
        .sort(),
    );
    for (const [templateId, inputs] of Object.entries(RECIPE_GRAMS)) {
      expect(getBalancedMealTemplate(templateId)?.nutritionPerServing).toEqual(
        calculateRecipe(inputs),
      );
    }
  });
});
