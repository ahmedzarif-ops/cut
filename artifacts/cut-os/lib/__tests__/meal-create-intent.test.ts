import { describe, expect, it, vi } from "vitest";

import {
  MEAL_CREATE_INTENT_STATE,
  MEAL_CREATE_INTENT_VERSION,
  MealCreatePrincipalChangedError,
  createPendingMealIntent,
  executeOwnedMealCreate,
  parsePendingMealIntent,
  pendingMealCreateKey,
  serializePendingMealIntent,
} from "../meal-create-intent";

const ownerClerkUserId = "user_owner/one";
const clientRequestId = "018f47a3-7b2d-7a32-8a6b-5c4112eed610";

function validIntent() {
  return createPendingMealIntent({
    ownerClerkUserId,
    clientRequestId,
    mealTemplateId: "bengali-chicken-curry-plate",
    mealName: "Bengali Chicken Curry Plate",
    catalogVersion: "2026-08-03.1",
    dayKey: "2026-08-03",
    servings: 1.25,
    createdAt: "2026-08-03T15:00:00.000Z",
  });
}

describe("pending meal create recovery", () => {
  it("round-trips the exact owner and idempotent payload", () => {
    const intent = validIntent();
    expect(
      parsePendingMealIntent(
        serializePendingMealIntent(intent),
        ownerClerkUserId,
      ),
    ).toEqual({
      version: MEAL_CREATE_INTENT_VERSION,
      state: MEAL_CREATE_INTENT_STATE,
      ownerClerkUserId,
      clientRequestId,
      mealTemplateId: "bengali-chicken-curry-plate",
      mealName: "Bengali Chicken Curry Plate",
      catalogVersion: "2026-08-03.1",
      dayKey: "2026-08-03",
      servings: 1.25,
      createdAt: "2026-08-03T15:00:00.000Z",
    });
  });

  it("uses legal, owner-isolated SecureStore keys", () => {
    const ownerKey = pendingMealCreateKey(ownerClerkUserId);
    const otherKey = pendingMealCreateKey("user_owner/two");
    expect(ownerKey).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(ownerKey).not.toBe(otherKey);
  });

  it("returns null only when no intent exists", () => {
    expect(parsePendingMealIntent(null, ownerClerkUserId)).toBeNull();
  });

  it("rejects another owner's or stale recovery data", () => {
    const serialized = serializePendingMealIntent(validIntent());
    expect(() => parsePendingMealIntent(serialized, "user_other")).toThrow(
      /another user/,
    );
    expect(() =>
      parsePendingMealIntent(
        JSON.stringify({ ...validIntent(), version: 0 }),
        ownerClerkUserId,
      ),
    ).toThrow(/stale version/);
  });

  it("rejects corrupt UUID, serving, version, and timestamp values", () => {
    for (const invalid of [
      { ...validIntent(), clientRequestId: "not-a-uuid" },
      { ...validIntent(), servings: 1.1 },
      { ...validIntent(), catalogVersion: "" },
      { ...validIntent(), mealName: "" },
      { ...validIntent(), dayKey: "08/03/2026" },
      { ...validIntent(), createdAt: "yesterday" },
    ]) {
      expect(() =>
        parsePendingMealIntent(JSON.stringify(invalid), ownerClerkUserId),
      ).toThrow(/corrupt/);
    }
  });

  it("stops before sending if the principal changes during persistence", async () => {
    let current = { userId: "user_a", sessionId: "session_a" };
    const sendRequest = vi.fn();

    await expect(
      executeOwnedMealCreate({
        ownerUserId: "user_a",
        ownerSessionId: "session_a",
        currentPrincipal: () => current,
        getToken: async () => "token_a",
        persistIntent: async () => {
          current = { userId: "user_b", sessionId: "session_b" };
        },
        sendRequest,
      }),
    ).rejects.toBeInstanceOf(MealCreatePrincipalChangedError);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("passes the captured owner token to the request", async () => {
    const sendRequest = vi.fn().mockResolvedValue("saved");
    const result = await executeOwnedMealCreate({
      ownerUserId: "user_a",
      ownerSessionId: "session_a",
      currentPrincipal: () => ({
        userId: "user_a",
        sessionId: "session_a",
      }),
      getToken: async () => "token_a",
      persistIntent: async () => undefined,
      sendRequest,
    });

    expect(result).toBe("saved");
    expect(sendRequest).toHaveBeenCalledWith("token_a");
  });
});
