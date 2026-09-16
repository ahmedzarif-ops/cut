import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  mealEntriesTable,
  mealEntryDeletionTombstonesTable,
  type MealEntry,
  type User,
} from "@workspace/db";
import {
  BALANCED_MEAL_CATALOG_VERSION,
  CURATED_FOOD_CATALOG_VERSION,
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  filterCuratedFoods,
  isCurrentBalancedMealCatalogVersion,
  rankBalancedMeals,
  rankAdaptiveMealFits,
  scaleNutrition,
  sumNutrition,
  systemClock,
  todayKey,
  type BalancedMealTemplate,
  type Clock,
  type NutritionFacts,
} from "@workspace/domain";

import { HttpError } from "../lib/httpError";
import {
  getMyNutritionPreferences,
  listMyMealFeedback,
} from "./nutritionService";
import {
  getCatalogMeal,
  listCatalogFoods,
  listCatalogMeals,
} from "./nutritionCatalogService";

export interface MealOptionResponse extends NutritionFacts {
  id: string;
  catalogVersion: string;
  name: string;
  description: string;
  cuisine: string;
  servingDescription: string;
  ingredients: string[];
  dietaryTags: string[];
  allergens: string[];
  fitReason: string;
  recommendedServings: number;
}

export interface MealEntryResponse extends NutritionFacts {
  id: string;
  catalogVersion: string;
  templateId: string;
  clientRequestId: string;
  loggedOn: string;
  name: string;
  servingDescription: string;
  servings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodLibraryItemResponse extends NutritionFacts {
  id: string;
  catalogVersion: string;
  name: string;
  aliases: string[];
  servingDescription: string;
  servingGrams: number;
  cuisineTags: string[];
  allergens: string[];
  source: "USDA FoodData Central";
  sourceId: number;
}

export interface TodayMealsResponse {
  dayKey: string;
  entries: MealEntryResponse[];
  totals: NutritionFacts;
}

export interface CreateMealEntryInput {
  clientRequestId: string;
  catalogVersion: string;
  dayKey: string;
  mealTemplateId: string;
  servings: number;
}

export interface CreateFoodEntryInput extends NutritionFacts {
  clientRequestId: string;
  dayKey: string;
  name: string;
  servingDescription: string;
  servings: number;
}

const USER_FOOD_CATALOG_VERSION = "user-food-v1";

function templateNutrition(template: BalancedMealTemplate): NutritionFacts {
  return template.nutritionPerServing;
}

function mealDescription(template: BalancedMealTemplate): string {
  const ingredients = template.ingredients.slice(0, 3).join(", ");
  return `A simple ${template.cuisine} meal built around ${ingredients}.`;
}

function fitReason(template: BalancedMealTemplate): string {
  const nutrition = templateNutrition(template);
  return `${nutrition.proteinG} g protein and ${nutrition.fiberG} g fiber per serving.`;
}

function toMealOption(template: BalancedMealTemplate): MealOptionResponse {
  return {
    id: template.id,
    catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
    name: template.name,
    description: mealDescription(template),
    cuisine: template.cuisine,
    servingDescription: template.servingDescription,
    ingredients: [...template.ingredients],
    dietaryTags: [...template.dietaryTags],
    allergens: [...template.commonAllergens],
    ...templateNutrition(template),
    fitReason: fitReason(template),
    recommendedServings: 1,
  };
}

function perServingNutrition(entry: MealEntry): NutritionFacts {
  return {
    caloriesKcal: entry.caloriesKcalPerServing,
    proteinG: entry.proteinGPerServing,
    carbsG: entry.carbsGPerServing,
    fatG: entry.fatGPerServing,
    fiberG: entry.fiberGPerServing,
  };
}

export function toMealEntryResponse(entry: MealEntry): MealEntryResponse {
  return {
    id: entry.id,
    catalogVersion: entry.catalogVersion,
    templateId: entry.templateId,
    clientRequestId: entry.clientRequestId,
    loggedOn: entry.loggedOn,
    name: entry.name,
    servingDescription: entry.servingDescription,
    servings: entry.servings,
    ...scaleNutrition(perServingNutrition(entry), entry.servings),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function listMyMealOptions(): Promise<MealOptionResponse[]> {
  const catalog = await listCatalogMeals("free");
  return rankBalancedMeals(catalog).map(({ template }) =>
    toMealOption(template),
  );
}

export async function listMyProMealFits(
  userId: string,
  deviceTimeZone = "UTC",
  clock: Clock = systemClock,
): Promise<MealOptionResponse[]> {
  const localDay = todayKey(clock, deviceTimeZone);
  const [catalog, recentEntries, preferences, feedback, todayEntries] =
    await Promise.all([
      listCatalogMeals("all"),
      db
        .select({ templateId: mealEntriesTable.templateId })
        .from(mealEntriesTable)
        .where(eq(mealEntriesTable.userId, userId))
        .orderBy(desc(mealEntriesTable.createdAt), desc(mealEntriesTable.id))
        .limit(60),
      getMyNutritionPreferences(userId),
      listMyMealFeedback(userId),
      getMealEntriesForDay(userId, localDay),
    ]);
  const totals = nutritionTotals(todayEntries);

  return rankAdaptiveMealFits(
    {
      confirmedTemplateIds: recentEntries.map(({ templateId }) => templateId),
      dietStyle: preferences.dietStyle,
      preferredCuisines: preferences.preferredCuisines,
      avoidedIngredients: preferences.avoidedIngredients,
      learningEnabled: preferences.learningEnabled,
      feedback: Object.fromEntries(
        feedback.map((item) => [item.templateId, item.preference]),
      ),
      remainingCaloriesKcal:
        preferences.dailyCalorieTarget === null
          ? null
          : Math.max(0, preferences.dailyCalorieTarget - totals.caloriesKcal),
      remainingProteinG:
        preferences.dailyProteinTargetG === null
          ? null
          : Math.max(0, preferences.dailyProteinTargetG - totals.proteinG),
    },
    3,
    catalog,
  ).map(({ template, reason, recommendedServings }) => ({
    ...toMealOption(template),
    fitReason: reason,
    recommendedServings,
  }));
}

export async function listMyFoodLibrary(
  query = "",
): Promise<FoodLibraryItemResponse[]> {
  const catalog = await listCatalogFoods("free");
  return filterCuratedFoods(catalog, query).map((item) => ({
    id: item.id,
    catalogVersion: CURATED_FOOD_CATALOG_VERSION,
    name: item.name,
    aliases: [...item.aliases],
    servingDescription: item.servingDescription,
    servingGrams: item.servingGrams,
    cuisineTags: [...item.cuisineTags],
    allergens: [...item.commonAllergens],
    ...item.nutritionPerServing,
    source: item.source,
    sourceId: item.sourceId,
  }));
}

export async function getMealEntriesForDay(
  userId: string,
  loggedOn: string,
): Promise<MealEntry[]> {
  return db
    .select()
    .from(mealEntriesTable)
    .where(
      and(
        eq(mealEntriesTable.userId, userId),
        eq(mealEntriesTable.loggedOn, loggedOn),
      ),
    )
    .orderBy(asc(mealEntriesTable.createdAt), asc(mealEntriesTable.id));
}

export function nutritionTotals(entries: MealEntry[]): NutritionFacts {
  return sumNutrition(
    entries.map((entry) => {
      const perServing = perServingNutrition(entry);
      return {
        caloriesKcal: perServing.caloriesKcal * entry.servings,
        proteinG: perServing.proteinG * entry.servings,
        carbsG: perServing.carbsG * entry.servings,
        fatG: perServing.fatG * entry.servings,
        fiberG: perServing.fiberG * entry.servings,
      };
    }),
  );
}

export async function getTodayMeals(
  user: User,
  deviceTimeZone: string,
  clock: Clock = systemClock,
): Promise<TodayMealsResponse> {
  const dayKey = todayKey(clock, deviceTimeZone);
  const rows = await getMealEntriesForDay(user.id, dayKey);
  return {
    dayKey,
    entries: rows.map(toMealEntryResponse),
    totals: nutritionTotals(rows),
  };
}

async function getMealByClientRequestId(
  userId: string,
  clientRequestId: string,
): Promise<MealEntry | undefined> {
  const [entry] = await db
    .select()
    .from(mealEntriesTable)
    .where(
      and(
        eq(mealEntriesTable.userId, userId),
        eq(mealEntriesTable.clientRequestId, clientRequestId),
      ),
    );
  return entry;
}

async function wasMealRequestDeleted(
  userId: string,
  clientRequestId: string,
): Promise<boolean> {
  const [tombstone] = await db
    .select({
      clientRequestId: mealEntryDeletionTombstonesTable.clientRequestId,
    })
    .from(mealEntryDeletionTombstonesTable)
    .where(
      and(
        eq(mealEntryDeletionTombstonesTable.userId, userId),
        eq(mealEntryDeletionTombstonesTable.clientRequestId, clientRequestId),
      ),
    );
  return tombstone !== undefined;
}

function ensureIdempotentPayload(
  existing: MealEntry,
  input: CreateMealEntryInput,
): void {
  if (
    existing.catalogVersion !== input.catalogVersion ||
    existing.loggedOn !== input.dayKey ||
    existing.templateId !== input.mealTemplateId ||
    existing.servings !== input.servings
  ) {
    throw new HttpError(
      409,
      "This client request ID was already used for a different meal",
    );
  }
}

function ensureServings(servings: number): void {
  if (
    !Number.isFinite(servings) ||
    servings < MIN_MEAL_SERVINGS ||
    servings > MAX_MEAL_SERVINGS
  ) {
    throw new HttpError(
      400,
      `Servings must be between ${MIN_MEAL_SERVINGS} and ${MAX_MEAL_SERVINGS}`,
    );
  }
}

function ensureIdempotentFoodPayload(
  existing: MealEntry,
  input: CreateFoodEntryInput,
): void {
  const expectedTemplateId = `food:${input.clientRequestId}`;
  if (
    existing.catalogVersion !== USER_FOOD_CATALOG_VERSION ||
    existing.loggedOn !== input.dayKey ||
    existing.templateId !== expectedTemplateId ||
    existing.name !== input.name.trim() ||
    existing.servingDescription !== input.servingDescription.trim() ||
    existing.servings !== input.servings ||
    existing.caloriesKcalPerServing !== input.caloriesKcal ||
    existing.proteinGPerServing !== input.proteinG ||
    existing.carbsGPerServing !== input.carbsG ||
    existing.fatGPerServing !== input.fatG ||
    existing.fiberGPerServing !== input.fiberG
  ) {
    throw new HttpError(
      409,
      "This client request ID was already used for a different food",
    );
  }
}

export async function createMyFoodEntry(
  user: User,
  input: CreateFoodEntryInput,
  deviceTimeZone: string,
  clock: Clock = systemClock,
): Promise<MealEntryResponse> {
  const existing = await getMealByClientRequestId(
    user.id,
    input.clientRequestId,
  );
  if (existing) {
    ensureIdempotentFoodPayload(existing, input);
    return toMealEntryResponse(existing);
  }

  if (await wasMealRequestDeleted(user.id, input.clientRequestId)) {
    throw new HttpError(
      412,
      "This food request was already deleted. Refresh before logging again",
    );
  }
  ensureServings(input.servings);

  const authoritativeDayKey = todayKey(clock, deviceTimeZone);
  if (input.dayKey !== authoritativeDayKey) {
    throw new HttpError(
      412,
      "Food day changed. Refresh and review before logging",
    );
  }

  const name = input.name.trim();
  const servingDescription = input.servingDescription.trim();
  if (!name || !servingDescription) {
    throw new HttpError(400, "Food name and serving are required");
  }

  const [inserted] = await db
    .insert(mealEntriesTable)
    .values({
      userId: user.id,
      clientRequestId: input.clientRequestId,
      loggedOn: authoritativeDayKey,
      catalogVersion: USER_FOOD_CATALOG_VERSION,
      templateId: `food:${input.clientRequestId}`,
      name,
      servingDescription,
      servings: input.servings,
      caloriesKcalPerServing: input.caloriesKcal,
      proteinGPerServing: input.proteinG,
      carbsGPerServing: input.carbsG,
      fatGPerServing: input.fatG,
      fiberGPerServing: input.fiberG,
    })
    .onConflictDoNothing({
      target: [mealEntriesTable.userId, mealEntriesTable.clientRequestId],
    })
    .returning();

  if (inserted) return toMealEntryResponse(inserted);

  const raced = await getMealByClientRequestId(user.id, input.clientRequestId);
  if (!raced)
    throw new Error("Food idempotency conflict could not be resolved");
  ensureIdempotentFoodPayload(raced, input);
  return toMealEntryResponse(raced);
}

export async function createMyMealEntry(
  user: User,
  input: CreateMealEntryInput,
  deviceTimeZone: string,
  clock: Clock = systemClock,
): Promise<MealEntryResponse> {
  const existing = await getMealByClientRequestId(
    user.id,
    input.clientRequestId,
  );
  if (existing) {
    ensureIdempotentPayload(existing, input);
    return toMealEntryResponse(existing);
  }

  if (await wasMealRequestDeleted(user.id, input.clientRequestId)) {
    throw new HttpError(
      412,
      "This meal request was already deleted. Refresh before logging again",
    );
  }

  ensureServings(input.servings);

  if (!isCurrentBalancedMealCatalogVersion(input.catalogVersion)) {
    throw new HttpError(
      412,
      "Meal day or options changed. Refresh and review before logging",
    );
  }

  const authoritativeDayKey = todayKey(clock, deviceTimeZone);
  if (input.dayKey !== authoritativeDayKey) {
    throw new HttpError(
      412,
      "Meal day or options changed. Refresh and review before logging",
    );
  }

  const template = await getCatalogMeal(input.mealTemplateId);
  if (!template) throw new HttpError(404, "Meal template not found");

  const nutrition = templateNutrition(template);
  const [inserted] = await db
    .insert(mealEntriesTable)
    .values({
      userId: user.id,
      clientRequestId: input.clientRequestId,
      loggedOn: authoritativeDayKey,
      catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
      templateId: template.id,
      name: template.name,
      servingDescription: template.servingDescription,
      servings: input.servings,
      caloriesKcalPerServing: nutrition.caloriesKcal,
      proteinGPerServing: nutrition.proteinG,
      carbsGPerServing: nutrition.carbsG,
      fatGPerServing: nutrition.fatG,
      fiberGPerServing: nutrition.fiberG,
    })
    .onConflictDoNothing({
      target: [mealEntriesTable.userId, mealEntriesTable.clientRequestId],
    })
    .returning();

  if (inserted) return toMealEntryResponse(inserted);

  // A concurrent retry won the insert race. Compare the persisted payload so
  // the idempotency contract remains the same under real double taps.
  const raced = await getMealByClientRequestId(user.id, input.clientRequestId);
  if (!raced)
    throw new Error("Meal idempotency conflict could not be resolved");
  ensureIdempotentPayload(raced, input);
  return toMealEntryResponse(raced);
}

export async function updateMyMealEntry(
  userId: string,
  mealEntryId: string,
  servings: number,
  clock: Clock = systemClock,
): Promise<MealEntryResponse | undefined> {
  ensureServings(servings);
  const [entry] = await db
    .update(mealEntriesTable)
    .set({ servings, updatedAt: clock.now() })
    .where(
      and(
        eq(mealEntriesTable.id, mealEntryId),
        eq(mealEntriesTable.userId, userId),
      ),
    )
    .returning();
  return entry ? toMealEntryResponse(entry) : undefined;
}

export async function deleteMyMealEntry(
  userId: string,
  mealEntryId: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select({ clientRequestId: mealEntriesTable.clientRequestId })
      .from(mealEntriesTable)
      .where(
        and(
          eq(mealEntriesTable.id, mealEntryId),
          eq(mealEntriesTable.userId, userId),
        ),
      );
    if (!entry) return false;

    await tx
      .insert(mealEntryDeletionTombstonesTable)
      .values({ userId, clientRequestId: entry.clientRequestId })
      .onConflictDoNothing();

    const deleted = await tx
      .delete(mealEntriesTable)
      .where(
        and(
          eq(mealEntriesTable.id, mealEntryId),
          eq(mealEntriesTable.userId, userId),
        ),
      )
      .returning({ id: mealEntriesTable.id });
    return deleted.length === 1;
  });
}
