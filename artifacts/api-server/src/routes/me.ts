import { Router, type IRouter } from "express";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  GetMyProfileResponse,
  UpsertMyProfileBody,
  UpsertMyProfileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  getUserById,
  updateUser,
  getProfile,
  upsertProfile,
} from "../services/userService";

const router: IRouter = Router();

// GET /api/me — current user (JIT-provisioned by requireAuth).
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = await getUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(GetMeResponse.parse(user));
});

// PATCH /api/me — update account settings (timezone, units, onboarding flag).
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
