import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiMealUsageTable } from "@workspace/db";

import { createTestContext, type TestContext } from "../test/helpers";
import type { AiMealGenerationInput, AiMealProvider } from "./aiMealProvider";
import { createMyMealDrafts } from "./mealDraftService";
import {
  upsertMyMealFeedback,
  upsertMyNutritionPreferences,
} from "./nutritionService";
import { provisionUser } from "./userService";

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.close();
});

async function user(id: string) {
  const row = await provisionUser({ clerkUserId: id, email: null });
  if (!row) throw new Error("Test user was not provisioned");
  return row;
}

const request = {
  goal: "desi" as const,
  mealTime: "dinner" as const,
  maxPrepMinutes: 30,
  availableIngredients: [" chicken ", "rice", "chicken"],
  notes: "  Keep it simple.  ",
};

function provider(
  dailyLimit: number,
  implementation: (input: AiMealGenerationInput) => Promise<{
    candidates: Array<{
      name: string;
      summary: string;
      estimatedPrepMinutes: number;
      ingredients: Array<{
        foodId: string;
        grams: number;
        preparation: string;
      }>;
      instructions: string[];
      whyItFits: string;
    }>;
    inputTokens: number;
    outputTokens: number;
  }>,
): AiMealProvider {
  return { enabled: true, dailyLimit, generate: implementation };
}

