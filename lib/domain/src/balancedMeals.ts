export const MIN_MEAL_SERVINGS = 0.25;
export const MAX_MEAL_SERVINGS = 4;

/**
 * Increment this value when curated meal content or nutrition changes. Template
 * IDs remain stable; logged entries keep snapshots so their history never
 * changes when the catalog does.
 */
export const BALANCED_MEAL_CATALOG_VERSION = "2026-08-03.1";

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
 * A deliberately small launch catalog. Nutrition is an estimate for the stated
 * serving, not clinical advice; users still need to review ingredients and
 * packaging for their own restrictions.
 */
export const BALANCED_MEAL_CATALOG: readonly BalancedMealTemplate[] = [
  {
    id: "bengali-chicken-curry-plate",
    name: "Bengali Chicken Curry Plate",
    servingDescription:
      "1 plate with chicken curry, basmati rice, spinach and cucumber",
    cuisine: "Bengali",
    ingredients: [
      "chicken breast",
      "tomato-onion spice curry",
      "basmati rice",
      "spinach",
      "cucumber",
    ],
    dietaryTags: ["high-protein", "dairy-free"],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 610,
      proteinG: 48,
      carbsG: 68,
      fatG: 17,
      fiberG: 9,
    },
  },
  {
    id: "desi-masoor-dal-egg-bowl",
    name: "Desi Masoor Dal & Egg Bowl",
    servingDescription:
      "1 bowl with red lentils, two eggs, brown basmati rice and greens",
    cuisine: "Desi",
    ingredients: [
      "red lentils",
      "eggs",
      "brown basmati rice",
      "spinach",
      "tomato",
    ],
    dietaryTags: ["vegetarian", "high-fiber"],
    commonAllergens: ["egg"],
    nutritionPerServing: {
      caloriesKcal: 570,
      proteinG: 30,
      carbsG: 78,
      fatG: 16,
      fiberG: 15,
    },
  },
  {
    id: "lemon-herb-chicken-grain-bowl",
    name: "Lemon Herb Chicken Grain Bowl",
    servingDescription:
      "1 bowl with chicken, quinoa, roasted vegetables and lemon dressing",
    cuisine: "Mediterranean-inspired",
    ingredients: [
      "chicken breast",
      "quinoa",
      "zucchini",
      "bell pepper",
      "lemon olive-oil dressing",
    ],
    dietaryTags: ["high-protein", "dairy-free"],
    commonAllergens: [],
    nutritionPerServing: {
      caloriesKcal: 560,
      proteinG: 50,
      carbsG: 55,
      fatG: 15,
      fiberG: 10,
    },
  },
  {
    id: "salmon-sweet-potato-plate",
    name: "Salmon & Sweet Potato Plate",
    servingDescription:
      "1 plate with baked salmon, sweet potato, broccoli and greens",
    cuisine: "Contemporary",
    ingredients: ["salmon", "sweet potato", "broccoli", "mixed greens"],
    dietaryTags: ["pescatarian", "high-protein", "gluten-free"],
    commonAllergens: ["fish"],
    nutritionPerServing: {
      caloriesKcal: 590,
      proteinG: 42,
      carbsG: 51,
      fatG: 23,
      fiberG: 10,
    },
  },
  {
    id: "tofu-edamame-rice-bowl",
    name: "Tofu Edamame Rice Bowl",
    servingDescription:
      "1 bowl with tofu, edamame, brown rice, crunchy vegetables and sesame",
    cuisine: "East Asian-inspired",
    ingredients: [
      "tofu",
      "edamame",
      "brown rice",
      "broccoli",
      "red cabbage",
      "sesame",
    ],
    dietaryTags: ["vegan", "high-fiber"],
    commonAllergens: ["soy", "sesame"],
    nutritionPerServing: {
      caloriesKcal: 570,
      proteinG: 34,
      carbsG: 69,
      fatG: 18,
      fiberG: 14,
    },
  },
  {
    id: "greek-yogurt-oat-berry-bowl",
    name: "Greek Yogurt Oat Berry Bowl",
    servingDescription:
      "1 bowl with Greek yogurt, oats, berries, banana and chia seeds",
    cuisine: "Contemporary",
    ingredients: [
      "plain Greek yogurt",
      "rolled oats",
      "mixed berries",
      "banana",
      "chia seeds",
    ],
    dietaryTags: ["vegetarian", "high-protein"],
    commonAllergens: ["milk"],
    nutritionPerServing: {
      caloriesKcal: 480,
      proteinG: 35,
      carbsG: 60,
      fatG: 11,
      fiberG: 11,
    },
  },
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
