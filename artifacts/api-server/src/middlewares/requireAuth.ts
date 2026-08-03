import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import { ADULT_ELIGIBILITY_POLICY_VERSION } from "@workspace/domain";
import {
  enforcePostProvisionDeletionGuard,
  getDurableDeletionStatus,
  hashClerkIdentity,
} from "../services/accountDeletionService";
import { getUserByClerkId } from "../services/userService";

type AfterDeletionPrecheckHook = () => Promise<void>;
let afterDeletionPrecheckHook: AfterDeletionPrecheckHook | null = null;

/** Test-only barrier for the deletion pre-check to user-resolution race window. */
export function setRequireAuthAfterDeletionPrecheckHook(
  hook: AfterDeletionPrecheckHook | null,
): void {
  afterDeletionPrecheckHook = hook;
}

/**
 * Augment Express Request with the resolved internal identity. Handlers should
 * ALWAYS scope queries by `req.userId` (the internal uuid), never by the raw
 * Clerk id — dev and prod Clerk instances issue different ids per person.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
    }
  }
}

/**
 * Authentication, deletion, and server-authoritative adult-eligibility gate.
 *
 * Normal private endpoints never create an internal user. Only the special
 * adult-eligibility decision route may create a minimal row, and access is
 * allowed here only after that row has a current-policy eligible decision.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const identityHash = hashClerkIdentity(clerkUserId);
  let deletionStatus;
  try {
    deletionStatus = await getDurableDeletionStatus(identityHash);
  } catch {
    req.log.error(
      { identityHash, errorCode: "deletion_guard_failed" },
      "Unable to resolve account deletion state",
    );
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }
  if (deletionStatus !== "none") {
    res.status(410).json({
      error: "Account deletion is in progress or completed",
    });
    return;
  }

  await afterDeletionPrecheckHook?.();

  let user;
  try {
    user = await getUserByClerkId(clerkUserId);
  } catch {
    req.log.error(
      { identityHash, errorCode: "user_resolve_failed" },
      "Failed to resolve internal user",
    );
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  if (!user) {
    // A deletion may have completed between the first tombstone read and the
    // user lookup. Preserve deletion's 410 precedence before reporting the
    // eligibility precondition.
    try {
      deletionStatus = await getDurableDeletionStatus(identityHash);
    } catch {
      res.status(500).json({ error: "Failed to resolve user" });
      return;
    }
    if (deletionStatus !== "none") {
      res.status(410).json({
        error: "Account deletion is in progress or completed",
      });
      return;
    }
    res.status(428).json({
      error: "Adult eligibility must be confirmed before private access",
      code: "adult_eligibility_required",
    });
    return;
  }

  let postResolutionDeletionStatus;
  try {
    postResolutionDeletionStatus = await enforcePostProvisionDeletionGuard({
      identityHash,
      clerkUserId,
      userId: user.id,
    });
  } catch {
    req.log.error(
      { identityHash, errorCode: "post_resolution_deletion_guard_failed" },
      "Unable to recheck account deletion state",
    );
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }
  if (postResolutionDeletionStatus !== "none") {
    res.status(410).json({
      error: "Account deletion is in progress or completed",
    });
    return;
  }

  // A deletion transaction can win after the durable check but before user
  // resolution completes. Never allow its pending row through.
  if (user.deletionStatus === "pending") {
    res.status(410).json({
      error: "Account deletion is in progress or completed",
    });
    return;
  }

  if (user.adultEligibilityStatus === "ineligible") {
    res.status(403).json({
      error: "CUT OS is available only to adults age 18 or older",
      code: "adult_eligibility_denied",
    });
    return;
  }

  if (
    user.adultEligibilityStatus !== "eligible" ||
    user.adultEligibilityPolicyVersion !== ADULT_ELIGIBILITY_POLICY_VERSION
  ) {
    res.status(428).json({
      error: "Adult eligibility must be confirmed before private access",
      code: "adult_eligibility_required",
    });
    return;
  }

  req.userId = user.id;
  req.user = user;
  next();
}
