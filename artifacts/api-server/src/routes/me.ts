import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable, usersTable } from "@workspace/db";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  GetMyProfileResponse,
  UpsertMyProfileBody,
  UpsertMyProfileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// GET /api/me — current user (JIT-provisioned by requireAuth).
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

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

  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.json(UpdateMeResponse.parse(user));
});

// GET /api/me/profile — the current user's onboarding profile.
router.get("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, req.userId!));

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

  // PUT is a full replace: every optional field the client omits is reset to
  // its null/default rather than retaining a stale value. Only `goal` is
  // required; the enum columns fall back to their schema defaults.
  const input = parsed.data;
  const values = {
    userId: req.userId!,
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

  res.json(UpsertMyProfileResponse.parse(profile));
});

export default router;