describe("personalized meal draft service", () => {
  it("keeps useful private catalog results when paid AI is disabled", async () => {
    const owner = await user("meal_draft_fallback");
    const result = await createMyMealDrafts(owner, request, "UTC", {
      provider: {
        enabled: false,
        dailyLimit: 0,
        async generate() {
          throw new Error("must not run");
        },
      },
    });

    expect(result.source).toBe("catalog");
    expect(result.drafts).toHaveLength(3);
    expect(result.drafts.every((draft) => draft.reviewRequired)).toBe(true);
    expect(
      result.drafts.every((draft) => /bengali|desi/iu.test(draft.summary)),
    ).toBe(true);
    expect(result.notice).toContain("no data was sent");
    expect(await ctx.db.select().from(aiMealUsageTable)).toEqual([]);
  });

  it("sends only bounded preferences and catalog food facts, then calculates nutrition itself", async () => {
    const owner = await user("meal_draft_ai");
    await upsertMyNutritionPreferences(owner.id, {
      dailyCalorieTarget: 2_000,
      dailyProteinTargetG: 160,
      dietStyle: "omnivore",
      preferredCuisines: ["Desi"],
      avoidedIngredients: ["peanut"],
      learningEnabled: true,
    });
    await upsertMyMealFeedback(
      owner.id,
      "bengali-chicken-curry-plate",
      "liked",
    );
    const generate = vi.fn(async (input: AiMealGenerationInput) => {
      expect(input.userId).toBe(owner.id);
      expect(input.request).toEqual({
        ...request,
        availableIngredients: ["chicken", "rice"],
        notes: "Keep it simple.",
      });
      expect(input.context).toMatchObject({
        dietStyle: "omnivore",
        preferredCuisines: ["Desi"],
        avoidedIngredients: ["peanut"],
        likedMeals: ["Bengali Chicken Curry Plate"],
        notForMeMeals: [],
      });
      expect(
        input.allowedFoods.some((food) => food.id === "chicken-breast-roasted"),
      ).toBe(true);
      expect(JSON.stringify(input)).not.toContain("@example.com");
      return {
        candidates: [
          {
            name: "Simple chicken rice plate",
            summary: "A quick Desi-inspired plate.",
            estimatedPrepMinutes: 25,
            ingredients: [
              {
                foodId: "chicken-breast-roasted",
                grams: 150,
                preparation: "slice",
              },
              {
                foodId: "rice-white-cooked",
                grams: 150,
                preparation: "warm",
              },
              {
                foodId: "spinach-cooked",
                grams: 100,
                preparation: "season",
              },
            ],
            instructions: ["Warm the rice.", "Plate and review portions."],
            whyItFits: "Untrusted provider nutrition copy is ignored.",
          },
        ],
        inputTokens: 500,
        outputTokens: 180,
      };
    });

    const result = await createMyMealDrafts(owner, request, "UTC", {
      provider: provider(5, generate),
    });
    expect(result.source).toBe("ai");
    expect(result.drafts).toEqual([
      expect.objectContaining({
        source: "ai",
        name: "Simple chicken rice plate",
        caloriesKcal: 466,
        proteinG: 53.5,
        carbsG: 46.1,
        fatG: 6.1,
        fiberG: 3,
        reviewRequired: true,
      }),
    ]);
    expect(result.drafts[0]?.whyItFits).not.toContain("Untrusted provider");

    const usage = await ctx.db.select().from(aiMealUsageTable);
    expect(usage).toEqual([
      expect.objectContaining({
        userId: owner.id,
        requestCount: 1,
        inputTokens: 500,
        outputTokens: 180,
        reservedCostMicrodollars: 0,
        spentCostMicrodollars: 316,
      }),
    ]);
  });

  it("enforces the persisted daily limit and falls back without a second provider call", async () => {
    const owner = await user("meal_draft_limit");
    const generate = vi.fn(async () => ({
      candidates: [
        {
          name: "Dal bowl",
          summary: "A simple bowl.",
          estimatedPrepMinutes: 20,
          ingredients: [
            {
              foodId: "lentils-cooked",
              grams: 180,
              preparation: "warm",
            },
            {
              foodId: "spinach-cooked",
              grams: 100,
              preparation: "stir in",
            },
          ],
          instructions: ["Warm the lentils.", "Add spinach."],
          whyItFits: "A draft.",
        },
      ],
      inputTokens: 100,
      outputTokens: 60,
    }));
    const ai = provider(1, generate);

    expect(
      (await createMyMealDrafts(owner, request, "UTC", { provider: ai }))
        .source,
    ).toBe("ai");
    const second = await createMyMealDrafts(owner, request, "UTC", {
      provider: ai,
    });
    expect(second.source).toBe("catalog");
    expect(second.notice).toContain("limit was reached");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("reserves worst-case spend and falls back before crossing the monthly dollar cap", async () => {
    const owner = await user("meal_draft_monthly_budget");
    const clock = { now: () => new Date("2026-09-04T12:00:00.000Z") };
    await ctx.db.insert(aiMealUsageTable).values({
      userId: owner.id,
      usageDay: "2026-09-01",
      spentCostMicrodollars: 985_000,
    });
    const generate = vi.fn(async () => {
      throw new Error("must not run");
    });

    const result = await createMyMealDrafts(owner, request, "UTC", {
      provider: provider(5, generate),
      clock,
    });

    expect(result.source).toBe("catalog");
    expect(result.notice).toContain("month's AI meal budget");
    expect(generate).not.toHaveBeenCalled();
    const usage = await ctx.db
      .select()
      .from(aiMealUsageTable)
      .orderBy(aiMealUsageTable.usageDay);
    expect(usage).toEqual([
      expect.objectContaining({
        usageDay: "2026-09-01",
        requestCount: 0,
        spentCostMicrodollars: 985_000,
      }),
      expect.objectContaining({
        usageDay: "2026-09-04",
        requestCount: 0,
        reservedCostMicrodollars: 0,
      }),
    ]);
  });

  it("charges the conservative maximum when a paid provider call fails", async () => {
    const owner = await user("meal_draft_failed_provider_budget");
    const clock = { now: () => new Date("2026-09-04T12:00:00.000Z") };
    const result = await createMyMealDrafts(owner, request, "UTC", {
      provider: provider(5, async () => {
        throw new Error("provider failed after dispatch");
      }),
      clock,
    });

    expect(result.source).toBe("catalog");
    const [usage] = await ctx.db.select().from(aiMealUsageTable);
    expect(usage).toMatchObject({
      requestCount: 1,
      inputTokens: 0,
      outputTokens: 0,
      reservedCostMicrodollars: 0,
      spentCostMicrodollars: 15_028,
    });
  });

  it("filters the provider catalog for the explicit diet and falls back on an invalid food choice", async () => {
    const owner = await user("meal_draft_vegan");
    await upsertMyNutritionPreferences(owner.id, {
      dailyCalorieTarget: null,
      dailyProteinTargetG: null,
      dietStyle: "vegan",
      preferredCuisines: [],
      avoidedIngredients: [],
      learningEnabled: false,
    });
    const generate = vi.fn(async (input: AiMealGenerationInput) => {
      expect(
        input.allowedFoods.some((food) => food.id.includes("chicken")),
      ).toBe(false);
      expect(
        input.allowedFoods.some((food) => food.id === "salmon-cooked"),
      ).toBe(false);
      expect(input.allowedFoods.some((food) => food.id === "tofu-firm")).toBe(
        true,
      );
      return {
        candidates: [
          {
            name: "Invalid result",
            summary: "Provider ignored its allowed list.",
            estimatedPrepMinutes: 20,
            ingredients: [
              {
                foodId: "chicken-breast-roasted",
                grams: 150,
                preparation: "cook",
              },
              {
                foodId: "rice-white-cooked",
                grams: 150,
                preparation: "warm",
              },
            ],
            instructions: ["Cook.", "Serve."],
            whyItFits: "It does not.",
          },
        ],
        inputTokens: 100,
        outputTokens: 50,
      };
    });
    const result = await createMyMealDrafts(owner, request, "UTC", {
      provider: provider(5, generate),
    });
    expect(result.source).toBe("catalog");
    expect(
      result.drafts.every((draft) => !draft.name.includes("Chicken")),
    ).toBe(true);
  });

  it("rejects an AI draft beyond the requested prep limit", async () => {
    const owner = await user("meal_draft_prep_limit");
    const result = await createMyMealDrafts(owner, request, "UTC", {
      provider: provider(5, async () => ({
        candidates: [
          {
            name: "Slow meal",
            summary: "This exceeds the person's limit.",
            estimatedPrepMinutes: 60,
            ingredients: [
              {
                foodId: "lentils-cooked",
                grams: 180,
                preparation: "cook slowly",
              },
            ],
            instructions: ["Cook for an hour.", "Serve."],
            whyItFits: "It does not fit the request.",
          },
        ],
        inputTokens: 80,
        outputTokens: 40,
      })),
    });

    expect(result.source).toBe("catalog");
    expect(result.drafts.every((draft) => draft.name !== "Slow meal")).toBe(
      true,
    );
  });
});
