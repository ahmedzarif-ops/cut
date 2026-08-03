import type { Profile, ProfileInput } from "@workspace/api-client-react";

/**
 * Pure mapping between the onboarding form's string-based state and the
 * Profile / ProfileInput API contracts.
 *
 * PUT /api/me/profile is a FULL REPLACE. The paid v1 form intentionally keeps
 * only fields used by the shipped experience; legacy unused profile inputs are
 * cleared server-side instead of being carried forward.
 */

export const GOALS = ["cut", "maintain", "recomp", "gain"] as const;

export type Goal = (typeof GOALS)[number];

export interface ProfileFormState {
  displayName: string;
  goal: Goal;
  startWeightKg: string;
  goalWeightKg: string;
}

export const EMPTY_FORM_STATE: ProfileFormState = {
  displayName: "",
  goal: "cut",
  startWeightKg: "",
  goalWeightKg: "",
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
    startWeightKg: numberToField(profile.startWeightKg),
    goalWeightKg: numberToField(profile.goalWeightKg),
  };
}

/** Build the minimal paid-v1 PUT body from form state. */
export function formStateToProfileInput(form: ProfileFormState): ProfileInput {
  return {
    goal: form.goal,
    displayName: form.displayName.trim() || undefined,
    startWeightKg: toNumber(form.startWeightKg),
    goalWeightKg: toNumber(form.goalWeightKg),
  };
}
