import { randomUUID } from "node:crypto";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import {
  aiMealUsageTable,
  db,
  mealEntriesTable,
  type User,
} from "@workspace/db";
import {
  BALANCED_MEAL_CATALOG_VERSION,
  CURATED_FOOD_CATALOG,
  CURATED_FOOD_CATALOG_VERSION,
  curatedFoodSupportsDiet,
  getCuratedFood,
  rankAdaptiveMealFits,
  sumNutrition,
  systemClock,
  todayKey,
  type Clock,
  type NutritionFacts,
} from "@workspace/domain";

import type { Logger } from "pino";
import {
  getAiMealProvider,
  type AiMealCandidate,
  type AiMealProvider,
} from "./aiMealProvider";
import {
  getMyNutritionPreferences,
  listMyMealFeedback,
} from "./nutritionService";
import { getMealEntriesForDay, nutritionTotals } from "./mealService";

export type MealDraftGoal = "balanced" | "high_protein" | "quick" | "desi";
export type MealDraftTime = "any" | "breakfast" | "lunch" | "dinner" | "snack";

export interface CreateMealDraftInput {
  goal: MealDraftGoal;
  mealTime: MealDraftTime;
  maxPrepMinutes: number;
  availableIngredients: string[];
  notes: string;
}

export interface MealDraft extends NutritionFacts {
  id: string;
  source: "ai" | "catalog";
  catalogVersion: string;
  name: string;
  summary: string;
  servingDescription: string;
  estimatedPrepMinutes: number;
  ingredients: string[];
  instructions: string[];
  allergens: string[];
  whyItFits: string;
  reviewRequired: true;
}

export interface MealDraftResult {
  source: "ai" | "catalog";
  drafts: MealDraft[];
  notice: string;
}

function normalizedTerms(values: readonly string[], maximum: number): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/gu, " ").slice(0, 60);
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= maximum) break;
  }
  return result;
}

function containsAvoidedTerm(
  item: (typeof CURATED_FOOD_CATALOG)[number],
  avoided: readonly string[],
): boolean {
  const haystack = ` ${[item.name, ...item.aliases]
    .join(" ")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return avoided.some((value) => {
    const term = value
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    return term.length > 0 && haystack.includes(` ${term} `);
  });
}

function calculatedReason(
  nutrition: NutritionFacts,
  remainingCaloriesKcal: number | null,
  remainingProteinG: number | null,
): string {
  const parts = [
    `${Math.round(nutrition.caloriesKcal)} calories`,
    `${Math.round(nutrition.proteinG)} g protein`,
  ];
  if (remainingCaloriesKcal !== null || remainingProteinG !== null) {
    return `${parts.join(" and ")} based on CUT's catalog amounts and today's remaining targets. Review every ingredient and portion.`;
  }
  return `${parts.join(" and ")} based on CUT's catalog amounts. Review every ingredient and portion.`;
}

function candidateToDraft(
  candidate: AiMealCandidate,
  allowedFoodIds: ReadonlySet<string>,
  remainingCaloriesKcal: number | null,
  remainingProteinG: number | null,
): MealDraft | null {
  const seen = new Set<string>();
  const nutrition: NutritionFacts[] = [];
  const ingredients: string[] = [];
  const allergens = new Set<string>();

  for (const choice of candidate.ingredients) {
    if (seen.has(choice.foodId) || !allowedFoodIds.has(choice.foodId)) {
      return null;
    }
    const food = getCuratedFood(choice.foodId);
    if (!food) return null;
    seen.add(choice.foodId);
    const factor = choice.grams / food.servingGrams;
    nutrition.push({
      caloriesKcal: food.nutritionPerServing.caloriesKcal * factor,
      proteinG: food.nutritionPerServing.proteinG * factor,
      carbsG: food.nutritionPerServing.carbsG * factor,
      fatG: food.nutritionPerServing.fatG * factor,
      fiberG: food.nutritionPerServing.fiberG * factor,
    });
    ingredients.push(
      `${Math.round(choice.grams)} g ${food.name} — ${choice.preparation}`,
    );
    for (const allergen of food.commonAllergens) allergens.add(allergen);
  }

  const totals = sumNutrition(nutrition);
  if (
    totals.caloriesKcal < 100 ||
    totals.caloriesKcal > 2_500 ||
    totals.proteinG > 400 ||
    totals.carbsG > 500 ||
    totals.fatG > 250 ||
    totals.fiberG > 100
  ) {
    return null;
  }
  return {
    id: randomUUID(),
    source: "ai",
    catalogVersion: CURATED_FOOD_CATALOG_VERSION,
    name: candidate.name,
    summary: candidate.summary,
    servingDescription: "1 reviewed meal",
    estimatedPrepMinutes: candidate.estimatedPrepMinutes,
    ingredients,
    instructions: candidate.instructions,
    allergens: [...allergens].sort(),
    ...totals,
    whyItFits: calculatedReason(
      totals,
      remainingCaloriesKcal,
      remainingProteinG,
    ),
    reviewRequired: true,
  };
}

