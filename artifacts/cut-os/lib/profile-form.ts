import type { Profile, ProfileInput } from "@workspace/api-client-react";
import {
  kilogramsToPounds,
  poundsToKilograms,
  roundWeight,
} from "@workspace/domain";

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
export type WeightUnits = "metric" | "imperial";

export interface ProfileFormState {
  displayName: string;
  goal: Goal;
  startWeightKg: string;
  goalWeightKg: string;
}

export interface ProfileFormDraft {
  form: ProfileFormState;
  units: WeightUnits;
}

export const EMPTY_FORM_STATE: ProfileFormState = {
  displayName: "",
  goal: "cut",
  startWeightKg: "",
  goalWeightKg: "",
};

/** Numeric field → text-input value ("" for absent). */
function numberToField(
  valueKg: number | null | undefined,
  units: WeightUnits,
): string {
  if (valueKg == null) return "";
  return String(
    units === "imperial" ? roundWeight(kilogramsToPounds(valueKg)) : valueKg,
  );
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
  units: WeightUnits = "metric",
): ProfileFormState {
  if (!profile) return { ...EMPTY_FORM_STATE };
  return {
    displayName: profile.displayName ?? "",
    goal: profile.goal,
    startWeightKg: numberToField(profile.startWeightKg, units),
    goalWeightKg: numberToField(profile.goalWeightKg, units),
  };
}

/** Build the minimal paid-v1 PUT body from form state. */
export function formStateToProfileInput(
  form: ProfileFormState,
  units: WeightUnits = "metric",
): ProfileInput {
  const canonicalWeight = (value: string) => {
    const parsed = toNumber(value);
    if (parsed === undefined) return undefined;
    return units === "imperial" ? poundsToKilograms(parsed) : parsed;
  };
  return {
    goal: form.goal,
    displayName: form.displayName.trim() || undefined,
    startWeightKg: canonicalWeight(form.startWeightKg),
    goalWeightKg: canonicalWeight(form.goalWeightKg),
  };
}

/** Converts visible weight fields when the display-unit chip changes. */
export function convertProfileFormUnits(
  form: ProfileFormState,
  from: WeightUnits,
  to: WeightUnits,
): ProfileFormState {
  if (from === to) return form;
  const convert = (value: string): string => {
    const parsed = toNumber(value);
    if (parsed === undefined) return value;
    const converted =
      to === "imperial" ? kilogramsToPounds(parsed) : poundsToKilograms(parsed);
    return String(roundWeight(converted));
  };
  return {
    ...form,
    startWeightKg: convert(form.startWeightKg),
    goalWeightKg: convert(form.goalWeightKg),
  };
}

/**
 * Atomically changes the display unit and its visible weight fields. Keeping
 * both values in one transition prevents rapid taps from converting with a
 * render-stale source unit and later saving a mislabeled weight.
 */
export function convertProfileDraftUnits(
  draft: ProfileFormDraft,
  to: WeightUnits,
): ProfileFormDraft {
  if (draft.units === to) return draft;
  return {
    form: convertProfileFormUnits(draft.form, draft.units, to),
    units: to,
  };
}

export interface ProfileSavePrincipal {
  userId: string | null;
  sessionId: string | null;
}

export class ProfileSavePrincipalChangedError extends Error {
  constructor() {
    super("The active profile-save principal changed.");
    this.name = "ProfileSavePrincipalChangedError";
  }
}

/**
 * Carries one captured Clerk session token across every profile-save request.
 * The explicit token prevents the module-global token getter for a newly
 * active account from taking over between the units and profile writes.
 */
export async function executeOwnedProfileSave<TAccount, TProfile>(input: {
  ownerUserId: string;
  ownerSessionId: string;
  currentPrincipal(): ProfileSavePrincipal;
  getToken(): Promise<string | null>;
  updateAccount(token: string): Promise<unknown>;
  upsertProfile(token: string): Promise<TProfile>;
  readAccount(token: string): Promise<TAccount>;
}): Promise<{ account: TAccount; profile: TProfile }> {
  const assertOwner = () => {
    const current = input.currentPrincipal();
    if (
      current.userId !== input.ownerUserId ||
      current.sessionId !== input.ownerSessionId
    ) {
      throw new ProfileSavePrincipalChangedError();
    }
  };

  assertOwner();
  const token = await input.getToken();
  assertOwner();
  if (!token) throw new Error("A profile authorization token is unavailable.");

  await input.updateAccount(token);
  assertOwner();
  const profile = await input.upsertProfile(token);
  assertOwner();
  const account = await input.readAccount(token);
  assertOwner();
  return { account, profile };
}
