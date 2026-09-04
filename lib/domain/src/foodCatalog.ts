import type { CommonAllergen, NutritionFacts } from "./balancedMeals";

/**
 * Versioned, source-linked foods that remain available to every CUT OS user.
 * Values come from the USDA FoodData Central records already frozen in
 * NUTRITION_CATALOG_EVIDENCE.md. Packaged-food barcode results and user-created
 * foods are separate catalogs because their source and confidence differ.
 */
export const CURATED_FOOD_CATALOG_VERSION = "2026-09-04.1";

export interface CuratedFoodItem {
  id: string;
  name: string;
  aliases: readonly string[];
  servingDescription: string;
  servingGrams: number;
  cuisineTags: readonly string[];
  dietaryTags: readonly CuratedFoodDietaryTag[];
  commonAllergens: readonly CommonAllergen[];
  nutritionPerServing: NutritionFacts;
  source: "USDA FoodData Central";
  sourceId: number;
}

export type CuratedFoodDietaryTag = "vegetarian" | "vegan" | "pescatarian";

interface CuratedFoodSeed {
  id: string;
  name: string;
  aliases?: readonly string[];
  servingGrams: number;
  cuisineTags?: readonly string[];
  commonAllergens?: readonly CommonAllergen[];
  sourceId: number;
  per100g: NutritionFacts;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function nutritionForGrams(
  nutrition: NutritionFacts,
  grams: number,
): NutritionFacts {
  const factor = grams / 100;
  return {
    caloriesKcal: round(nutrition.caloriesKcal * factor, 0),
    proteinG: round(nutrition.proteinG * factor, 1),
    carbsG: round(nutrition.carbsG * factor, 1),
    fatG: round(nutrition.fatG * factor, 1),
    fiberG: round(nutrition.fiberG * factor, 1),
  };
}

const ANIMAL_FOOD_DIETARY_TAGS: Readonly<
  Record<string, readonly CuratedFoodDietaryTag[]>
> = Object.freeze({
  "chicken-breast-roasted": [],
  "chicken-breast-stewed": [],
  "egg-hard-boiled": ["vegetarian"],
  "greek-yogurt-nonfat": ["vegetarian"],
  "salmon-cooked": ["pescatarian"],
});

function dietaryTagsForFood(id: string): readonly CuratedFoodDietaryTag[] {
  return ANIMAL_FOOD_DIETARY_TAGS[id] ?? ["vegan"];
}

const SEEDS: readonly CuratedFoodSeed[] = [
  {
    id: "chicken-breast-roasted",
    name: "Chicken breast, roasted",
    aliases: ["murgi", "chicken"],
    servingGrams: 150,
    cuisineTags: ["desi"],
    sourceId: 171477,
    per100g: {
      caloriesKcal: 165,
      proteinG: 31.02,
      carbsG: 0,
      fatG: 3.57,
      fiberG: 0,
    },
  },
  {
    id: "chicken-breast-stewed",
    name: "Chicken breast, stewed",
    aliases: ["chicken curry", "murgir mangsho"],
    servingGrams: 150,
    cuisineTags: ["bengali", "desi"],
    sourceId: 171478,
    per100g: {
      caloriesKcal: 151,
      proteinG: 28.98,
      carbsG: 0,
      fatG: 3.03,
      fiberG: 0,
    },
  },
  {
    id: "lentils-cooked",
    name: "Lentils, cooked",
    aliases: ["dal", "daal", "masoor dal", "mosur dal"],
    servingGrams: 180,
    cuisineTags: ["bengali", "desi"],
    sourceId: 172421,
    per100g: {
      caloriesKcal: 116,
      proteinG: 9.02,
      carbsG: 20.13,
      fatG: 0.38,
      fiberG: 7.9,
    },
  },
  {
    id: "rice-white-cooked",
    name: "White rice, cooked",
    aliases: ["bhaat", "basmati rice", "chawal"],
    servingGrams: 150,
    cuisineTags: ["bengali", "desi"],
    sourceId: 168878,
    per100g: {
      caloriesKcal: 130,
      proteinG: 2.69,
      carbsG: 28.17,
      fatG: 0.28,
      fiberG: 0.4,
    },
  },
  {
    id: "rice-brown-cooked",
    name: "Brown rice, cooked",
    aliases: ["brown basmati", "chawal"],
    servingGrams: 150,
    cuisineTags: ["desi"],
    sourceId: 169704,
    per100g: {
      caloriesKcal: 123,
      proteinG: 2.74,
      carbsG: 25.58,
      fatG: 0.97,
      fiberG: 1.6,
    },
  },
  {
    id: "egg-hard-boiled",
    name: "Egg, hard-boiled",
    aliases: ["dim", "anda", "boiled egg"],
    servingGrams: 100,
    cuisineTags: ["bengali", "desi"],
    commonAllergens: ["egg"],
    sourceId: 173424,
    per100g: {
      caloriesKcal: 155,
      proteinG: 12.58,
      carbsG: 1.12,
      fatG: 10.61,
      fiberG: 0,
    },
  },
  {
    id: "salmon-cooked",
    name: "Atlantic salmon, cooked",
    aliases: ["salmon fish", "mach"],
    servingGrams: 150,
    commonAllergens: ["fish"],
    sourceId: 175168,
    per100g: {
      caloriesKcal: 206,
      proteinG: 22.1,
      carbsG: 0,
      fatG: 12.35,
      fiberG: 0,
    },
  },
  {
    id: "tofu-firm",
    name: "Firm tofu",
    aliases: ["bean curd"],
    servingGrams: 150,
    commonAllergens: ["soy"],
    sourceId: 172475,
    per100g: {
      caloriesKcal: 144,
      proteinG: 17.27,
      carbsG: 2.78,
      fatG: 8.72,
      fiberG: 2.3,
    },
  },
  {
    id: "edamame-prepared",
    name: "Edamame, prepared",
    aliases: ["soy beans"],
    servingGrams: 100,
    commonAllergens: ["soy"],
    sourceId: 168411,
    per100g: {
      caloriesKcal: 121,
      proteinG: 11.91,
      carbsG: 8.91,
      fatG: 5.2,
      fiberG: 5.2,
    },
  },
  {
    id: "greek-yogurt-nonfat",
    name: "Plain nonfat Greek yogurt",
    aliases: ["yogurt", "dahi-style yogurt"],
    servingGrams: 200,
    cuisineTags: ["desi"],
    commonAllergens: ["milk"],
    sourceId: 170894,
    per100g: {
      caloriesKcal: 59,
      proteinG: 10.19,
      carbsG: 3.6,
      fatG: 0.39,
      fiberG: 0,
    },
  },
  {
    id: "oats-dry",
    name: "Rolled oats, dry",
    aliases: ["oatmeal"],
    servingGrams: 40,
    sourceId: 173904,
    per100g: {
      caloriesKcal: 379,
      proteinG: 13.15,
      carbsG: 67.7,
      fatG: 6.52,
      fiberG: 10.1,
    },
  },
  {
    id: "quinoa-cooked",
    name: "Quinoa, cooked",
    aliases: ["quinoa grain"],
    servingGrams: 150,
    sourceId: 168917,
    per100g: {
      caloriesKcal: 120,
      proteinG: 4.4,
      carbsG: 21.3,
      fatG: 1.92,
      fiberG: 2.8,
    },
  },
  {
    id: "sweet-potato-baked",
    name: "Sweet potato, baked",
    aliases: ["mishti alu", "shakarkandi"],
    servingGrams: 200,
    cuisineTags: ["bengali", "desi"],
    sourceId: 168483,
    per100g: {
      caloriesKcal: 90,
      proteinG: 2.01,
      carbsG: 20.71,
      fatG: 0.15,
      fiberG: 3.3,
    },
  },
  {
    id: "spinach-cooked",
    name: "Spinach, cooked",
    aliases: ["palong shaak", "palak", "saag"],
    servingGrams: 100,
    cuisineTags: ["bengali", "desi"],
    sourceId: 168463,
    per100g: {
      caloriesKcal: 23,
      proteinG: 2.97,
      carbsG: 3.75,
      fatG: 0.26,
      fiberG: 2.4,
    },
  },
  {
    id: "broccoli-cooked",
    name: "Broccoli, cooked",
    aliases: ["broccoli florets"],
    servingGrams: 100,
    sourceId: 169967,
    per100g: {
      caloriesKcal: 35,
      proteinG: 2.38,
      carbsG: 7.18,
      fatG: 0.41,
      fiberG: 3.3,
    },
  },
  {
    id: "zucchini-cooked",
    name: "Zucchini, cooked",
    aliases: ["summer squash"],
    servingGrams: 100,
    sourceId: 169292,
    per100g: {
      caloriesKcal: 15,
      proteinG: 1.14,
      carbsG: 2.69,
      fatG: 0.36,
      fiberG: 1,
    },
  },
  {
    id: "cucumber-raw",
    name: "Cucumber, raw",
    aliases: ["shosha", "kheera", "cucumber salad"],
    servingGrams: 100,
    cuisineTags: ["bengali", "desi"],
    sourceId: 168409,
    per100g: {
      caloriesKcal: 15,
      proteinG: 0.65,
      carbsG: 3.63,
      fatG: 0.11,
      fiberG: 0.5,
    },
  },
  {
    id: "tomato-raw",
    name: "Tomato, raw",
    aliases: ["tomato salad", "tamatar"],
    servingGrams: 100,
    cuisineTags: ["desi"],
    sourceId: 170457,
    per100g: {
      caloriesKcal: 18,
      proteinG: 0.88,
      carbsG: 3.89,
      fatG: 0.2,
      fiberG: 1.2,
    },
  },
  {
    id: "onion-raw",
    name: "Onion, raw",
    aliases: ["peyaj", "pyaaz"],
    servingGrams: 100,
    cuisineTags: ["bengali", "desi"],
    sourceId: 170000,
    per100g: {
      caloriesKcal: 40,
      proteinG: 1.1,
      carbsG: 9.34,
      fatG: 0.1,
      fiberG: 1.7,
    },
  },
  {
    id: "red-pepper-raw",
    name: "Red bell pepper, raw",
    aliases: ["capsicum", "sweet pepper"],
    servingGrams: 100,
    sourceId: 170108,
    per100g: {
      caloriesKcal: 26,
      proteinG: 0.99,
      carbsG: 6.03,
      fatG: 0.3,
      fiberG: 2.1,
    },
  },
  {
    id: "red-cabbage-raw",
    name: "Red cabbage, raw",
    aliases: ["cabbage salad"],
    servingGrams: 100,
    sourceId: 169977,
    per100g: {
      caloriesKcal: 31,
      proteinG: 1.43,
      carbsG: 7.37,
      fatG: 0.16,
      fiberG: 2.1,
    },
  },
  {
    id: "romaine-raw",
    name: "Romaine lettuce, raw",
    aliases: ["lettuce", "salad greens"],
    servingGrams: 100,
    sourceId: 169247,
    per100g: {
      caloriesKcal: 17,
      proteinG: 1.23,
      carbsG: 3.29,
      fatG: 0.3,
      fiberG: 2.1,
    },
  },
  {
    id: "strawberries-raw",
    name: "Strawberries, raw",
    aliases: ["strawberry"],
    servingGrams: 100,
    sourceId: 167762,
    per100g: {
      caloriesKcal: 32,
      proteinG: 0.67,
      carbsG: 7.68,
      fatG: 0.3,
      fiberG: 2,
    },
  },
  {
    id: "blueberries-raw",
    name: "Blueberries, raw",
    aliases: ["blueberry"],
    servingGrams: 100,
    sourceId: 171711,
    per100g: {
      caloriesKcal: 57,
      proteinG: 0.74,
      carbsG: 14.49,
      fatG: 0.33,
      fiberG: 2.4,
    },
  },
  {
    id: "banana-raw",
    name: "Banana, raw",
    aliases: ["kola", "banana fruit"],
    servingGrams: 100,
    cuisineTags: ["bengali", "desi"],
    sourceId: 173944,
    per100g: {
      caloriesKcal: 89,
      proteinG: 1.09,
      carbsG: 22.84,
      fatG: 0.33,
      fiberG: 2.6,
    },
  },
  {
    id: "chia-seeds",
    name: "Chia seeds",
    aliases: ["chia"],
    servingGrams: 10,
    sourceId: 170554,
    per100g: {
      caloriesKcal: 486,
      proteinG: 16.54,
      carbsG: 42.12,
      fatG: 30.74,
      fiberG: 34.4,
    },
  },
  {
    id: "sesame-seeds",
    name: "Sesame seeds",
    aliases: ["til", "sesame"],
    servingGrams: 10,
    cuisineTags: ["desi"],
    commonAllergens: ["sesame"],
    sourceId: 170150,
    per100g: {
      caloriesKcal: 573,
      proteinG: 17.73,
      carbsG: 23.45,
      fatG: 49.67,
      fiberG: 11.8,
    },
  },
  {
    id: "olive-oil",
    name: "Olive oil",
    aliases: ["cooking oil"],
    servingGrams: 5,
    sourceId: 171413,
    per100g: {
      caloriesKcal: 884,
      proteinG: 0,
      carbsG: 0,
      fatG: 100,
      fiberG: 0,
    },
  },
  {
    id: "sesame-oil",
    name: "Sesame oil",
    aliases: ["til oil"],
    servingGrams: 5,
    commonAllergens: ["sesame"],
    sourceId: 171016,
    per100g: {
      caloriesKcal: 884,
      proteinG: 0,
      carbsG: 0,
      fatG: 100,
      fiberG: 0,
    },
  },
  {
    id: "lemon-juice",
    name: "Lemon juice",
    aliases: ["lebu", "nimbu juice"],
    servingGrams: 30,
    cuisineTags: ["bengali", "desi"],
    sourceId: 167747,
    per100g: {
      caloriesKcal: 22,
      proteinG: 0.35,
      carbsG: 6.9,
      fatG: 0.24,
      fiberG: 0.3,
    },
  },
  {
    id: "garlic-raw",
    name: "Garlic, raw",
    aliases: ["roshun", "lahsun"],
    servingGrams: 5,
    cuisineTags: ["bengali", "desi"],
    sourceId: 169230,
    per100g: {
      caloriesKcal: 149,
      proteinG: 6.36,
      carbsG: 33.06,
      fatG: 0.5,
      fiberG: 2.1,
    },
  },
  {
    id: "ginger-raw",
    name: "Ginger, raw",
    aliases: ["ada", "adrak"],
    servingGrams: 5,
    cuisineTags: ["bengali", "desi"],
    sourceId: 169231,
    per100g: {
      caloriesKcal: 80,
      proteinG: 1.82,
      carbsG: 17.77,
      fatG: 0.75,
      fiberG: 2,
    },
  },
  {
    id: "parsley-fresh",
    name: "Parsley, fresh",
    aliases: ["parsley herb"],
    servingGrams: 10,
    sourceId: 170416,
    per100g: {
      caloriesKcal: 36,
      proteinG: 2.97,
      carbsG: 6.33,
      fatG: 0.79,
      fiberG: 3.3,
    },
  },
  {
    id: "cumin-ground",
    name: "Cumin, ground",
    aliases: ["jeera", "jira"],
    servingGrams: 1,
    cuisineTags: ["bengali", "desi"],
    sourceId: 170923,
    per100g: {
      caloriesKcal: 375,
      proteinG: 17.81,
      carbsG: 44.24,
      fatG: 22.27,
      fiberG: 10.5,
    },
  },
  {
    id: "turmeric-ground",
    name: "Turmeric, ground",
    aliases: ["holud", "haldi"],
    servingGrams: 1,
    cuisineTags: ["bengali", "desi"],
    sourceId: 172231,
    per100g: {
      caloriesKcal: 312,
      proteinG: 9.68,
      carbsG: 67.14,
      fatG: 3.25,
      fiberG: 22.7,
    },
  },
];

export const CURATED_FOOD_CATALOG: readonly CuratedFoodItem[] = SEEDS.map(
  (seed) => ({
    id: seed.id,
    name: seed.name,
    aliases: seed.aliases ?? [],
    servingDescription: `${seed.servingGrams} g`,
    servingGrams: seed.servingGrams,
    cuisineTags: seed.cuisineTags ?? [],
    dietaryTags: dietaryTagsForFood(seed.id),
    commonAllergens: seed.commonAllergens ?? [],
    nutritionPerServing: nutritionForGrams(seed.per100g, seed.servingGrams),
    source: "USDA FoodData Central",
    sourceId: seed.sourceId,
  }),
);

export function getCuratedFood(id: string): CuratedFoodItem | undefined {
  return CURATED_FOOD_CATALOG.find((item) => item.id === id);
}

export function curatedFoodSupportsDiet(
  item: CuratedFoodItem,
  dietStyle:
    "no_preference" | "omnivore" | "vegetarian" | "vegan" | "pescatarian",
): boolean {
  if (dietStyle === "vegan") return item.dietaryTags.includes("vegan");
  if (dietStyle === "vegetarian") {
    return (
      item.dietaryTags.includes("vegetarian") ||
      item.dietaryTags.includes("vegan")
    );
  }
  if (dietStyle === "pescatarian") {
    return item.dietaryTags.length > 0;
  }
  return true;
}

export function filterCuratedFoods(
  catalog: readonly CuratedFoodItem[],
  query: string,
): CuratedFoodItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...catalog];
  const tokens = normalized.split(/\s+/u).filter(Boolean);
  return catalog.filter((item) => {
    const haystack = [item.name, ...item.aliases, ...item.cuisineTags]
      .join(" ")
      .toLocaleLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

export function searchCuratedFoods(query: string): CuratedFoodItem[] {
  return filterCuratedFoods(CURATED_FOOD_CATALOG, query);
}
