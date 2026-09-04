import { DIASPORA_MEAL_CATALOG } from "./diasporaMeals";

export const MIN_MEAL_SERVINGS = 0.25;
export const MAX_MEAL_SERVINGS = 4;

/**
 * Increment this value when curated meal content or nutrition changes. Template
 * IDs remain stable; logged entries keep snapshots so their history never
 * changes when the catalog does.
 */
export const BALANCED_MEAL_CATALOG_VERSION = "2026-09-04.2";

export function isCurrentBalancedMealCatalogVersion(
  catalogVersion: string,
): boolean {
  return catalogVersion === BALANCED_MEAL_CATALOG_VERSION;
}

export interface NutritionFacts {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}

export type CommonAllergen =
  | "milk"
  | "egg"
  | "fish"
  | "shellfish"
  | "tree_nuts"
  | "peanuts"
  | "wheat"
  | "soy"
  | "sesame";

export interface BalancedMealTemplate {
  /** Durable API identifier. Never reuse an ID for a different meal. */
  id: string;
  name: string;
  servingDescription: string;
  cuisine: string;
  ingredients: readonly string[];
  dietaryTags: readonly string[];
  commonAllergens: readonly CommonAllergen[];
  nutritionPerServing: NutritionFacts;
}

/**
 * The original launch recipes remain first and stable for logged-history
 * evidence. Nutrition is an estimate for the stated serving, not clinical
 * advice; users still need to review ingredients and packaging for their own
 * restrictions. The FoodData Central inputs, calculation method, and unresolved
 * review gates are recorded in NUTRITION_CATALOG_EVIDENCE.md.
 */
