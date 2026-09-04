import {
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  scaleNutrition,
  type NutritionFacts,
} from "@workspace/domain";

export { MAX_MEAL_SERVINGS, MIN_MEAL_SERVINGS };
export const MEAL_SERVING_STEP = 0.25;

export type MealNutrition = NutritionFacts;

/** Detect a stale reviewed day/catalog without depending on a client class. */
export function isMealCreatePreconditionFailed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 412
  );
}

/** Keep the serving editor inside the API's accepted range and step size. */
export function clampMealServings(servings: number): number {
  const finite = Number.isFinite(servings) ? servings : 1;
  const stepped = Math.round(finite / MEAL_SERVING_STEP) * MEAL_SERVING_STEP;
  return Math.min(MAX_MEAL_SERVINGS, Math.max(MIN_MEAL_SERVINGS, stepped));
}

/**
 * Preview only. The server recalculates and persists the canonical nutrition
 * snapshot from the selected template and serving count.
 */
export function scaleMealNutrition(
  nutrition: NutritionFacts,
  servings: number,
): NutritionFacts {
  return scaleNutrition(nutrition, clampMealServings(servings));
}

export function formatMealServings(servings: number): string {
  const safeServings = clampMealServings(servings);
  return `${Number.isInteger(safeServings) ? safeServings : safeServings.toFixed(2).replace(/0$/, "")}×`;
}
