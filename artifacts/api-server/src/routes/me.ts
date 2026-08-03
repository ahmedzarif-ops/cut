import { Router, type IRouter } from "express";
import {
  GetAccountDeletionStatusResponse,
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
  getAccountDeletionIdentity,
  getAccountDeletionStatus,
  hashClerkIdentity,
  requestAccountDeletion,
} from "../services/accountDeletionService";

const router: IRouter = Router();

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
  if (
    parsed.data.birthYear !== undefined &&
    !Number.isInteger(parsed.data.birthYear)
  ) {
    res.status(400).json({ error: "Birth year must be a whole number" });
    return;
  }
  const profile = await upsertProfile(req.userId!, parsed.data);
  res.json(UpsertMyProfileResponse.parse(profile));
});

export default router;
