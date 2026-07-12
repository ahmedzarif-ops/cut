import type { Profile, ProfileInput } from "@workspace/api-client-react";

/**
 * Pure mapping between the onboarding form's string-based state and the
 * Profile / ProfileInput API contracts.
 *
 * PUT /api/me/profile is a FULL REPLACE: any optional field omitted from the
 * request body is reset to null/default on the server. That contract makes it
 * critical that the form is seeded from the existing profile when editing —
 * otherwise saving would silently wipe every previously entered value. These
 * functions are the single source of that mapping so it can be unit tested.
 */

export const GOALS = ["cut", "maintain", "recomp", "gain"] as const;
export const SEXES = ["male", "female", "other", "unspecified"] as const;
export const ACTIVITY = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
export const EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;

export type Goal = (typeof GOALS)[number];
export type Sex = (typeof SEXES)[number];
export type Activity = (typeof ACTIVITY)[number];
export type Experience = (typeof EXPERIENCE)[number];

export interface ProfileFormState {
  displayName: string;
  goal: Goal;
  sex: Sex;
  birthYear: string;
  heightCm: string;
  startWeightKg: string;
  goalWeightKg: string;
  activityLevel: Activity;
  trainingExperience: Experience;
}

export const EMPTY_FORM_STATE: ProfileFormState = {
  displayName: "",
  goal: "cut",
  sex: "unspecified",
  birthYear: "",
  heightCm: "",
  startWeightKg: "",
  goalWeightKg: "",
  activityLevel: "moderate",
  trainingExperience: "beginner",
};

/** Numeric field → text-input value ("" for absent). */
function numberToField(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

/** Text-input value → optional API number (undefined for blank/garbage). */
export function toNumber(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : undefined;
}

/**
 * Seed form state from an existing profile. Returns blank defaults when the
 * user has no profile yet (first onboarding).
 */
export function profileToFormState(
  profile: Profile | null | undefined,
): ProfileFormState {
  if (!profile) return { ...EMPTY_FORM_STATE };
  return {
    displayName: profile.displayName ?? "",
    goal: profile.goal,
    sex: profile.sex,
    birthYear: numberToField(profile.birthYear),
    heightCm: numberToField(profile.heightCm),
    startWeightKg: numberToField(profile.startWeightKg),
    goalWeightKg: numberToField(profile.goalWeightKg),
    activityLevel: profile.activityLevel,
    trainingExperience: profile.trainingExperience,
  };
}

/**
 * Build the PUT body from form state. `targetDate` is not collected by the
 * current form, so it must be carried over from the existing profile or it
 * would be wiped by the full-replace PUT.
 */
export function formStateToProfileInput(
  form: ProfileFormState,
  existing?: Pick<Profile, "targetDate"> | null,
): ProfileInput {
  return {
    goal: form.goal,
    sex: form.sex,
    activityLevel: form.activityLevel,
    trainingExperience: form.trainingExperience,
    displayName: form.displayName.trim() || undefined,
    birthYear: toNumber(form.birthYear),
    heightCm: toNumber(form.heightCm),
    startWeightKg: toNumber(form.startWeightKg),
    goalWeightKg: toNumber(form.goalWeightKg),
    targetDate: existing?.targetDate ?? undefined,
  };
}
