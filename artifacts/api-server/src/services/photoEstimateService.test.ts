import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const budget = vi.hoisted(() => ({ reserve: vi.fn(), settle: vi.fn() }));
vi.mock("./mealDraftService", () => ({
  reserveAiRequest: budget.reserve,
  settleAiRequest: budget.settle,
}));
import {
  estimateFoodPhoto,
  parsePhotoRequest,
  parsePhotoEstimate,
} from "./photoEstimateService";

// Minimal JPEG container with an EXIF segment and a scan; provider is mocked.
const jpeg = Buffer.from([
  255, 216, 255, 225, 0, 6, 71, 80, 83, 33, 255, 218, 0, 2, 10, 255, 217,
]).toString("base64");
const estimate = {
  foodVisible: true,
  name: "Rice and dal",
  servingDescription: "1 pictured plate",
  uncertainty: "Oil and portion size are uncertain.",
  caloriesKcal: 500,
  proteinG: 20,
  carbsG: 70,
  fatG: 15,
  fiberG: 9,
};
beforeEach(() => {
  vi.stubEnv("CUT_AI_MEALS_ENABLED", "true");
  vi.stubEnv("OPENAI_API_KEY", "sk-test-only-photo-not-a-real-key");
  vi.stubEnv("CUT_AI_MEAL_MODEL", "gpt-5.6-luna");
  vi.stubEnv("CUT_AI_MEAL_USER_DAILY_LIMIT", "5");
  budget.reserve.mockReset().mockResolvedValue("reserved");
  budget.settle.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
const reply = (value: unknown = estimate) =>
  new Response(
    JSON.stringify({
      usage: { input_tokens: 400, output_tokens: 200 },
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(value) }],
        },
      ],
    }),
  );

describe("Pro photo estimates", () => {
  it("requires explicit consent and a bounded JPEG, never arbitrary URLs", () => {
    expect(() =>
      parsePhotoRequest({ imageBase64: jpeg, consent: false }),
    ).toThrow();
    expect(() =>
      parsePhotoRequest({ imageBase64: "a".repeat(400004), consent: true }),
    ).toThrow();
    expect(() =>
      parsePhotoRequest({ imageBase64: "https://internal/", consent: true }),
    ).toThrow();
    expect(() =>
      parsePhotoRequest({ imageBase64: jpeg, consent: true, userId: "spoof" }),
    ).toThrow();
    const stripped = Buffer.from(
      parsePhotoRequest({ imageBase64: jpeg, consent: true }),
      "base64",
    );
    expect(stripped.includes(Buffer.from("GPS!"))).toBe(false);
  });
  it("returns only bounded food estimates", () => {
    expect(parsePhotoEstimate(estimate).name).toBe("Rice and dal");
    expect(() =>
      parsePhotoEstimate({ ...estimate, foodVisible: false }),
    ).toThrow();
    expect(() => parsePhotoEstimate({ ...estimate, proteinG: -1 })).toThrow();
    expect(() =>
      parsePhotoEstimate({ ...estimate, caloriesKcal: Infinity }),
    ).toThrow();
    expect(() => parsePhotoEstimate({ ...estimate, name: "" })).toThrow();
  });
  it("uses the existing allowance, sends no user identity, disables storage and uses low image detail", async () => {
    const fetcher = vi.fn().mockResolvedValue(reply());
    await expect(
      estimateFoodPhoto("internal-user", jpeg, fetcher),
    ).resolves.toMatchObject({ name: "Rice and dal" });
    expect(budget.reserve.mock.calls[0][0]).toBe("internal-user");
    expect(budget.reserve.mock.calls[0][2]).toBe(5);
    const payload = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(payload.store).toBe(false);
    expect(payload.input[0].content[1].detail).toBe("low");
    expect(JSON.stringify(payload)).not.toContain("internal-user");
    expect(budget.settle.mock.calls[0].slice(2, 5)).toEqual([400, 200, true]);
  });
  it.each(["daily_limit", "monthly_budget"])(
    "never calls provider when %s is reached",
    async (limit) => {
      budget.reserve.mockResolvedValue(limit);
      const fetcher = vi.fn();
      await expect(estimateFoodPhoto("u", jpeg, fetcher)).rejects.toMatchObject(
        { statusCode: 429 },
      );
      expect(fetcher).not.toHaveBeenCalled();
      expect(budget.settle).not.toHaveBeenCalled();
    },
  );
  it("never calls provider when disabled", async () => {
    vi.stubEnv("CUT_AI_MEALS_ENABLED", "false");
    const fetcher = vi.fn();
    await expect(estimateFoodPhoto("u", jpeg, fetcher)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(budget.reserve).not.toHaveBeenCalled();
  });
  it("charges unknown failures conservatively without returning provider secrets", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error("private_photo_and_key"));
    await expect(estimateFoodPhoto("u", jpeg, fetcher)).rejects.toThrow(
      "Photo analysis did not finish",
    );
    expect(budget.settle.mock.calls[0].slice(2, 5)).toEqual([0, 0, false]);
  });
  it("rejects non-food without inventing a meal", async () => {
    await expect(
      estimateFoodPhoto(
        "u",
        jpeg,
        vi.fn().mockResolvedValue(reply({ ...estimate, foodVisible: false })),
      ),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