const ORIGINAL_LAUNCH_MEAL_CATALOG: readonly BalancedMealTemplate[] = [
  {
    id: "bengali-chicken-curry-plate",
    name: "Bengali Chicken Curry Plate",
    servingDescription:
      "Entire recipe: 150 g chicken, 160 g rice, curry vegetables, spinach and cucumber",
    cuisine: "Bengali",
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
    name: "Desi Masoor Dal & Egg Bowl",
    servingDescription:
      "Entire recipe: 180 g lentils, 100 g egg, 120 g brown rice, spinach and tomato",
    cuisine: "Desi",
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
    name: "Lemon Herb Chicken Grain Bowl",
    servingDescription:
      "Entire recipe: 150 g chicken, 160 g quinoa, zucchini, pepper and lemon herbs",
    cuisine: "Mediterranean-inspired",
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
    name: "Salmon & Sweet Potato Plate",
    servingDescription:
      "Entire recipe: 150 g salmon, 220 g sweet potato, broccoli and romaine",
    cuisine: "Contemporary",
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
    name: "Tofu Edamame Rice Bowl",
    servingDescription:
      "Entire recipe: 150 g tofu, 100 g edamame, 120 g brown rice and vegetables",
    cuisine: "East Asian-inspired",
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
    name: "Greek Yogurt Oat Berry Bowl",
    servingDescription:
      "Entire recipe: 250 g Greek yogurt, 40 g oats, berries, banana and chia",
    cuisine: "Contemporary",
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
  {
    id: "desi-chicken-masoor-rice-bowl",
    name: "Desi-Inspired Chicken, Dal & Rice Bowl",
    servingDescription:
      "Entire recipe: 150 g chicken, 150 g lentils, 100 g rice and tomato-onion masala",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g cooked roasted chicken breast",
      "150 g cooked drained lentils",
      "100 g cooked long-grain white rice",
      "100 g raw tomato",
      "50 g raw onion",
      "5 g olive oil",
      "5 g raw garlic",
      "5 g raw ginger",
      "1 g ground cumin seed",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: [],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 652,
      proteinG: 64.9,
      carbsG: 70.6,
      fatG: 11.8,
      fiberG: 14.8,
    },
  },
  {
    id: "desi-chicken-quinoa-sabzi-bowl",
    name: "Desi-Inspired Chicken Quinoa Sabzi Bowl",
    servingDescription:
      "Entire recipe: 150 g chicken, 140 g quinoa, spinach, zucchini and tomato",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g cooked roasted chicken breast",
      "140 g cooked quinoa",
      "100 g cooked drained spinach",
      "100 g cooked drained zucchini",
      "100 g raw tomato",
      "5 g olive oil",
      "5 g raw garlic",
      "5 g raw ginger",
      "1 g ground cumin seed",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: [],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 534,
      proteinG: 58.4,
      carbsG: 43.8,
      fatG: 14.2,
      fiberG: 9.1,
    },
  },
  {
    id: "egg-masoor-spinach-plate",
    name: "Egg, Masoor Dal & Spinach Plate",
    servingDescription:
      "Entire recipe: 150 g egg, 200 g lentils, spinach and tomato-onion masala",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g peeled hard-boiled egg",
      "200 g cooked drained lentils",
      "100 g cooked drained spinach",
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
      caloriesKcal: 584,
      proteinG: 41.9,
      carbsG: 57,
      fatG: 22.5,
      fiberG: 20.7,
    },
  },
  {
    id: "bengali-salmon-rice-spinach",
    name: "Bengali-Inspired Salmon, Rice & Spinach",
    servingDescription:
      "Entire recipe: 140 g salmon, 140 g rice, spinach and tomato-onion masala",
    cuisine: "Bengali-inspired",
    ingredients: [
      "140 g dry-heat cooked Atlantic salmon",
      "140 g cooked long-grain white rice",
      "100 g cooked drained spinach",
      "100 g raw tomato",
      "50 g raw onion",
      "5 g olive oil",
      "5 g raw ginger",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: ["pescatarian"],
    commonAllergens: ["fish"],
    nutritionPerServing: {
      caloriesKcal: 583,
      proteinG: 39.3,
      carbsG: 53.3,
      fatG: 23.3,
      fiberG: 5.3,
    },
  },
  {
    id: "desi-tofu-masoor-bowl",
    name: "Desi-Inspired Tofu Masoor Bowl",
    servingDescription:
      "Entire recipe: 150 g tofu, 180 g lentils, spinach and tomato-onion masala",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g firm calcium-set tofu",
      "180 g cooked drained lentils",
      "75 g cooked drained spinach",
      "100 g raw tomato",
      "50 g raw onion",
      "5 g olive oil",
      "5 g raw garlic",
      "1 g ground cumin seed",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: ["vegan"],
    commonAllergens: ["soy"],
    nutritionPerServing: {
      caloriesKcal: 539,
      proteinG: 46.4,
      carbsG: 54.5,
      fatG: 19.5,
      fiberG: 22,
    },
  },
  {
    id: "chicken-sweet-potato-masala-plate",
    name: "Chicken & Sweet Potato Masala Plate",
    servingDescription:
      "Entire recipe: 150 g chicken, 220 g sweet potato, broccoli and tomato-onion masala",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g cooked roasted chicken breast",
      "220 g baked sweet potato flesh",
      "120 g cooked drained broccoli",
      "100 g raw tomato",
      "50 g raw onion",
      "5 g olive oil",
      "5 g raw garlic",
      "1 g ground cumin seed",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: [],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 584,
      proteinG: 55.8,
      carbsG: 65.5,
      fatG: 11.7,
      fiberG: 13.7,
    },
  },
  {
    id: "masoor-brown-rice-sabzi-bowl",
    name: "Masoor Dal, Brown Rice & Sabzi Bowl",
    servingDescription:
      "Entire recipe: 220 g lentils, 100 g brown rice, spinach and tomato-onion masala",
    cuisine: "Desi-inspired",
    ingredients: [
      "220 g cooked drained lentils",
      "100 g cooked long-grain brown rice",
      "100 g cooked drained spinach",
      "100 g raw tomato",
      "50 g raw onion",
      "5 g olive oil",
      "5 g raw garlic",
      "1 g ground cumin seed",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: ["vegan"],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 498,
      proteinG: 27.6,
      carbsG: 84.9,
      fatG: 7.6,
      fiberG: 23.9,
    },
  },
  {
    id: "yogurt-oat-banana-bowl",
    name: "Yogurt, Oat & Banana Bowl",
    servingDescription:
      "Entire recipe: 250 g Greek yogurt, 50 g oats, 100 g banana and 10 g chia",
    cuisine: "Contemporary",
    ingredients: [
      "250 g plain nonfat Greek yogurt",
      "50 g dry rolled oats",
      "100 g raw banana",
      "10 g dried chia seeds",
    ],
    dietaryTags: ["vegetarian"],
    commonAllergens: ["milk"],
    nutritionPerServing: {
      caloriesKcal: 475,
      proteinG: 34.8,
      carbsG: 69.9,
      fatG: 7.6,
      fiberG: 11.1,
    },
  },
  {
    id: "chicken-rice-kachumber-bowl",
    name: "Chicken, Rice & Kachumber-Style Bowl",
    servingDescription:
      "Entire recipe: 150 g chicken, 140 g brown rice, cucumber, tomato and romaine",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g cooked roasted chicken breast",
      "140 g cooked long-grain brown rice",
      "120 g raw cucumber with peel",
      "100 g raw tomato",
      "75 g raw romaine lettuce",
      "20 g raw lemon juice",
      "5 g olive oil",
      "1 g iodized salt",
    ],
    dietaryTags: [],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 517,
      proteinG: 53,
      carbsG: 47.9,
      fatG: 12.3,
      fiberG: 5.7,
    },
  },
  {
    id: "egg-quinoa-spinach-bowl",
    name: "Egg, Quinoa & Spinach Bowl",
    servingDescription:
      "Entire recipe: 150 g egg, 150 g quinoa, spinach and tomato-onion masala",
    cuisine: "Desi-inspired",
    ingredients: [
      "150 g peeled hard-boiled egg",
      "150 g cooked quinoa",
      "100 g cooked drained spinach",
      "100 g raw tomato",
      "50 g raw onion",
      "5 g olive oil",
      "1 g ground cumin seed",
      "1 g ground turmeric",
      "1 g iodized salt",
    ],
    dietaryTags: ["vegetarian"],
    commonAllergens: ["egg"],
    nutritionPerServing: {
      caloriesKcal: 525,
      proteinG: 30.1,
      carbsG: 47.1,
      fatG: 24.6,
      fiberG: 9,
    },
  },
  {
    id: "salmon-quinoa-vegetable-bowl",
    name: "Salmon Quinoa Vegetable Bowl",
    servingDescription:
      "Entire recipe: 140 g salmon, 150 g quinoa, broccoli and red pepper",
    cuisine: "Contemporary",
    ingredients: [
      "140 g dry-heat cooked Atlantic salmon",
      "150 g cooked quinoa",
      "120 g cooked drained broccoli",
      "100 g raw red bell pepper",
      "20 g raw lemon juice",
      "5 g olive oil",
      "1 g iodized salt",
    ],
    dietaryTags: ["pescatarian"],
    commonAllergens: ["fish"],
    nutritionPerServing: {
      caloriesKcal: 585,
      proteinG: 41.5,
      carbsG: 48,
      fatG: 26,
      fiberG: 10.3,
    },
  },
  {
    id: "tofu-edamame-quinoa-bowl",
    name: "Tofu Edamame Quinoa Bowl",
    servingDescription:
      "Entire recipe: 150 g tofu, 100 g edamame, 140 g quinoa and vegetables",
    cuisine: "East Asian-inspired",
    ingredients: [
      "150 g firm calcium-set tofu",
      "100 g prepared edamame",
      "140 g cooked quinoa",
      "100 g cooked drained broccoli",
      "75 g raw red cabbage",
      "5 g sesame oil",
      "5 g raw ginger",
      "1 g iodized salt",
    ],
    dietaryTags: ["vegan"],
    commonAllergens: ["soy", "sesame"],
    nutritionPerServing: {
      caloriesKcal: 611,
      proteinG: 47.5,
      carbsG: 56.5,
      fatG: 26.5,
      fiberG: 17.5,
    },
  },
];

