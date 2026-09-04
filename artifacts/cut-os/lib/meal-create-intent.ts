import { MAX_MEAL_SERVINGS, MIN_MEAL_SERVINGS } from "@workspace/domain";

export const MEAL_CREATE_INTENT_VERSION = 1 as const;
export const MEAL_CREATE_INTENT_STATE = "pending" as const;

export interface PendingMealCreateIntent {
  version: typeof MEAL_CREATE_INTENT_VERSION;
  state: typeof MEAL_CREATE_INTENT_STATE;
  ownerClerkUserId: string;
  clientRequestId: string;
  mealTemplateId: string;
  mealName: string;
  catalogVersion: string;
  dayKey: string;
  servings: number;
  createdAt: string;
}

export interface CreatePendingMealIntentInput {
  ownerClerkUserId: string;
  clientRequestId: string;
  mealTemplateId: string;
  mealName: string;
  catalogVersion: string;
  dayKey: string;
  servings: number;
  createdAt: string;
}

const KEY_PREFIX = "cut_os.meal_create.v1.";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Owner-specific key prevents a pending log for user A appearing for user B. */
export function pendingMealCreateKey(clerkUserId: string): string {
  if (clerkUserId.trim() === "") {
    throw new Error("A Clerk user ID is required for meal recovery state.");
  }

  const encodedUserId = Array.from(clerkUserId, (character) =>
    character.codePointAt(0)!.toString(16),
  ).join("_");
  return `${KEY_PREFIX}${encodedUserId}`;
}

export function createPendingMealIntent(
  input: CreatePendingMealIntentInput,
): PendingMealCreateIntent {
  validateIntent(input, input.ownerClerkUserId);
  return {
    version: MEAL_CREATE_INTENT_VERSION,
    state: MEAL_CREATE_INTENT_STATE,
    ...input,
  };
}

export function serializePendingMealIntent(
  intent: PendingMealCreateIntent,
): string {
  validateIntent(intent, intent.ownerClerkUserId);
  return JSON.stringify(intent);
}

/** Null means no recovery. Corrupt, stale, or cross-owner state fails closed. */
export function parsePendingMealIntent(
  storedValue: string | null,
  expectedClerkUserId: string,
): PendingMealCreateIntent | null {
  if (storedValue === null) return null;

  let candidate: unknown;
  try {
    candidate = JSON.parse(storedValue);
  } catch {
    throw new Error("Meal recovery data is corrupt.");
  }
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Meal recovery data is corrupt.");
  }

  const record = candidate as Record<string, unknown>;
  if (record.version !== MEAL_CREATE_INTENT_VERSION) {
    throw new Error("Meal recovery data uses a stale version.");
  }
  if (record.state !== MEAL_CREATE_INTENT_STATE) {
    throw new Error("Meal recovery data has an unknown state.");
  }
  validateIntent(record, expectedClerkUserId);

  return {
    version: MEAL_CREATE_INTENT_VERSION,
    state: MEAL_CREATE_INTENT_STATE,
    ownerClerkUserId: expectedClerkUserId,
    clientRequestId: record.clientRequestId as string,
    mealTemplateId: record.mealTemplateId as string,
    mealName: record.mealName as string,
    catalogVersion: record.catalogVersion as string,
    dayKey: record.dayKey as string,
    servings: record.servings as number,
    createdAt: record.createdAt as string,
  };
}

function validateIntent(
  candidate: Record<string, unknown> | CreatePendingMealIntentInput,
  expectedClerkUserId: string,
): void {
  if (
    expectedClerkUserId.trim() === "" ||
    candidate.ownerClerkUserId !== expectedClerkUserId
  ) {
    throw new Error("Meal recovery data belongs to another user.");
  }
  if (
    typeof candidate.clientRequestId !== "string" ||
    !UUID_PATTERN.test(candidate.clientRequestId) ||
    typeof candidate.mealTemplateId !== "string" ||
    candidate.mealTemplateId.trim() === "" ||
    typeof candidate.mealName !== "string" ||
    candidate.mealName.trim() === "" ||
    typeof candidate.catalogVersion !== "string" ||
    candidate.catalogVersion.trim() === "" ||
    typeof candidate.dayKey !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(candidate.dayKey) ||
    typeof candidate.servings !== "number" ||
    !Number.isFinite(candidate.servings) ||
    candidate.servings < MIN_MEAL_SERVINGS ||
    candidate.servings > MAX_MEAL_SERVINGS ||
    Math.abs(candidate.servings * 4 - Math.round(candidate.servings * 4)) >
      Number.EPSILON ||
    typeof candidate.createdAt !== "string" ||
    !isCanonicalTimestamp(candidate.createdAt)
  ) {
    throw new Error("Meal recovery data is corrupt.");
  }
}

function isCanonicalTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export interface MealCreatePrincipal {
  userId: string | null;
  sessionId: string | null;
}

export class MealCreatePrincipalChangedError extends Error {
  constructor() {
    super("The active meal-create principal changed.");
    this.name = "MealCreatePrincipalChangedError";
  }
}

/**
 * Capture one session across every async boundary of a destructive/private
 * write. The explicit token returned here must be attached to the request so a
 * module-global token getter for a later principal can never take over.
 */
export async function executeOwnedMealCreate<T>(input: {
  ownerUserId: string;
  ownerSessionId: string;
  currentPrincipal(): MealCreatePrincipal;
  getToken(): Promise<string | null>;
  persistIntent(): Promise<void>;
  sendRequest(token: string): Promise<T>;
}): Promise<T> {
  const assertOwner = () => {
    const current = input.currentPrincipal();
    if (
      current.userId !== input.ownerUserId ||
      current.sessionId !== input.ownerSessionId
    ) {
      throw new MealCreatePrincipalChangedError();
    }
  };

  assertOwner();
  const token = await input.getToken();
  assertOwner();
  if (!token) throw new Error("A meal authorization token is unavailable.");

  await input.persistIntent();
  assertOwner();

  const result = await input.sendRequest(token);
  assertOwner();
  return result;
}
