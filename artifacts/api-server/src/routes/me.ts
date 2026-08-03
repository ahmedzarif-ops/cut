import { Router, type IRouter, type Response } from "express";
import { getAuth } from "@clerk/express";
import {
  DecideMyAdultEligibilityBody,
  DecideMyAdultEligibilityResponse,
  GetAccountDeletionStatusResponse,
  GetMyAdultEligibilityResponse,
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  GetMyProfileResponse,
  UpsertMyProfileBody,
  UpsertMyProfileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getProfile, updateUser, upsertProfile } from "../services/userService";
import {
  enforcePostProvisionDeletionGuard,
  getAccountDeletionIdentity,
  getAccountDeletionStatus,
  hashClerkIdentity,
  requestAccountDeletion,
} from "../services/accountDeletionService";
import {
  decideAdultEligibility,
  getAdultEligibility,
} from "../services/adultEligibilityService";
import { HttpError } from "../lib/httpError";

const router: IRouter = Router();
const ADULT_ELIGIBILITY_INPUT_KEYS = new Set([
  "dateOfBirth",
  "policyVersion",
  "adultAttestation",
]);

function hasOnlyAdultEligibilityKeys(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => ADULT_ELIGIBILITY_INPUT_KEYS.has(key))
  );
}

function sendDeletionBlocked(res: Response): void {
  res.status(410).json({
    error: "Account deletion is in progress or completed",
  });
}

// Eligibility status is authorization state and the PUT receives transient
// age evidence. Keep every response on this path out of intermediary/browser
// caches, including errors.
router.use("/me/adult-eligibility", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// GET /api/me — current user. requireAuth already resolved and attached the
// full internal row as req.user, so no second query is needed here.
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  res.json(GetMeResponse.parse(req.user));
});

// PATCH /api/me — update account settings (timezone, units). The onboarding
// flag is server-owned, not a free setting: updateUser validates it against
// profile existence (see PRODUCT_RULES "Onboarding completion", P1-4).
router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await updateUser(req.userId!, parsed.data);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(UpdateMeResponse.parse(user));
});

// GET /api/me/account-deletion — special auth with no JIT provisioning. This
// remains available to a tombstoned identity while its token is still valid.
router.get("/me/account-deletion", async (req, res): Promise<void> => {
  const clerkUserId = getAccountDeletionIdentity(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    res.json(
      GetAccountDeletionStatusResponse.parse({
        status: await getAccountDeletionStatus(clerkUserId),
      }),
    );
  } catch {
    req.log.error(
      {
        identityHash: hashClerkIdentity(clerkUserId),
        errorCode: "account_deletion_status_failed",
      },
      "Account deletion status could not be loaded",
    );
    res.status(503).json({
      error: "Account deletion status is temporarily unavailable",
    });
  }
});

// GET /api/me/adult-eligibility — special authenticated status lookup that
// never creates an internal user. Deletion retains precedence before and after
// the read so a concurrent tombstone cannot be masked as eligibility state.
router.get("/me/adult-eligibility", async (req, res): Promise<void> => {
  const clerkUserId = getAccountDeletionIdentity(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if ((await getAccountDeletionStatus(clerkUserId)) !== "none") {
    sendDeletionBlocked(res);
    return;
  }

  const status = await getAdultEligibility(clerkUserId);
  const postReadDeletionStatus = status.userId
    ? await enforcePostProvisionDeletionGuard({
        identityHash: hashClerkIdentity(clerkUserId),
        clerkUserId,
        userId: status.userId,
      })
    : await getAccountDeletionStatus(clerkUserId);
  if (postReadDeletionStatus !== "none") {
    sendDeletionBlocked(res);
    return;
  }
  res.json(GetMyAdultEligibilityResponse.parse(status.view));
});

// PUT /api/me/adult-eligibility — the only normal creation path for a user
// row. The server evaluates the transient date using its injected UTC clock,
// persists only the derived decision, and stores email only for an eligible
// outcome. The strict key check compensates for generated Zod's default
// unknown-key stripping and keeps additionalProperties:false true at runtime.
router.put("/me/adult-eligibility", async (req, res): Promise<void> => {
  const clerkUserId = getAccountDeletionIdentity(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if ((await getAccountDeletionStatus(clerkUserId)) !== "none") {
    sendDeletionBlocked(res);
    return;
  }
  if (!hasOnlyAdultEligibilityKeys(req.body)) {
    throw new HttpError(400, "Invalid adult eligibility input");
  }

  const parsed = DecideMyAdultEligibilityBody.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid adult eligibility input");
  }

  const claims = getAuth(req).sessionClaims as { email?: unknown } | undefined;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const decision = await decideAdultEligibility({
    clerkUserId,
    email,
    dateOfBirth: parsed.data.dateOfBirth,
    policyVersion: parsed.data.policyVersion,
  });

  const postDecisionDeletionStatus = await enforcePostProvisionDeletionGuard({
    identityHash: hashClerkIdentity(clerkUserId),
    clerkUserId,
    userId: decision.userId,
  });
  if (postDecisionDeletionStatus !== "none") {
    sendDeletionBlocked(res);
    return;
  }
  if (decision.denied) {
    throw new HttpError(
      403,
      "CUT OS is available only to adults age 18 or older",
      "adult_eligibility_denied",
    );
  }
  res.json(DecideMyAdultEligibilityResponse.parse(decision.view));
});

// DELETE /api/me — special auth bypasses normal account resolution so pending
// and completed tombstones can retry idempotently. A 204 means both Clerk and
// local cascade deletion are terminal; a 503 means durable retry remains.
router.delete("/me", async (req, res): Promise<void> => {
  const clerkUserId = getAccountDeletionIdentity(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let result;
  try {
    result = await requestAccountDeletion(clerkUserId);
  } catch {
    req.log.error(
      {
        identityHash: hashClerkIdentity(clerkUserId),
        errorCode: "account_deletion_stage_failed",
      },
      "Account deletion could not be staged",
    );
    res.status(503).json({
      error: "Account deletion is temporarily unavailable",
    });
    return;
  }

  if (result.status === "pending") {
    res.status(503).json({
      error: "Account deletion is pending and will be retried",
    });
    return;
  }
  res.status(204).send();
});

// GET /api/me/profile — the current user's onboarding profile.
router.get("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const profile = await getProfile(req.userId!);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(GetMyProfileResponse.parse(profile));
});

// PUT /api/me/profile — create or replace the current user's profile.
router.put("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpsertMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const profile = await upsertProfile(req.userId!, parsed.data);
  res.json(UpsertMyProfileResponse.parse(profile));
});

export default router;
