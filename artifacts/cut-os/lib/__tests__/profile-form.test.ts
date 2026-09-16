import { describe, expect, it, vi } from "vitest";
import type { Profile } from "@workspace/api-client-react";
import {
  EMPTY_FORM_STATE,
  ProfileSavePrincipalChangedError,
  convertProfileDraftUnits,
  convertProfileFormUnits,
  executeOwnedProfileSave,
  formStateToProfileInput,
  profileToFormState,
  toNumber,
} from "../profile-form";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

const fullProfile: Profile = {
  id: "9d9c8710-9d33-4c6c-9db0-cf8674a34c1e",
  userId: "1f0f8f2a-64a4-4a0e-a2ff-1a2b3c4d5e6f",
  displayName: "Zarif",
  goal: "cut",
  startWeightKg: 95.25,
  goalWeightKg: 86.18,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

describe("toNumber", () => {
  it("parses plain and decimal numbers", () => {
    expect(toNumber("180")).toBe(180);
    expect(toNumber("95.25")).toBeCloseTo(95.25);
  });

  it("returns undefined for blank or non-numeric input", () => {
    expect(toNumber("")).toBeUndefined();
    expect(toNumber("   ")).toBeUndefined();
    expect(toNumber("abc")).toBeUndefined();
    expect(toNumber("12abc")).toBeUndefined();
  });

  it("rejects non-finite values", () => {
    expect(toNumber("Infinity")).toBeUndefined();
    expect(toNumber("NaN")).toBeUndefined();
  });
});

describe("profileToFormState", () => {
  it("returns blank defaults when there is no profile (first onboarding)", () => {
    expect(profileToFormState(null)).toEqual(EMPTY_FORM_STATE);
    expect(profileToFormState(undefined)).toEqual(EMPTY_FORM_STATE);
  });

  it("seeds every paid-v1 field from an existing profile", () => {
    const form = profileToFormState(fullProfile);
    expect(form).toEqual({
      displayName: "Zarif",
      goal: "cut",
      startWeightKg: "95.25",
      goalWeightKg: "86.18",
    });
  });

  it("maps null optionals to empty strings", () => {
    const sparse: Profile = {
      ...fullProfile,
      displayName: null,
      startWeightKg: null,
      goalWeightKg: null,
    };
    const form = profileToFormState(sparse);
    expect(form.displayName).toBe("");
    expect(form.startWeightKg).toBe("");
    expect(form.goalWeightKg).toBe("");
  });
});

describe("minimal paid-v1 edit round-trip", () => {
  it("profile → form → input preserves every field v1 actually uses", () => {
    const input = formStateToProfileInput(profileToFormState(fullProfile));
    expect(input).toEqual({
      goal: "cut",
      displayName: "Zarif",
      startWeightKg: 95.25,
      goalWeightKg: 86.18,
    });
  });

  it("displays imperial values while preserving canonical kilograms", () => {
    const form = profileToFormState(fullProfile, "imperial");
    expect(form.startWeightKg).toBe("210");
    expect(form.goalWeightKg).toBe("190");

    const input = formStateToProfileInput(form, "imperial");
    expect(input.startWeightKg).toBeCloseTo(95.25, 1);
    expect(input.goalWeightKg).toBeCloseTo(86.18, 1);
  });

  it("converts visible fields when display units change without touching blanks", () => {
    const imperial = convertProfileFormUnits(
      {
        ...EMPTY_FORM_STATE,
        startWeightKg: "85",
        goalWeightKg: "",
      },
      "metric",
      "imperial",
    );
    expect(imperial.startWeightKg).toBe("187.4");
    expect(imperial.goalWeightKg).toBe("");

    const metric = convertProfileFormUnits(imperial, "imperial", "metric");
    expect(metric.startWeightKg).toBe("85");
  });

  it("keeps rapid unit transitions atomic with their visible weights", () => {
    const metric = {
      form: {
        ...EMPTY_FORM_STATE,
        startWeightKg: "85",
        goalWeightKg: "78",
      },
      units: "metric" as const,
    };

    const imperial = convertProfileDraftUnits(metric, "imperial");
    const backToMetric = convertProfileDraftUnits(imperial, "metric");
    const duplicateMetricTap = convertProfileDraftUnits(backToMetric, "metric");

    expect(imperial).toMatchObject({
      units: "imperial",
      form: { startWeightKg: "187.4", goalWeightKg: "172" },
    });
    expect(backToMetric).toMatchObject({
      units: "metric",
      form: { startWeightKg: "85", goalWeightKg: "78" },
    });
    expect(duplicateMetricTap).toBe(backToMetric);
  });

  it("still produces a minimal body for a brand-new user", () => {
    const input = formStateToProfileInput(profileToFormState(null));
    expect(input).toEqual({
      goal: "cut",
      displayName: undefined,
      startWeightKg: undefined,
      goalWeightKg: undefined,
    });
  });

  it("trims whitespace-only display names to undefined", () => {
    const form = { ...profileToFormState(fullProfile), displayName: "   " };
    expect(formStateToProfileInput(form).displayName).toBeUndefined();
  });
});

describe("owned profile save", () => {
  it("uses one explicit token for the full account/profile sequence", async () => {
    const current = { userId: "user-a", sessionId: "session-a" };
    const updateAccount = vi.fn(async () => undefined);
    const upsertProfile = vi.fn(async () => ({ id: "profile-a" }));
    const readAccount = vi.fn(async () => ({ id: "account-a" }));

    await expect(
      executeOwnedProfileSave({
        ownerUserId: "user-a",
        ownerSessionId: "session-a",
        currentPrincipal: () => current,
        getToken: async () => "token-a",
        updateAccount,
        upsertProfile,
        readAccount,
      }),
    ).resolves.toEqual({
      account: { id: "account-a" },
      profile: { id: "profile-a" },
    });

    expect(updateAccount).toHaveBeenCalledWith("token-a");
    expect(upsertProfile).toHaveBeenCalledWith("token-a");
    expect(readAccount).toHaveBeenCalledWith("token-a");
  });

  it("never writes profile data after the active principal changes", async () => {
    const current: { userId: string | null; sessionId: string | null } = {
      userId: "user-a",
      sessionId: "session-a",
    };
    const accountWrite = deferred<void>();
    const upsertProfile = vi.fn(async () => ({ id: "profile-a" }));
    const readAccount = vi.fn(async () => ({ id: "account-a" }));

    const operation = executeOwnedProfileSave({
      ownerUserId: "user-a",
      ownerSessionId: "session-a",
      currentPrincipal: () => current,
      getToken: async () => "token-a",
      updateAccount: () => accountWrite.promise,
      upsertProfile,
      readAccount,
    });
    current.userId = "user-b";
    current.sessionId = "session-b";
    accountWrite.resolve();

    await expect(operation).rejects.toBeInstanceOf(
      ProfileSavePrincipalChangedError,
    );
    expect(upsertProfile).not.toHaveBeenCalled();
    expect(readAccount).not.toHaveBeenCalled();
  });

  it("stops before any request when a fresh session token is unavailable", async () => {
    const updateAccount = vi.fn(async () => undefined);
    const upsertProfile = vi.fn(async () => ({ id: "profile-a" }));
    const readAccount = vi.fn(async () => ({ id: "account-a" }));

    await expect(
      executeOwnedProfileSave({
        ownerUserId: "user-a",
        ownerSessionId: "session-a",
        currentPrincipal: () => ({
          userId: "user-a",
          sessionId: "session-a",
        }),
        getToken: async () => null,
        updateAccount,
        upsertProfile,
        readAccount,
      }),
    ).rejects.toThrow("authorization token");
    expect(updateAccount).not.toHaveBeenCalled();
    expect(upsertProfile).not.toHaveBeenCalled();
    expect(readAccount).not.toHaveBeenCalled();
  });
});
