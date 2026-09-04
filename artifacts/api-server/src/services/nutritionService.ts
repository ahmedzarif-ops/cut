import { createHash } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import {
  db,
  mealFeedbackTable,
  nutritionPreferencesTable,
  savedFoodsTable,
  type MealFeedback,
  type NutritionPreferences,
  type SavedFood,
} from "@workspace/db";
import {
  systemClock,
  type Clock,
  type MealPreference,
  type NutritionDietStyle,
  type NutritionFacts,
} from "@workspace/domain";

import { HttpError } from "../lib/httpError";
import { getCatalogMeal } from "./nutritionCatalogService";

export const MAX_SAVED_FOODS = 100;

export interface NutritionPreferencesInput {
  dailyCalorieTarget: number | null;
  dailyProteinTargetG: number | null;
  dietStyle: NutritionDietStyle;
  preferredCuisines: string[];
  avoidedIngredients: string[];
  learningEnabled: boolean;
}

export interface NutritionPreferencesResponse extends NutritionPreferencesInput {}

export interface SavedFoodInput extends NutritionFacts {
  source: "curated" | "barcode" | "manual";
  sourceRef: string | null;
  name: string;
  servingDescription: string;
}

export interface SavedFoodResponse extends SavedFoodInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealFeedbackResponse {
  templateId: string;
  preference: MealPreference;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_NUTRITION_PREFERENCES: NutritionPreferencesResponse =
  Object.freeze({
    dailyCalorieTarget: null,
    dailyProteinTargetG: null,
    dietStyle: "no_preference",
    preferredCuisines: [],
    avoidedIngredients: [],
    learningEnabled: true,
  });

function normalizeChoiceList(
  values: readonly string[],
  limit: number,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/gu, " ");
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) continue;
    if (value.length > 40) throw new HttpError(400, "Preference is too long");
    seen.add(key);
    result.push(value);
    if (result.length === limit) break;
  }
  return result;
}

function toPreferencesResponse(
  row: NutritionPreferences | undefined,
): NutritionPreferencesResponse {
  if (!row) return { ...DEFAULT_NUTRITION_PREFERENCES };
  return {
    dailyCalorieTarget: row.dailyCalorieTarget,
    dailyProteinTargetG: row.dailyProteinTargetG,
    dietStyle: row.dietStyle as NutritionDietStyle,
    preferredCuisines: [...row.preferredCuisines],
    avoidedIngredients: [...row.avoidedIngredients],
    learningEnabled: row.learningEnabled,
  };
}

export async function getMyNutritionPreferences(
  userId: string,
): Promise<NutritionPreferencesResponse> {
  const [row] = await db
    .select()
    .from(nutritionPreferencesTable)
    .where(eq(nutritionPreferencesTable.userId, userId));
  return toPreferencesResponse(row);
}

export async function upsertMyNutritionPreferences(
  userId: string,
  input: NutritionPreferencesInput,
  clock: Clock = systemClock,
): Promise<NutritionPreferencesResponse> {
  const values = {
    dailyCalorieTarget: input.dailyCalorieTarget,
    dailyProteinTargetG: input.dailyProteinTargetG,
    dietStyle: input.dietStyle,
    preferredCuisines: normalizeChoiceList(input.preferredCuisines, 10),
    avoidedIngredients: normalizeChoiceList(input.avoidedIngredients, 20),
    learningEnabled: input.learningEnabled,
    updatedAt: clock.now(),
  };
  const [row] = await db
    .insert(nutritionPreferencesTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: nutritionPreferencesTable.userId,
      set: values,
    })
    .returning();
  if (!row) throw new Error("Nutrition preferences were not returned");
  return toPreferencesResponse(row);
}

export async function resetMyNutritionPreferences(
  userId: string,
): Promise<void> {
  await db
    .delete(nutritionPreferencesTable)
    .where(eq(nutritionPreferencesTable.userId, userId));
}

function normalizeSavedFood(input: SavedFoodInput): SavedFoodInput {
  const name = input.name.trim().replace(/\s+/gu, " ");
  const servingDescription = input.servingDescription
    .trim()
    .replace(/\s+/gu, " ");
  const sourceRef = input.sourceRef?.trim() || null;
  if (!name || !servingDescription) {
    throw new HttpError(400, "Food name and serving are required");
  }
  return { ...input, name, servingDescription, sourceRef };
}

