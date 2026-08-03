import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import {
  enforcePostProvisionDeletionGuard,
  getDurableDeletionStatus,
  hashClerkIdentity,
} from "../services/accountDeletionService";
import { provisionUser } from "../services/userService";

type AfterDeletionPrecheckHook = () => Promise<void>;
let afterDeletionPrecheckHook: AfterDeletionPrecheckHook | null = null;

/** Test-only barrier for the pre-check → JIT-provision race window. */
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
 * Authentication gate + just-in-time (JIT) user provisioning.
 *
 * Verifies the Clerk session, resolves (or creates on first access) the
 * internal `users` row, and attaches the internal uuid to `req.userId`. All DB
 * work lives in userService.
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

  const claims = auth.sessionClaims as { email?: string } | undefined;
  const email = typeof claims?.email === "string" ? claims.email : null;

  let user;
  try {
    user = await provisionUser({ clerkUserId, email });
  } catch {
    req.log.error(
      { identityHash, errorCode: "user_provision_failed" },
      "Failed to provision internal user",
    );
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  if (!user) {
    req.log.error({ identityHash }, "Failed to provision internal user");
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  let postProvisionDeletionStatus;
  try {
    postProvisionDeletionStatus = await enforcePostProvisionDeletionGuard({
      identityHash,
      clerkUserId,
      userId: user.id,
    });
  } catch {
    req.log.error(
      { identityHash, errorCode: "post_provision_deletion_guard_failed" },
      "Unable to recheck account deletion state",
    );
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }
  if (postProvisionDeletionStatus !== "none") {
    res.status(410).json({
      error: "Account deletion is in progress or completed",
    });
    return;
  }

  // A deletion transaction can win the unique Clerk-ID race after the durable
  // check but before JIT provisioning. Never allow its pending row through.
  if (user.deletionStatus === "pending") {
    res.status(410).json({
      error: "Account deletion is in progress or completed",
    });
    return;
  }

  req.userId = user.id;
  req.user = user;
  next();
}
