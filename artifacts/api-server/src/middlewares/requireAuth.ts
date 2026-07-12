import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

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
      clerkUserId?: string;
    }
  }
}

/**
 * Authentication gate + just-in-time (JIT) user provisioning.
 *
 * Verifies the Clerk session, then looks up (or creates on first access) the
 * internal `users` row keyed by the Clerk id, and attaches the internal uuid
 * to `req.userId`.
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

  const claims = auth.sessionClaims as { email?: string } | undefined;
  const email = typeof claims?.email === "string" ? claims.email : null;

  // Upsert on the unique clerk_user_id. onConflictDoUpdate always returns the
  // row (inserted or existing), which avoids a select+insert race.
  const [user] = await db
    .insert(usersTable)
    .values({ clerkUserId, email })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { updatedAt: new Date() },
    })
    .returning();

  if (!user) {
    req.log.error({ clerkUserId }, "Failed to provision internal user");
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  req.userId = user.id;
  req.clerkUserId = clerkUserId;
  next();
}