function fallbackDrafts(input: {
  goal: MealDraftGoal;
  preferences: Awaited<ReturnType<typeof getMyNutritionPreferences>>;
  feedback: Awaited<ReturnType<typeof listMyMealFeedback>>;
  recentTemplateIds: string[];
  remainingCaloriesKcal: number | null;
  remainingProteinG: number | null;
}): MealDraft[] {
  const rankedFits = rankAdaptiveMealFits(
    {
      confirmedTemplateIds: input.recentTemplateIds,
      dietStyle: input.preferences.dietStyle,
      preferredCuisines: input.preferences.preferredCuisines,
      avoidedIngredients: input.preferences.avoidedIngredients,
      feedback: Object.fromEntries(
        input.feedback.map((item) => [item.templateId, item.preference]),
      ),
      remainingCaloriesKcal: input.remainingCaloriesKcal,
      remainingProteinG: input.remainingProteinG,
      learningEnabled: input.preferences.learningEnabled,
    },
    18,
  );
  const goalRanked = [...rankedFits].sort((left, right) => {
    if (input.goal === "desi") {
      const leftDesi = /bengali|desi/iu.test(left.template.cuisine) ? 1 : 0;
      const rightDesi = /bengali|desi/iu.test(right.template.cuisine) ? 1 : 0;
      return rightDesi - leftDesi;
    }
    if (input.goal === "high_protein") {
      return (
        right.template.nutritionPerServing.proteinG *
          right.recommendedServings -
        left.template.nutritionPerServing.proteinG * left.recommendedServings
      );
    }
    return 0;
  });
  return goalRanked
    .slice(0, 3)
    .map(({ template, reason, recommendedServings }) => {
      const nutrition = {
        caloriesKcal:
          template.nutritionPerServing.caloriesKcal * recommendedServings,
        proteinG: template.nutritionPerServing.proteinG * recommendedServings,
        carbsG: template.nutritionPerServing.carbsG * recommendedServings,
        fatG: template.nutritionPerServing.fatG * recommendedServings,
        fiberG: template.nutritionPerServing.fiberG * recommendedServings,
      };
      return {
        id: `catalog:${template.id}`,
        source: "catalog" as const,
        catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
        name: template.name,
        summary: `A ${template.cuisine} option selected from CUT's reviewed meal library.`,
        servingDescription: `${recommendedServings} serving${recommendedServings === 1 ? "" : "s"}`,
        estimatedPrepMinutes: 30,
        ingredients: [...template.ingredients],
        instructions: [
          "Review the ingredient amounts and adjust them for the food you use.",
          "Prepare the ingredients safely, then confirm the final nutrition before logging.",
        ],
        allergens: [...template.commonAllergens],
        ...sumNutrition([nutrition]),
        whyItFits: reason,
        reviewRequired: true as const,
      };
    });
}

async function reserveDailyRequest(
  userId: string,
  usageDay: string,
  limit: number,
  clock: Clock,
): Promise<boolean> {
  await db
    .insert(aiMealUsageTable)
    .values({ userId, usageDay })
    .onConflictDoNothing({
      target: [aiMealUsageTable.userId, aiMealUsageTable.usageDay],
    });
  const [reserved] = await db
    .update(aiMealUsageTable)
    .set({
      requestCount: sql`${aiMealUsageTable.requestCount} + 1`,
      updatedAt: clock.now(),
    })
    .where(
      and(
        eq(aiMealUsageTable.userId, userId),
        eq(aiMealUsageTable.usageDay, usageDay),
        lt(aiMealUsageTable.requestCount, limit),
      ),
    )
    .returning({ requestCount: aiMealUsageTable.requestCount });
  return Boolean(reserved);
}

async function addUsageTokens(
  userId: string,
  usageDay: string,
  inputTokens: number,
  outputTokens: number,
  clock: Clock,
): Promise<void> {
  await db
    .update(aiMealUsageTable)
    .set({
      inputTokens: sql`${aiMealUsageTable.inputTokens} + ${inputTokens}`,
      outputTokens: sql`${aiMealUsageTable.outputTokens} + ${outputTokens}`,
      updatedAt: clock.now(),
    })
    .where(
      and(
        eq(aiMealUsageTable.userId, userId),
        eq(aiMealUsageTable.usageDay, usageDay),
      ),
    );
}

