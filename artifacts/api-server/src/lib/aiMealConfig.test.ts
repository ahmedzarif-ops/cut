import { describe, expect, it } from "vitest";

import {
  AiMealConfigurationError,
  readAiMealConfiguration,
  validateAiMealConfiguration,
} from "./aiMealConfig";

describe("AI meal configuration", () => {
  it("is disabled by default and never requires a provider key", () => {
    expect(validateAiMealConfiguration({})).toEqual([]);
    expect(readAiMealConfiguration({})).toEqual({ enabled: false });
    expect(readAiMealConfiguration({ CUT_AI_MEALS_ENABLED: "false" })).toEqual({
      enabled: false,
    });
  });

  it("requires an explicit key, model, and bounded daily limit when enabled", () => {
    expect(
      validateAiMealConfiguration({ CUT_AI_MEALS_ENABLED: "true" }),
    ).toEqual([
      "OPENAI_API_KEY",
      "CUT_AI_MEAL_MODEL",
      "CUT_AI_MEAL_USER_DAILY_LIMIT",
    ]);
    expect(() =>
      readAiMealConfiguration({ CUT_AI_MEALS_ENABLED: "yes" }),
    ).toThrow(AiMealConfigurationError);

    const configuration = readAiMealConfiguration({
      CUT_AI_MEALS_ENABLED: "true",
      OPENAI_API_KEY: ["sk", "proj", "ProviderKeyForCUTMeals1234"].join("-"),
      CUT_AI_MEAL_MODEL: "gpt-5-mini",
      CUT_AI_MEAL_USER_DAILY_LIMIT: "5",
    });
    expect(configuration).toMatchObject({
      enabled: true,
      model: "gpt-5-mini",
      userDailyLimit: 5,
    });
  });
});