function savedFoodFingerprint(input: SavedFoodInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.source,
        input.sourceRef,
        input.name.toLocaleLowerCase(),
        input.servingDescription.toLocaleLowerCase(),
        input.caloriesKcal,
        input.proteinG,
        input.carbsG,
        input.fatG,
        input.fiberG,
      ]),
    )
    .digest("hex");
}

function toSavedFoodResponse(row: SavedFood): SavedFoodResponse {
  return {
    id: row.id,
    source: row.source as SavedFoodInput["source"],
    sourceRef: row.sourceRef,
    name: row.name,
    servingDescription: row.servingDescription,
    caloriesKcal: row.caloriesKcal,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    fiberG: row.fiberG,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listMySavedFoods(
  userId: string,
): Promise<SavedFoodResponse[]> {
  const rows = await db
    .select()
    .from(savedFoodsTable)
    .where(eq(savedFoodsTable.userId, userId))
    .orderBy(desc(savedFoodsTable.updatedAt), desc(savedFoodsTable.id))
    .limit(MAX_SAVED_FOODS);
  return rows.map(toSavedFoodResponse);
}

export async function saveMyFood(
  userId: string,
  rawInput: SavedFoodInput,
  clock: Clock = systemClock,
): Promise<SavedFoodResponse> {
  const input = normalizeSavedFood(rawInput);
  const fingerprint = savedFoodFingerprint(input);
  const [existing] = await db
    .select({ id: savedFoodsTable.id })
    .from(savedFoodsTable)
    .where(
      and(
        eq(savedFoodsTable.userId, userId),
        eq(savedFoodsTable.fingerprint, fingerprint),
      ),
    );

  if (!existing) {
    const [usage] = await db
      .select({ total: count() })
      .from(savedFoodsTable)
      .where(eq(savedFoodsTable.userId, userId));
    if (Number(usage?.total ?? 0) >= MAX_SAVED_FOODS) {
      throw new HttpError(
        409,
        "Saved-food limit reached. Remove one before saving another",
      );
    }
  }

  const values = {
    source: input.source,
    sourceRef: input.sourceRef,
    fingerprint,
    name: input.name,
    servingDescription: input.servingDescription,
    caloriesKcal: input.caloriesKcal,
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatG: input.fatG,
    fiberG: input.fiberG,
    updatedAt: clock.now(),
  };
  const [row] = await db
    .insert(savedFoodsTable)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: [savedFoodsTable.userId, savedFoodsTable.fingerprint],
      set: values,
    })
    .returning();
  if (!row) throw new Error("Saved food was not returned");
  return toSavedFoodResponse(row);
}

export async function deleteMySavedFood(
  userId: string,
  savedFoodId: string,
): Promise<void> {
  await db
    .delete(savedFoodsTable)
    .where(
      and(
        eq(savedFoodsTable.userId, userId),
        eq(savedFoodsTable.id, savedFoodId),
      ),
    );
}

function toMealFeedbackResponse(row: MealFeedback): MealFeedbackResponse {
  return {
    templateId: row.templateId,
    preference: row.preference as MealPreference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listMyMealFeedback(
  userId: string,
): Promise<MealFeedbackResponse[]> {
  const rows = await db
    .select()
    .from(mealFeedbackTable)
    .where(eq(mealFeedbackTable.userId, userId))
    .orderBy(
      desc(mealFeedbackTable.updatedAt),
      desc(mealFeedbackTable.templateId),
    );
  return rows.map(toMealFeedbackResponse);
}

export async function upsertMyMealFeedback(
  userId: string,
  templateId: string,
  preference: MealPreference,
  clock: Clock = systemClock,
): Promise<MealFeedbackResponse> {
  if (!(await getCatalogMeal(templateId))) {
    throw new HttpError(404, "Meal template not found");
  }
  const [row] = await db
    .insert(mealFeedbackTable)
    .values({ userId, templateId, preference, updatedAt: clock.now() })
    .onConflictDoUpdate({
      target: [mealFeedbackTable.userId, mealFeedbackTable.templateId],
      set: { preference, updatedAt: clock.now() },
    })
    .returning();
  if (!row) throw new Error("Meal feedback was not returned");
  return toMealFeedbackResponse(row);
}

export async function deleteMyMealFeedback(
  userId: string,
  templateId: string,
): Promise<void> {
  await db
    .delete(mealFeedbackTable)
    .where(
      and(
        eq(mealFeedbackTable.userId, userId),
        eq(mealFeedbackTable.templateId, templateId),
      ),
    );
}