export const BALANCED_MEAL_CATALOG: readonly BalancedMealTemplate[] = [
  ...ORIGINAL_LAUNCH_MEAL_CATALOG,
  ...DIASPORA_MEAL_CATALOG,
];

export interface BalancedMealScore {
  /** Total out of 100. */
  total: number;
  /** Up to 45 points, reaching the maximum at 35 g protein. */
  protein: number;
  /** Up to 30 points, reaching the maximum at 10 g fiber. */
  fiber: number;
  /** Up to 25 points for meals in the practical 400-700 kcal range. */
  calorieRange: number;
}

export interface RankedBalancedMeal {
  template: BalancedMealTemplate;
  score: BalancedMealScore;
}

function roundTo(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertNutrition(nutrition: NutritionFacts): void {
  for (const value of Object.values(nutrition)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Nutrition values must be finite and non-negative.");
    }
  }
}

function roundNutrition(nutrition: NutritionFacts): NutritionFacts {
  return {
    caloriesKcal: roundTo(nutrition.caloriesKcal, 0),
    proteinG: roundTo(nutrition.proteinG, 1),
    carbsG: roundTo(nutrition.carbsG, 1),
    fatG: roundTo(nutrition.fatG, 1),
    fiberG: roundTo(nutrition.fiberG, 1),
  };
}