export async function createMyMealDrafts(
  user: User,
  rawInput: CreateMealDraftInput,
  deviceTimeZone: string,
  options: {
    provider?: AiMealProvider;
    clock?: Clock;
    logger?: Pick<Logger, "warn">;
  } = {},
): Promise<MealDraftResult> {
  const clock = options.clock ?? systemClock;
  const provider = options.provider ?? getAiMealProvider();
  const input: CreateMealDraftInput = {
    ...rawInput,
    availableIngredients: normalizedTerms(rawInput.availableIngredients, 20),
    notes: rawInput.notes.trim().replace(/\s+/gu, " ").slice(0, 300),
  };
  const localDay = todayKey(clock, deviceTimeZone);
  // Paid-call accounting uses UTC so changing the device timezone cannot reset
  // the quota. Meal targets still use the person's actual local calendar day.
  const usageDay = todayKey(clock, "UTC");
  const [preferences, feedback, recentRows, todayEntries] = await Promise.all([
    getMyNutritionPreferences(user.id),
    listMyMealFeedback(user.id),
    db
      .select({
        templateId: mealEntriesTable.templateId,
        name: mealEntriesTable.name,
      })
      .from(mealEntriesTable)
      .where(eq(mealEntriesTable.userId, user.id))
      .orderBy(desc(mealEntriesTable.createdAt), desc(mealEntriesTable.id))
      .limit(30),
    getMealEntriesForDay(user.id, localDay),
  ]);
  const totals = nutritionTotals(todayEntries);
  const remainingCaloriesKcal =
    preferences.dailyCalorieTarget === null
      ? null
      : Math.max(0, preferences.dailyCalorieTarget - totals.caloriesKcal);
  const remainingProteinG =
    preferences.dailyProteinTargetG === null
      ? null
      : Math.max(0, preferences.dailyProteinTargetG - totals.proteinG);
  const fallback = () =>
    fallbackDrafts({
      goal: input.goal,
      preferences,
      feedback,
      recentTemplateIds: recentRows.map((row) => row.templateId),
      remainingCaloriesKcal,
      remainingProteinG,
    });

  if (!provider.enabled) {
    return {
      source: "catalog",
      drafts: fallback(),
      notice:
        "CUT used its private meal library. AI meal creation is not enabled, and no data was sent to an AI provider.",
    };
  }

  const reserved = await reserveDailyRequest(
    user.id,
    usageDay,
    provider.dailyLimit,
    clock,
  );
  if (!reserved) {
    return {
      source: "catalog",
      drafts: fallback(),
      notice:
        "Today's AI meal limit was reached, so CUT used its private meal library instead.",
    };
  }

  const avoided = normalizedTerms(preferences.avoidedIngredients, 20);
  const allowedFoods = CURATED_FOOD_CATALOG.filter(
    (food) =>
      curatedFoodSupportsDiet(food, preferences.dietStyle) &&
      !containsAvoidedTerm(food, avoided),
  );
  try {
    const result = await provider.generate({
      userId: user.id,
      request: input,
      context: {
        dietStyle: preferences.dietStyle,
        preferredCuisines: [...preferences.preferredCuisines],
        avoidedIngredients: avoided,
        remainingCaloriesKcal,
        remainingProteinG,
        recentConfirmedMeals: preferences.learningEnabled
          ? recentRows.map((row) => row.name).slice(0, 12)
          : [],
      },
      allowedFoods: allowedFoods.map((food) => ({
        id: food.id,
        name: food.name,
        aliases: [...food.aliases],
        servingGrams: food.servingGrams,
        ...food.nutritionPerServing,
      })),
    });
    await addUsageTokens(
      user.id,
      usageDay,
      result.inputTokens,
      result.outputTokens,
      clock,
    );
    const allowedIds = new Set(allowedFoods.map((food) => food.id));
    const drafts = result.candidates
      .filter(
        (candidate) => candidate.estimatedPrepMinutes <= input.maxPrepMinutes,
      )
      .map((candidate) =>
        candidateToDraft(
          candidate,
          allowedIds,
          remainingCaloriesKcal,
          remainingProteinG,
        ),
      )
      .filter((draft): draft is MealDraft => draft !== null);
    if (drafts.length === 0) throw new Error("no_valid_drafts");
    return {
      source: "ai",
      drafts,
      notice:
        "AI drafted these meals from CUT's allowed food catalog. CUT calculated the estimates; review every ingredient and portion before logging.",
    };
  } catch {
    options.logger?.warn(
      { errorCode: "ai_meal_generation_failed" },
      "AI meal generation failed; catalog fallback used",
    );
    return {
      source: "catalog",
      drafts: fallback(),
      notice:
        "AI meal creation was unavailable, so CUT used its private meal library instead. No meal was logged.",
    };
  }
}
