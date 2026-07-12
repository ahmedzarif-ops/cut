import { describe, expect, it } from "vitest";
import type { Profile } from "@workspace/api-client-react";
import {
  EMPTY_FORM_STATE,
  formStateToProfileInput,
  profileToFormState,
  toNumber,
} from "../profile-form";

const fullProfile: Profile = {
  id: "9d9c8710-9d33-4c6c-9db0-cf8674a34c1e",
  userId: "1f0f8f2a-64a4-4a0e-a2ff-1a2b3c4d5e6f",
  displayName: "Zarif",
  goal: "cut",
  sex: "male",
  birthYear: 1996,
  heightCm: 162.6,
  startWeightKg: 95.25,
  goalWeightKg: 86.18,
  targetDate: "2026-09-26",
  activityLevel: "active",
  trainingExperience: "advanced",
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

  it("seeds every field from an existing profile", () => {
    const form = profileToFormState(fullProfile);
    expect(form).toEqual({
      displayName: "Zarif",
      goal: "cut",
      sex: "male",
      birthYear: "1996",
      heightCm: "162.6",
      startWeightKg: "95.25",
      goalWeightKg: "86.18",
      activityLevel: "active",
      trainingExperience: "advanced",
    });
  });

  it("maps null optionals to empty strings", () => {
    const sparse: Profile = {
      ...fullProfile,
      displayName: null,
      birthYear: null,
      heightCm: null,
      startWeightKg: null,
      goalWeightKg: null,
      targetDate: null,
    };
    const form = profileToFormState(sparse);
    expect(form.displayName).toBe("");
    expect(form.birthYear).toBe("");
    expect(form.heightCm).toBe("");
    expect(form.startWeightKg).toBe("");
    expect(form.goalWeightKg).toBe("");
  });
});

describe("edit round-trip (the data-loss regression)", () => {
  it("profile → form → input preserves every saved value", () => {
    // This is the exact scenario that previously wiped data: open the edit
    // form for an existing profile and immediately save without touching it.
    const input = formStateToProfileInput(
      profileToFormState(fullProfile),
      fullProfile,
    );
    expect(input).toEqual({
      goal: "cut",
      sex: "male",
      activityLevel: "active",
      trainingExperience: "advanced",
      displayName: "Zarif",
      birthYear: 1996,
      heightCm: 162.6,
      startWeightKg: 95.25,
      goalWeightKg: 86.18,
      targetDate: "2026-09-26",
    });
  });

  it("carries targetDate through even though the form does not collect it", () => {
    const input = formStateToProfileInput(
      profileToFormState(fullProfile),
      fullProfile,
    );
    expect(input.targetDate).toBe("2026-09-26");
  });

  it("still produces a minimal body for a brand-new user", () => {
    const input = formStateToProfileInput(profileToFormState(null), null);
    expect(input).toEqual({
      goal: "cut",
      sex: "unspecified",
      activityLevel: "moderate",
      trainingExperience: "beginner",
      displayName: undefined,
      birthYear: undefined,
      heightCm: undefined,
      startWeightKg: undefined,
      goalWeightKg: undefined,
      targetDate: undefined,
    });
  });

  it("trims whitespace-only display names to undefined", () => {
    const form = { ...profileToFormState(fullProfile), displayName: "   " };
    expect(formStateToProfileInput(form, fullProfile).displayName).toBeUndefined();
  });
});
