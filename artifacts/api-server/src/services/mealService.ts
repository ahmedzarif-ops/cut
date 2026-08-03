import { and, asc, eq } from "drizzle-orm";
import {
  db,
  mealEntriesTable,
  mealEntryDeletionTombstonesTable,
  type MealEntry,
  type User,
} from "@workspace/db";
import {
  BALANCED_MEAL_CATALOG,
  BALANCED_MEAL_CATALOG_VERSION,
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  getBalancedMealTemplate,
  isCurrentBalancedMealCatalogVersion,
  rankBalancedMeals,
  scaleNutrition,
  sumNutrition,
  systemClock,
  todayKey,
  type BalancedMealTemplate,
  type Clock,
  type NutritionFacts,
} from "@workspace/domain";

import { HttpError } from "../lib/httpError";

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

function templateNutrition(template: BalancedMealTemplate): NutritionFacts {
  return template.nutritionPerServing;
}

function mealDescription(template: BalancedMealTemplate): string {
  const ingredients = template.ingredients.slice(0, 3).join(", ");
  return `A simple ${template.cuisine} meal built around ${ingredients}.`;
}

function fitReason(template: BalancedMealTemplate): string {
  const nutrition = templateNutrition(template);
  if (nutrition.proteinG >= 40 && nutrition.fiberG >= 10) {
    return `${nutrition.proteinG} g protein and ${nutrition.fiberG} g fiber per serving.`;
  }
  if (nutrition.proteinG >= 40) {
    return `${nutrition.proteinG} g protein per serving with a practical mix of foods.`;
  }
  if (nutrition.fiberG >= 10) {
    return `${nutrition.fiberG} g fiber per serving with protein and produce.`;
  }
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

export function listMyMealOptions(): MealOptionResponse[] {
  return rankBalancedMeals(BALANCED_MEAL_CATALOG).map(({ template }) =>
    toMealOption(template),
  );
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
  clock: Clock = systemClock,
): Promise<TodayMealsResponse> {
  const dayKey = todayKey(clock, user.timezone);
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

export async function createMyMealEntry(
  user: User,
  input: CreateMealEntryInput,
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

  const authoritativeDayKey = todayKey(clock, user.timezone);
  if (input.dayKey !== authoritativeDayKey) {
    throw new HttpError(
      412,
      "Meal day or options changed. Refresh and review before logging",
    );
  }

  const template = getBalancedMealTemplate(input.mealTemplateId);
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
