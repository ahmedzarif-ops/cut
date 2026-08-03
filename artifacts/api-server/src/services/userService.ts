import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  profilesTable,
  type User,
  type Profile,
} from "@workspace/db";
import { isValidTimeZone } from "@workspace/domain";
import { HttpError } from "../lib/httpError";

/**
 * Just-in-time user provisioning with no per-request write.
 *
 * Select-first — a returning user (the overwhelming common case) is one read
 * and zero writes. On a miss, insert; `onConflictDoNothing` + a re-select
 * covers the race where a concurrent request created the same clerk_user_id
 * between our SELECT and INSERT.
 */
export async function provisionUser(input: {
  clerkUserId: string;
  email: string | null;
}): Promise<User | undefined> {
  const existing = await getUserByClerkId(input.clerkUserId);
  if (existing) return existing;

  const [inserted] = await db
    .insert(usersTable)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
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
  birthYear?: number;
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
    birthYear: input.birthYear ?? null,
    heightCm: input.heightCm ?? null,
    startWeightKg: input.startWeightKg ?? null,
    goalWeightKg: input.goalWeightKg ?? null,
    targetDate: input.targetDate ?? null,
  };
  return db.transaction(async (tx) => {
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
          birthYear: values.birthYear,
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
        and(eq(usersTable.id, userId), eq(usersTable.onboardingComplete, false)),
      );
    return profile;
  });
}
