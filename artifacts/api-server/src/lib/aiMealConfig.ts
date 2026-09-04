import { parseBoundedInteger } from "./boundedInteger";

export const AI_MEAL_DAILY_LIMIT_MAXIMUM = 20;
export const AI_MEAL_TIMEOUT_MS = 20_000;
export const AI_MEAL_MAX_OUTPUT_TOKENS = 1_600;
/** Recommended after the owner separately approves provider spend and a key. */
export const AI_MEAL_RECOMMENDED_MODEL = "gpt-5.6-luna";

export type AiMealConfigurationIssue =
  | "CUT_AI_MEALS_ENABLED"
  | "OPENAI_API_KEY"
  | "CUT_AI_MEAL_MODEL"
  | "CUT_AI_MEAL_USER_DAILY_LIMIT";

export type AiMealConfiguration =
  | { enabled: false }
  | {
      enabled: true;
      apiKey: string;
      model: string;
      userDailyLimit: number;
    };

function validApiKey(value: string | undefined): value is string {
  return Boolean(
    value &&
    value === value.trim() &&
    value.length >= 24 &&
    value.length <= 512 &&
    /^sk-[A-Za-z0-9_-]+$/u.test(value),
  );
}

function validModel(value: string | undefined): value is string {
  return Boolean(
    value &&
    value === value.trim() &&
    value.length <= 80 &&
    /^[a-z0-9][a-z0-9._-]+$/u.test(value),
  );
}

export function validateAiMealConfiguration(
  env: NodeJS.ProcessEnv,
): AiMealConfigurationIssue[] {
  const enabled = env.CUT_AI_MEALS_ENABLED;
  if (enabled === undefined || enabled === "false") return [];
  if (enabled !== "true") return ["CUT_AI_MEALS_ENABLED"];

  const issues: AiMealConfigurationIssue[] = [];
  if (!validApiKey(env.OPENAI_API_KEY)) issues.push("OPENAI_API_KEY");
  if (!validModel(env.CUT_AI_MEAL_MODEL)) issues.push("CUT_AI_MEAL_MODEL");
  if (
    !env.CUT_AI_MEAL_USER_DAILY_LIMIT ||
    parseBoundedInteger(env.CUT_AI_MEAL_USER_DAILY_LIMIT, {
      minimum: 1,
      maximum: AI_MEAL_DAILY_LIMIT_MAXIMUM,
      defaultValue: 5,
    }) === null
  ) {
    issues.push("CUT_AI_MEAL_USER_DAILY_LIMIT");
  }
  return issues;
}

export class AiMealConfigurationError extends Error {
  readonly issues: readonly AiMealConfigurationIssue[];

  constructor(issues: readonly AiMealConfigurationIssue[]) {
    super(`Invalid AI meal configuration: ${issues.join(", ")}`);
    this.name = "AiMealConfigurationError";
    this.issues = [...issues];
  }
}

export function readAiMealConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): AiMealConfiguration {
  const issues = validateAiMealConfiguration(env);
  if (issues.length > 0) throw new AiMealConfigurationError(issues);
  if (env.CUT_AI_MEALS_ENABLED !== "true") return { enabled: false };

  return {
    enabled: true,
    apiKey: env.OPENAI_API_KEY!,
    model: env.CUT_AI_MEAL_MODEL!,
    userDailyLimit: Number(env.CUT_AI_MEAL_USER_DAILY_LIMIT),
  };
}
