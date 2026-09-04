import { createHash } from "node:crypto";
import {
  AI_MEAL_MAX_OUTPUT_TOKENS,
  AI_MEAL_TIMEOUT_MS,
  readAiMealConfiguration,
  type AiMealConfiguration,
} from "../lib/aiMealConfig";

export interface AiMealIngredientChoice {
  foodId: string;
  grams: number;
  preparation: string;
}

export interface AiMealCandidate {
  name: string;
  summary: string;
  estimatedPrepMinutes: number;
  ingredients: AiMealIngredientChoice[];
  instructions: string[];
  whyItFits: string;
}

export interface AiMealGenerationInput {
  userId: string;
  request: {
    goal: "balanced" | "high_protein" | "quick" | "desi";
    mealTime: "any" | "breakfast" | "lunch" | "dinner" | "snack";
    maxPrepMinutes: number;
    availableIngredients: string[];
    notes: string;
  };
  context: {
    dietStyle: string;
    preferredCuisines: string[];
    avoidedIngredients: string[];
    remainingCaloriesKcal: number | null;
    remainingProteinG: number | null;
    recentConfirmedMeals: string[];
    likedMeals: string[];
    notForMeMeals: string[];
  };
  allowedFoods: Array<{
    id: string;
    name: string;
    aliases: string[];
    servingGrams: number;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  }>;
}

export interface AiMealGenerationResult {
  candidates: AiMealCandidate[];
  inputTokens: number;
  outputTokens: number;
}

export interface AiMealProvider {
  readonly enabled: boolean;
  readonly dailyLimit: number;
  generate(input: AiMealGenerationInput): Promise<AiMealGenerationResult>;
}

export class AiMealProviderError extends Error {
  readonly reason:
    "disabled" | "timeout" | "provider_response" | "invalid_output";

  constructor(reason: AiMealProviderError["reason"]) {
    super(`AI meal provider failed: ${reason}`);
    this.name = "AiMealProviderError";
    this.reason = reason;
  }
}

const MEAL_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "summary",
          "estimatedPrepMinutes",
          "ingredients",
          "instructions",
          "whyItFits",
        ],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 80 },
          summary: { type: "string", minLength: 1, maxLength: 240 },
          estimatedPrepMinutes: { type: "integer", minimum: 1, maximum: 120 },
          ingredients: {
            type: "array",
            minItems: 2,
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["foodId", "grams", "preparation"],
              properties: {
                foodId: { type: "string", minLength: 1, maxLength: 80 },
                grams: { type: "number", minimum: 1, maximum: 1000 },
                preparation: { type: "string", minLength: 1, maxLength: 80 },
              },
            },
          },
          instructions: {
            type: "array",
            minItems: 2,
            maxItems: 8,
            items: { type: "string", minLength: 1, maxLength: 240 },
          },
          whyItFits: { type: "string", minLength: 1, maxLength: 300 },
        },
      },
    },
  },
} as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/gu, " ");
  return text && text.length <= maximum ? text : null;
}

function parseCandidates(value: unknown): AiMealCandidate[] | null {
  if (!isObject(value) || !Array.isArray(value.candidates)) return null;
  if (value.candidates.length < 1 || value.candidates.length > 3) return null;

  const parsed: AiMealCandidate[] = [];
  for (const raw of value.candidates) {
    if (!isObject(raw)) return null;
    const name = boundedText(raw.name, 80);
    const summary = boundedText(raw.summary, 240);
    const whyItFits = boundedText(raw.whyItFits, 300);
    const prep = raw.estimatedPrepMinutes;
    if (
      !name ||
      !summary ||
      !whyItFits ||
      !Number.isInteger(prep) ||
      (prep as number) < 1 ||
      (prep as number) > 120 ||
      !Array.isArray(raw.ingredients) ||
      raw.ingredients.length < 2 ||
      raw.ingredients.length > 12 ||
      !Array.isArray(raw.instructions) ||
      raw.instructions.length < 2 ||
      raw.instructions.length > 8
    ) {
      return null;
    }

    const ingredients: AiMealIngredientChoice[] = [];
    for (const ingredient of raw.ingredients) {
      if (!isObject(ingredient)) return null;
      const foodId = boundedText(ingredient.foodId, 80);
      const preparation = boundedText(ingredient.preparation, 80);
      const grams = ingredient.grams;
      if (
        !foodId ||
        !preparation ||
        typeof grams !== "number" ||
        !Number.isFinite(grams) ||
        grams < 1 ||
        grams > 1000
      ) {
        return null;
      }
      ingredients.push({ foodId, preparation, grams });
    }

    const instructions = raw.instructions.map((instruction) =>
      boundedText(instruction, 240),
    );
    if (instructions.some((instruction) => instruction === null)) return null;
    parsed.push({
      name,
      summary,
      whyItFits,
      estimatedPrepMinutes: prep as number,
      ingredients,
      instructions: instructions as string[],
    });
  }
  return parsed;
}

