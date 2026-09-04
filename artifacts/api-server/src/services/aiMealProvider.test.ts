import { describe, expect, it, vi } from "vitest";

import {
  OpenAiMealProvider,
  type AiMealGenerationInput,
} from "./aiMealProvider";

const input: AiMealGenerationInput = {
  userId: "40d65cff-a87f-4c3e-b758-d9576d08159b",
  request: {
    goal: "desi",
    mealTime: "dinner",
    maxPrepMinutes: 30,
    availableIngredients: ["rice"],
    notes: "simple",
  },
  context: {
    dietStyle: "omnivore",
    preferredCuisines: ["Desi"],
    avoidedIngredients: [],
    remainingCaloriesKcal: 650,
    remainingProteinG: 55,
    recentConfirmedMeals: ["Dal bowl"],
    likedMeals: ["Chicken curry plate"],
    notForMeMeals: ["Tofu bowl"],
  },
  allowedFoods: [
    {
      id: "rice-white-cooked",
      name: "White rice, cooked",
      aliases: ["bhaat"],
      servingGrams: 150,
      caloriesKcal: 195,
      proteinG: 4,
      carbsG: 42.3,
      fatG: 0.4,
      fiberG: 0.6,
    },
    {
      id: "lentils-cooked",
      name: "Lentils, cooked",
      aliases: ["dal"],
      servingGrams: 180,
      caloriesKcal: 209,
      proteinG: 16.2,
      carbsG: 36.2,
      fatG: 0.7,
      fiberG: 14.2,
    },
  ],
};

function openAiProvider(fetcher: typeof fetch) {
  return new OpenAiMealProvider(
    {
      enabled: true,
      apiKey: ["sk", "proj", "ProviderKeyForCUTMeals1234"].join("-"),
      model: "gpt-5-mini",
      userDailyLimit: 5,
    },
    fetcher,
  );
}

describe("OpenAI meal provider adapter", () => {
  it("uses stateless structured output with fixed limits and a hashed safety identifier", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              candidates: [
                {
                  name: "Dal rice bowl",
                  summary: "A simple Desi bowl.",
                  estimatedPrepMinutes: 20,
                  ingredients: [
                    {
                      foodId: "lentils-cooked",
                      grams: 180,
                      preparation: "warm",
                    },
                    {
                      foodId: "rice-white-cooked",
                      grams: 150,
                      preparation: "warm",
                    },
                  ],
                  instructions: ["Warm both foods.", "Plate and review."],
                  whyItFits: "Matches the request.",
                },
              ],
            }),
            usage: { input_tokens: 420, output_tokens: 160 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    const provider = openAiProvider(fetcher as unknown as typeof fetch);
    const result = await provider.generate(input);

    expect(result).toMatchObject({ inputTokens: 420, outputTokens: 160 });
    expect(result.candidates[0]?.name).toBe("Dal rice bowl");
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      Parameters<typeof fetch>[0],
      NonNullable<Parameters<typeof fetch>[1]>,
    ];
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "gpt-5-mini",
      store: false,
      max_output_tokens: 1600,
      text: {
        format: {
          type: "json_schema",
          name: "cut_meal_drafts",
          strict: true,
        },
      },
    });
    expect(body.safety_identifier).toMatch(/^[a-f0-9]{64}$/u);
    expect(body.safety_identifier).not.toBe(input.userId);
    expect(JSON.stringify(body)).not.toContain("ProviderKeyForCUTMeals");
  });

  it("rejects malformed provider output without exposing it", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ output_text: "not json" }), {
          status: 200,
        }),
    );
    await expect(
      openAiProvider(fetcher as unknown as typeof fetch).generate(input),
    ).rejects.toMatchObject({
      name: "AiMealProviderError",
      reason: "provider_response",
    });
  });
});
