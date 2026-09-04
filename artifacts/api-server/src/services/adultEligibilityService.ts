import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import {
  ADULT_ELIGIBILITY_MINIMUM_AGE,
  ADULT_ELIGIBILITY_POLICY_VERSION,
  evaluateAdultEligibility,
  systemClock,
  type Clock,
} from "@workspace/domain";

import { HttpError } from "../lib/httpError";

export type AdultEligibilityPublicStatus =
  "unverified" | "eligible" | "ineligible" | "review_required";

export interface AdultEligibilityView {
  status: AdultEligibilityPublicStatus;
  minimumAge: typeof ADULT_ELIGIBILITY_MINIMUM_AGE;
  policyVersion: typeof ADULT_ELIGIBILITY_POLICY_VERSION;
}

export interface AdultEligibilityLookup {
  view: AdultEligibilityView;
  userId: string | null;
}

export interface AdultEligibilityDecision {
  view: AdultEligibilityView;
  userId: string;
  denied: boolean;
}

let adultEligibilityClock: Clock = systemClock;

/** Test seam for deterministic server-date boundary checks. */
export function setAdultEligibilityClock(clock: Clock | null): void {
  adultEligibilityClock = clock ?? systemClock;
}

function view(status: AdultEligibilityPublicStatus): AdultEligibilityView {
  return {
    status,
    minimumAge: ADULT_ELIGIBILITY_MINIMUM_AGE,
    policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
  };
}

function statusForUser(user: User | undefined): AdultEligibilityPublicStatus {
  if (!user || user.adultEligibilityStatus === "unverified") {
    return "unverified";
  }
  if (user.adultEligibilityStatus === "ineligible") return "ineligible";
  if (
    user.adultEligibilityStatus === "eligible" &&
    user.adultEligibilityPolicyVersion === ADULT_ELIGIBILITY_POLICY_VERSION
  ) {
    return "eligible";
  }
  return "review_required";
}

export async function getAdultEligibility(
  clerkUserId: string,
): Promise<AdultEligibilityLookup> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  return { view: view(statusForUser(user)), userId: user?.id ?? null };
}

/**
 * Evaluate a transient birth date and serialize the first decision for the
 * current policy on the user's row. The raw birth date is never included in a
 * database value, return value, error, or log field.
 */
export async function decideAdultEligibility(input: {
  clerkUserId: string;
  email: string | null;
  dateOfBirth: string;
  policyVersion: string;
  clock?: Clock;
}): Promise<AdultEligibilityDecision> {
  if (input.policyVersion !== ADULT_ELIGIBILITY_POLICY_VERSION) {
    throw new HttpError(
      409,
      "Adult eligibility policy changed; refresh and review it again",
      "adult_eligibility_policy_changed",
    );
  }

  const clock = input.clock ?? adultEligibilityClock;
  const evaluation = evaluateAdultEligibility(input.dateOfBirth, clock);
  if (evaluation.status === "invalid") {
    throw new HttpError(400, "Enter a valid date of birth");
  }

  return db.transaction(async (tx) => {
    await tx
      .insert(usersTable)
      .values({ clerkUserId: input.clerkUserId })
      .onConflictDoNothing({ target: usersTable.clerkUserId });

    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, input.clerkUserId))
      .for("update");
    if (!user) throw new Error("Adult eligibility user was not resolved");
    if (user.deletionStatus === "pending") {
      throw new HttpError(410, "Account deletion is in progress or completed");
    }

    // An ineligible decision is monotonic for this identity. A second request
    // cannot replace it with a different self-reported date.
    if (user.adultEligibilityStatus === "ineligible") {
      return {
        view: view("ineligible"),
        userId: user.id,
        denied: true,
      };
    }

    // The first decision for the current policy also wins concurrent retries.
    if (
      user.adultEligibilityStatus === "eligible" &&
      user.adultEligibilityPolicyVersion === ADULT_ELIGIBILITY_POLICY_VERSION
    ) {
      if (input.email && user.email !== input.email) {
        await tx
          .update(usersTable)
          .set({ email: input.email, updatedAt: clock.now() })
          .where(eq(usersTable.id, user.id));
      }
      return {
        view: view("eligible"),
        userId: user.id,
        denied: false,
      };
    }

    const decision = evaluation.status;
    const decidedAt = clock.now();
    const [updated] = await tx
      .update(usersTable)
      .set({
        adultEligibilityStatus: decision,
        adultEligibilityPolicyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
        adultEligibilityDecidedAt: decidedAt,
        email: decision === "eligible" ? input.email : null,
        updatedAt: decidedAt,
      })
      .where(eq(usersTable.id, user.id))
      .returning();
    if (!updated) throw new Error("Adult eligibility decision was not saved");

    return {
      view: view(decision),
      userId: updated.id,
      denied: decision === "ineligible",
    };
  });
}