export function getBalancedMealTemplate(
  templateId: string,
): BalancedMealTemplate | undefined {
  return BALANCED_MEAL_CATALOG.find((template) => template.id === templateId);
}

/** Scale a per-serving nutrition snapshot using launch-supported portions. */
export function scaleNutrition(
  nutritionPerServing: NutritionFacts,
  servings: number,
): NutritionFacts {
  assertNutrition(nutritionPerServing);
  if (
    !Number.isFinite(servings) ||
    servings < MIN_MEAL_SERVINGS ||
    servings > MAX_MEAL_SERVINGS
  ) {
    throw new RangeError(
      `Servings must be between ${MIN_MEAL_SERVINGS} and ${MAX_MEAL_SERVINGS}.`,
    );
  }

  return roundNutrition({
    caloriesKcal: nutritionPerServing.caloriesKcal * servings,
    proteinG: nutritionPerServing.proteinG * servings,
    carbsG: nutritionPerServing.carbsG * servings,
    fatG: nutritionPerServing.fatG * servings,
    fiberG: nutritionPerServing.fiberG * servings,
  });
}

/** Sum entry nutrition once, then round at the public boundary. */
export function sumNutrition(
  nutritionItems: readonly NutritionFacts[],
): NutritionFacts {
  const total = nutritionItems.reduce<NutritionFacts>(
    (sum, nutrition) => {
      assertNutrition(nutrition);
      return {
        caloriesKcal: sum.caloriesKcal + nutrition.caloriesKcal,
        proteinG: sum.proteinG + nutrition.proteinG,
        carbsG: sum.carbsG + nutrition.carbsG,
        fatG: sum.fatG + nutrition.fatG,
        fiberG: sum.fiberG + nutrition.fiberG,
      };
    },
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );

  return roundNutrition(total);
}

/**
 * General launch score: 45% protein, 30% fiber, 25% practical calorie range.
 * It intentionally ignores allergies, medical needs, and personal targets.
 */
export function scoreBalancedMeal(
  template: BalancedMealTemplate,
): BalancedMealScore {
  const nutrition = template.nutritionPerServing;
  assertNutrition(nutrition);

  const protein = roundTo(clamp((nutrition.proteinG / 35) * 45, 0, 45), 1);
  const fiber = roundTo(clamp((nutrition.fiberG / 10) * 30, 0, 30), 1);
  const calorieDistance =
    nutrition.caloriesKcal < 400
      ? 400 - nutrition.caloriesKcal
      : Math.max(0, nutrition.caloriesKcal - 700);
  const calorieRange = roundTo(clamp(25 - calorieDistance / 12, 0, 25), 1);

  return {
    total: roundTo(protein + fiber + calorieRange, 1),
    protein,
    fiber,
    calorieRange,
  };
}

export function rankBalancedMeals(
  templates: readonly BalancedMealTemplate[] = BALANCED_MEAL_CATALOG,
): RankedBalancedMeal[] {
  return templates
    .map((template) => ({ template, score: scoreBalancedMeal(template) }))
    .sort(
      (left, right) =>
        right.score.total - left.score.total ||
        right.template.nutritionPerServing.proteinG -
          left.template.nutritionPerServing.proteinG ||
        left.template.id.localeCompare(right.template.id),
    );
}
