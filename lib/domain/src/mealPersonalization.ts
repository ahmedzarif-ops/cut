import {
  BALANCED_MEAL_CATALOG,
  getBalancedMealTemplate,
  scoreBalancedMeal,
  type BalancedMealTemplate,
} from "./balancedMeals";

export type NutritionDietStyle =
  "no_preference" | "omnivore" | "vegetarian" | "vegan" | "pescatarian";

export type MealPreference = "liked" | "not_for_me";

export interface MealPersonalizationSignals {
  confirmedTemplateIds: readonly string[];
  dietStyle?: NutritionDietStyle;
  preferredCuisines?: readonly string[];
  avoidedIngredients?: readonly string[];
  feedback?: Readonly<Record<string, MealPreference>>;
  remainingCaloriesKcal?: number | null;
  remainingProteinG?: number | null;
  learningEnabled?: boolean;
}

export interface AdaptiveMealFit {
  template: BalancedMealTemplate;
  score: number;
  reason: string;
  recommendedServings: number;
}

const SERVING_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[-_]/gu, " ");
}

function normalizeWords(value: string): string {
  return normalize(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function supportsDiet(
  template: BalancedMealTemplate,
  dietStyle: NutritionDietStyle,
): boolean {
  const tags = new Set(template.dietaryTags);
  if (dietStyle === "vegan") return tags.has("vegan");
  if (dietStyle === "vegetarian") {
    return tags.has("vegetarian") || tags.has("vegan");
  }
  if (dietStyle === "pescatarian") {
    return (
      tags.has("pescatarian") || tags.has("vegetarian") || tags.has("vegan")
    );
  }
  return true;
}

function includesAvoidedIngredient(
  template: BalancedMealTemplate,
  avoidedIngredients: readonly string[],
): boolean {
  if (avoidedIngredients.length === 0) return false;
  const searchable = ` ${normalizeWords(
    [template.name, ...template.ingredients].join(" "),
  )} `;
  return avoidedIngredients.some((term) => {
    const normalized = normalizeWords(term);
    return normalized.length > 0 && searchable.includes(` ${normalized} `);
  });
}

function preferredCuisineMatch(
  template: BalancedMealTemplate,
  preferredCuisines: readonly string[],
): boolean {
  const cuisine = normalize(template.cuisine);
  return preferredCuisines.some((choice) => {
    const normalized = normalize(choice);
    return (
      normalized.length > 0 &&
      (cuisine.includes(normalized) || normalized.includes(cuisine))
    );
  });
}

function recommendedServings(
  template: BalancedMealTemplate,
  remainingCaloriesKcal: number | null | undefined,
  remainingProteinG: number | null | undefined,
): number {
  const hasCalories =
    typeof remainingCaloriesKcal === "number" &&
    Number.isFinite(remainingCaloriesKcal) &&
    remainingCaloriesKcal >= 0;
  const hasProtein =
    typeof remainingProteinG === "number" &&
    Number.isFinite(remainingProteinG) &&
    remainingProteinG >= 0;
  if (!hasCalories && !hasProtein) return 1;

  return [...SERVING_OPTIONS].sort((a, b) => {
    const nutrition = template.nutritionPerServing;
    const calorieError = hasCalories
      ? Math.abs(nutrition.caloriesKcal * a - remainingCaloriesKcal) /
        Math.max(remainingCaloriesKcal, 1)
      : 0;
    const proteinError = hasProtein
      ? Math.abs(nutrition.proteinG * a - remainingProteinG) /
        Math.max(remainingProteinG, 1)
      : 0;
    const aError = calorieError + proteinError;

    const bCalorieError = hasCalories
      ? Math.abs(nutrition.caloriesKcal * b - remainingCaloriesKcal) /
        Math.max(remainingCaloriesKcal, 1)
      : 0;
    const bProteinError = hasProtein
      ? Math.abs(nutrition.proteinG * b - remainingProteinG) /
        Math.max(remainingProteinG, 1)
      : 0;
    return aError - (bCalorieError + bProteinError) || a - b;
  })[0];
}

function targetFitScore(
  template: BalancedMealTemplate,
  servings: number,
  remainingCaloriesKcal: number | null | undefined,
  remainingProteinG: number | null | undefined,
): number {
  const nutrition = template.nutritionPerServing;
  const scores: number[] = [];
  if (typeof remainingCaloriesKcal === "number" && remainingCaloriesKcal > 0) {
    scores.push(
      Math.max(
        0,
        1 -
          Math.abs(nutrition.caloriesKcal * servings - remainingCaloriesKcal) /
            remainingCaloriesKcal,
      ),
    );
  }
  if (typeof remainingProteinG === "number" && remainingProteinG > 0) {
    scores.push(
      Math.max(
        0,
        1 -
          Math.abs(nutrition.proteinG * servings - remainingProteinG) /
            remainingProteinG,
      ),
    );
  }
  if (scores.length === 0) return 0;
  return (scores.reduce((sum, value) => sum + value, 0) / scores.length) * 12;
}

/**
 * Explainable baseline for CUT OS Pro. It learns only from confirmed catalog
 * logs and direct feedback, applies explicit preferences, and never infers
 * medical, religious, or identity traits. A future LLM may propose reviewed
 * drafts after separate provider approval; this remains the safe fallback.
 */
export function rankAdaptiveMealFits(
  signalsOrTemplateIds: MealPersonalizationSignals | readonly string[],
  limit = 3,
): AdaptiveMealFit[] {
  const signals: MealPersonalizationSignals = Array.isArray(
    signalsOrTemplateIds,
  )
    ? { confirmedTemplateIds: signalsOrTemplateIds }
    : (signalsOrTemplateIds as MealPersonalizationSignals);
  const learningEnabled = signals.learningEnabled !== false;
  const confirmedTemplateIds = learningEnabled
    ? signals.confirmedTemplateIds.slice(0, 60)
    : [];
  const feedback = signals.feedback ?? {};
  const preferredCuisines = (signals.preferredCuisines ?? []).slice(0, 10);
  const avoidedIngredients = (signals.avoidedIngredients ?? []).slice(0, 20);
  const dietStyle = signals.dietStyle ?? "no_preference";
  const templateCounts = new Map<string, number>();
  const cuisineCounts = new Map<string, number>();

  for (const id of confirmedTemplateIds) {
    const template = getBalancedMealTemplate(id);
    if (!template) continue;
    templateCounts.set(id, (templateCounts.get(id) ?? 0) + 1);
    cuisineCounts.set(
      template.cuisine,
      (cuisineCounts.get(template.cuisine) ?? 0) + 1,
    );
  }

  const favoriteCuisine = [...cuisineCounts.entries()].sort(
    ([nameA, countA], [nameB, countB]) =>
      countB - countA || nameA.localeCompare(nameB),
  )[0]?.[0];

  return BALANCED_MEAL_CATALOG.filter(
    (template) =>
      feedback[template.id] !== "not_for_me" &&
      supportsDiet(template, dietStyle) &&
      !includesAvoidedIngredient(template, avoidedIngredients),
  )
    .map((template) => {
      const cuisineSignal = Math.min(
        cuisineCounts.get(template.cuisine) ?? 0,
        5,
      );
      const repeatSignal = Math.min(templateCounts.get(template.id) ?? 0, 3);
      const explicitCuisine = preferredCuisineMatch(
        template,
        preferredCuisines,
      );
      const servings = recommendedServings(
        template,
        signals.remainingCaloriesKcal,
        signals.remainingProteinG,
      );
      const hasTarget =
        signals.remainingCaloriesKcal !== null &&
        signals.remainingCaloriesKcal !== undefined
          ? true
          : signals.remainingProteinG !== null &&
            signals.remainingProteinG !== undefined;
      const reason = explicitCuisine
        ? `Matches your ${template.cuisine} preference${hasTarget ? `; ${servings} serving${servings === 1 ? "" : "s"} fits today's remaining targets` : ""}. Review ingredients and portions.`
        : favoriteCuisine && template.cuisine === favoriteCuisine
          ? `Based on your confirmed ${favoriteCuisine} meal logs${hasTarget ? `; ${servings} serving${servings === 1 ? "" : "s"} fits today's remaining targets` : ""}. Review ingredients and portions.`
          : hasTarget
            ? `${servings} serving${servings === 1 ? "" : "s"} fits today's remaining calorie and protein targets. Review ingredients and portions.`
            : confirmedTemplateIds.length > 0
              ? "Adds variety beside your recent confirmed meals. Review ingredients and portions."
              : "A balanced starting option. Review ingredients and portions.";

      return {
        template,
        recommendedServings: servings,
        score:
          scoreBalancedMeal(template).total +
          cuisineSignal * 4 +
          repeatSignal * 2 +
          (explicitCuisine ? 16 : 0) +
          (feedback[template.id] === "liked" ? 20 : 0) +
          targetFitScore(
            template,
            servings,
            signals.remainingCaloriesKcal,
            signals.remainingProteinG,
          ),
        reason,
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id),
    )
    .slice(0, Math.max(0, Math.min(limit, 10)));
}
