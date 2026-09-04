import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestContext, type TestContext } from "../test/helpers";
import { provisionUser } from "./userService";
import {
  deleteMyMealFeedback,
  deleteMySavedFood,
  getMyNutritionPreferences,
  listMyMealFeedback,
  listMySavedFoods,
  resetMyNutritionPreferences,
  saveMyFood,
  upsertMyMealFeedback,
  upsertMyNutritionPreferences,
} from "./nutritionService";

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.close();
});

async function user(clerkUserId: string) {
  const provisioned = await provisionUser({ clerkUserId, email: null });
  if (!provisioned) throw new Error("Test user was not provisioned");
  return provisioned;
}

const paneer = {
  source: "manual" as const,
  sourceRef: null,
  name: "  Paneer   bhurji ",
  servingDescription: " 1 bowl ",
  caloriesKcal: 410,
  proteinG: 28,
  carbsG: 18,
  fatG: 25,
  fiberG: 4,
};

describe("private nutrition data service", () => {
  it("returns minimal defaults and normalizes explicit preference choices", async () => {
    const owner = await user("nutrition_preferences_owner");
    expect(await getMyNutritionPreferences(owner.id)).toEqual({
      dailyCalorieTarget: null,
      dailyProteinTargetG: null,
      dietStyle: "no_preference",
      preferredCuisines: [],
      avoidedIngredients: [],
      learningEnabled: true,
    });

    const saved = await upsertMyNutritionPreferences(owner.id, {
      dailyCalorieTarget: 2200,
      dailyProteinTargetG: 180,
      dietStyle: "omnivore",
      preferredCuisines: [" Desi ", "Bengali", "desi"],
      avoidedIngredients: [" cilantro ", "Cilantro"],
      learningEnabled: false,
    });
    expect(saved).toEqual({
      dailyCalorieTarget: 2200,
      dailyProteinTargetG: 180,
      dietStyle: "omnivore",
      preferredCuisines: ["Desi", "Bengali"],
      avoidedIngredients: ["cilantro"],
      learningEnabled: false,
    });

    await resetMyNutritionPreferences(owner.id);
    expect(await getMyNutritionPreferences(owner.id)).toMatchObject({
      dailyCalorieTarget: null,
      dietStyle: "no_preference",
      learningEnabled: true,
    });
  });

  it("deduplicates saved snapshots per owner and keeps accounts isolated", async () => {
    const owner = await user("saved_food_owner");
    const other = await user("saved_food_other");
    const first = await saveMyFood(owner.id, paneer);
    const duplicate = await saveMyFood(owner.id, paneer);
    const otherCopy = await saveMyFood(other.id, paneer);

    expect(duplicate.id).toBe(first.id);
    expect(otherCopy.id).not.toBe(first.id);
    expect(await listMySavedFoods(owner.id)).toHaveLength(1);
    expect(await listMySavedFoods(other.id)).toHaveLength(1);
    expect(first).toMatchObject({
      source: "manual",
      sourceRef: null,
      name: "Paneer bhurji",
      servingDescription: "1 bowl",
      caloriesKcal: 410,
      proteinG: 28,
    });

    await deleteMySavedFood(other.id, first.id);
    expect(await listMySavedFoods(owner.id)).toHaveLength(1);
    await deleteMySavedFood(owner.id, first.id);
    expect(await listMySavedFoods(owner.id)).toEqual([]);
  });

  it("stores feedback only for real fixed meal templates", async () => {
    const owner = await user("meal_feedback_owner");
    await expect(
      upsertMyMealFeedback(owner.id, "made-up-meal", "liked"),
    ).rejects.toMatchObject({ statusCode: 404 });

    const saved = await upsertMyMealFeedback(
      owner.id,
      "bengali-chicken-curry-plate",
      "liked",
    );
    expect(saved).toMatchObject({
      templateId: "bengali-chicken-curry-plate",
      preference: "liked",
    });
    expect(await listMyMealFeedback(owner.id)).toHaveLength(1);

    await deleteMyMealFeedback(owner.id, saved.templateId);
    expect(await listMyMealFeedback(owner.id)).toEqual([]);
  });
});
