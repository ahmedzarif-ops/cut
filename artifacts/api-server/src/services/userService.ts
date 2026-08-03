import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  profilesTable,
  type User,
  type Profile,
} from "@workspace/db";
import {
  ADULT_ELIGIBILITY_POLICY_VERSION,
  isValidTimeZone,
} from "@workspace/domain";
import { HttpError } from "../lib/httpError";

/**
 * Explicit minimal-row helper retained for isolated service setup. The normal
 * authentication middleware never calls it: only the adult-eligibility route
 * establishes an ordinary account. Contact data is intentionally ignored
 * until an eligible decision exists.
 */
export async function provisionUser(input: {
  clerkUserId: string;
  email: string | null;
}): Promise<User | undefined> {
  const existing = await getUserByClerkId(input.clerkUserId);
  if (existing) return existing;

  const [inserted] = await db
    .insert(usersTable)
    // Eligibility is established elsewhere. Never persist contact data on an
    // unverified row; the eligibility transaction may add it only after an
    // eligible decision wins.
    .values({ clerkUserId: input.clerkUserId })
    .onConflictDoNothing({ target: usersTable.clerkUserId })
    .returning();
  if (inserted) return inserted;

  // Lost the insert race — another request created the row. Re-select it.
  return getUserByClerkId(input.clerkUserId);
}

export async function getUserByClerkId(
  clerkUserId: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  return user;
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user;
}

export type UpdateUserPatch = Partial<
  Pick<User, "timezone" | "units" | "onboardingComplete">
>;

export async function updateUser(
  userId: string,
  patch: UpdateUserPatch,
): Promise<User | undefined> {
  if (patch.timezone !== undefined && !isValidTimeZone(patch.timezone)) {
    throw new HttpError(400, "Invalid timezone");
  }
  // Onboarding completion is derived from profile existence and owned by the
  // upsertProfile transaction — it is not a client-settable bit. The flag is
  // only ever turned on by creating a profile, so a PATCH may CONFIRM `true`
  // (when a profile already exists) but may never set `false`; un-onboarding is
  // not a settings operation (P1-4 invariant). Rejecting `false` outright also
  // removes the only PATCH path that could write the flag out of step with a
  // concurrently-created profile — there is no check-then-act race left to lose.
  if (patch.onboardingComplete === false) {
    throw new HttpError(
      400,
      "Onboarding completion is derived from your profile and cannot be unset",
    );
  }
  if (patch.onboardingComplete === true && !(await getProfile(userId))) {
    throw new HttpError(
      400,
      "Cannot complete onboarding before creating a profile",
    );
  }
  // An empty patch is a no-op: Drizzle rejects an empty SET, and "change
  // nothing" should return the current row unchanged, not error.
  if (Object.keys(patch).length === 0) {
    return getUserById(userId);
  }
  const [user] = await db
    .update(usersTable)
    .set(patch)
    .where(eq(usersTable.id, userId))
    .returning();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile;
}

/** The parsed UpsertMyProfileBody shape (only `goal` is required). */
export interface UpsertProfileInput {
  goal: Profile["goal"];
  displayName?: string;
  sex?: Profile["sex"];
  heightCm?: number;
  startWeightKg?: number;
  goalWeightKg?: number;
  targetDate?: string;
  activityLevel?: Profile["activityLevel"];
  trainingExperience?: Profile["trainingExperience"];
}

/**
 * Create or replace the user's profile. PUT is a full replace: every optional
 * field the client omits is reset to its null/default rather than retaining a
 * stale value (the P0 edit-plan data-loss contract). Only `goal` is required.
 *
 * Atomic onboarding (P1-4): the profile write and the `users.onboardingComplete`
 * flag flip happen in ONE transaction, so the flag and profile-existence can
 * never disagree — a partial failure rolls both back. This replaces the old
 * non-atomic client flow (PUT profile, then a separate PATCH of the flag).
 *
 * The service also re-checks and locks the owning user row before writing.
 * Route middleware is not the security boundary: direct or future callers
 * cannot create health-profile data for an unverified, stale-policy,
 * ineligible, or deleting account.
 */
export async function upsertProfile(
  userId: string,
  input: UpsertProfileInput,
): Promise<Profile | undefined> {
  const values = {
    userId,
    goal: input.goal,
    sex: input.sex ?? "unspecified",
    activityLevel: input.activityLevel ?? "moderate",
    trainingExperience: input.trainingExperience ?? "beginner",
    displayName: input.displayName ?? null,
    heightCm: input.heightCm ?? null,
    startWeightKg: input.startWeightKg ?? null,
    goalWeightKg: input.goalWeightKg ?? null,
    targetDate: input.targetDate ?? null,
  };
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({
        adultEligibilityStatus: usersTable.adultEligibilityStatus,
        adultEligibilityPolicyVersion: usersTable.adultEligibilityPolicyVersion,
        deletionStatus: usersTable.deletionStatus,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .for("update");

    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }
    if (user.deletionStatus === "pending") {
      throw new HttpError(410, "Account deletion is in progress or completed");
    }
    if (user.adultEligibilityStatus === "ineligible") {
      throw new HttpError(
        403,
        "CUT OS is available only to adults age 18 or older",
        "adult_eligibility_denied",
      );
    }
    if (
      user.adultEligibilityStatus !== "eligible" ||
      user.adultEligibilityPolicyVersion !== ADULT_ELIGIBILITY_POLICY_VERSION
    ) {
      throw new HttpError(
        428,
        "Adult eligibility must be confirmed before private access",
        "adult_eligibility_required",
      );
    }

    const [profile] = await tx
      .insert(profilesTable)
      .values(values)
      .onConflictDoUpdate({
        target: profilesTable.userId,
        set: {
          goal: values.goal,
          sex: values.sex,
          activityLevel: values.activityLevel,
          trainingExperience: values.trainingExperience,
          displayName: values.displayName,
          heightCm: values.heightCm,
          startWeightKg: values.startWeightKg,
          goalWeightKg: values.goalWeightKg,
          targetDate: values.targetDate,
          updatedAt: new Date(),
        },
      })
      .returning();
    // Mark onboarding complete in the same transaction. Guarded to the
    // false→true transition so re-saving a profile (an edit) doesn't needlessly
    // bump users.updated_at on every save.
    await tx
      .update(usersTable)
      .set({ onboardingComplete: true })
      .where(
        and(
          eq(usersTable.id, userId),
          eq(usersTable.onboardingComplete, false),
        ),
      );
    return profile;
  });
}
