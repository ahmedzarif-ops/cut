import { eq } from "drizzle-orm";
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
 * Just-in-time user provisioning. Upserts on the unique clerk_user_id;
 * onConflictDoUpdate always returns the row (inserted or existing), avoiding a
 * select+insert race. Returns undefined only if the write returned no row.
 */
export async function provisionUser(input: {
  clerkUserId: string;
  email: string | null;
}): Promise<User | undefined> {
  const [user] = await db
    .insert(usersTable)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { updatedAt: new Date() },
    })
    .returning();
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
  const [profile] = await db
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
  return profile;
}