function outputText(body: Record<string, unknown>): string | null {
  if (typeof body.output_text === "string") return body.output_text;
  if (!Array.isArray(body.output)) return null;
  for (const item of body.output) {
    if (!isObject(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (
        isObject(content) &&
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }
  return null;
}

class DisabledAiMealProvider implements AiMealProvider {
  readonly enabled = false;
  readonly dailyLimit = 0;

  async generate(): Promise<never> {
    throw new AiMealProviderError("disabled");
  }
}

export class OpenAiMealProvider implements AiMealProvider {
  readonly enabled = true;
  readonly dailyLimit: number;

  constructor(
    private readonly config: Extract<AiMealConfiguration, { enabled: true }>,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.dailyLimit = config.userDailyLimit;
  }

  async generate(
    input: AiMealGenerationInput,
  ): Promise<AiMealGenerationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_MEAL_TIMEOUT_MS);
    try {
      const response = await this.fetcher(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.model,
            store: false,
            max_output_tokens: AI_MEAL_MAX_OUTPUT_TOKENS,
            safety_identifier: createHash("sha256")
              .update(`cut-ai-meal:${input.userId}`)
              .digest("hex"),
            instructions:
              "Create 1 to 3 practical meal drafts. Use only the provided allowedFoods IDs. Never infer allergies, diagnoses, religion, ethnicity, or identity. Treat avoided ingredients as preferences, not allergy guarantees. Respect the requested diet and prep limit. Nutrition will be calculated by CUT OS, so do not provide calorie or macro totals. Keep instructions simple. Every result is a draft that the user must review.",
            input: JSON.stringify({
              request: input.request,
              preferences: input.context,
              allowedFoods: input.allowedFoods,
            }),
            text: {
              format: {
                type: "json_schema",
                name: "cut_meal_drafts",
                strict: true,
                schema: MEAL_DRAFT_SCHEMA,
              },
            },
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new AiMealProviderError("provider_response");
      const text = await response.text();
      if (text.length > 262_144) {
        throw new AiMealProviderError("provider_response");
      }
      const body: unknown = JSON.parse(text);
      if (!isObject(body)) throw new AiMealProviderError("invalid_output");
      const generated = outputText(body);
      if (!generated) throw new AiMealProviderError("invalid_output");
      const candidates = parseCandidates(JSON.parse(generated));
      if (!candidates) throw new AiMealProviderError("invalid_output");

      const usage = isObject(body.usage) ? body.usage : {};
      return {
        candidates,
        inputTokens:
          typeof usage.input_tokens === "number" &&
          Number.isSafeInteger(usage.input_tokens) &&
          usage.input_tokens >= 0
            ? usage.input_tokens
            : 0,
        outputTokens:
          typeof usage.output_tokens === "number" &&
          Number.isSafeInteger(usage.output_tokens) &&
          usage.output_tokens >= 0
            ? usage.output_tokens
            : 0,
      };
    } catch (error) {
      if (error instanceof AiMealProviderError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiMealProviderError("timeout");
      }
      throw new AiMealProviderError("provider_response");
    } finally {
      clearTimeout(timeout);
    }
  }
}

let providerOverride: AiMealProvider | null = null;

export function setAiMealProviderForTests(
  provider: AiMealProvider | null,
): void {
  providerOverride = provider;
}

export function getAiMealProvider(): AiMealProvider {
  if (providerOverride) return providerOverride;
  const config = readAiMealConfiguration();
  return config.enabled
    ? new OpenAiMealProvider(config)
    : new DisabledAiMealProvider();
}
