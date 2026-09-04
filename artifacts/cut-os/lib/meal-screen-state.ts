export type MealCatalogState = "loading" | "error" | "empty" | "ready";
export type MealScreenBlockingState = "loading" | "error" | null;

export function resolveMealScreenState({
  hasPendingIntent,
  mealsLoading,
  mealsError,
  catalogLoading,
  catalogError,
  optionCount,
  hasLoggedMeals,
}: {
  hasPendingIntent: boolean;
  mealsLoading: boolean;
  mealsError: boolean;
  catalogLoading: boolean;
  catalogError: boolean;
  optionCount: number;
  hasLoggedMeals: boolean;
}): {
  blockingState: MealScreenBlockingState;
  catalogState: MealCatalogState;
  showLoggedMeals: boolean;
} {
  const blockingState: MealScreenBlockingState = hasPendingIntent
    ? null
    : mealsError
      ? "error"
      : mealsLoading
        ? "loading"
        : null;
  const catalogState: MealCatalogState = catalogError
    ? "error"
    : catalogLoading
      ? "loading"
      : optionCount === 0
        ? "empty"
        : "ready";

  return {
    blockingState,
    catalogState,
    showLoggedMeals: blockingState === null && hasLoggedMeals,
  };
}
