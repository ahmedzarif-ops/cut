import { Router, type IRouter } from "express";
import {
  GetTodayResponse,
  ListMyWeightEntriesQueryParams,
  ListMyWeightEntriesResponse,
  UpsertTodayWeightBody,
  UpsertTodayWeightResponse,
} from "@workspace/api-zod";

import { HttpError } from "../lib/httpError";
import { requireAuth } from "../middlewares/requireAuth";
import {
  getTodayState,
  listWeightEntries,
  upsertTodayWeight,
} from "../services/todayService";

const router: IRouter = Router();

router.get("/me/today", requireAuth, async (req, res): Promise<void> => {
  const state = await getTodayState(req.user!);
  res.json(GetTodayResponse.parse(state));
});

router.get(
  "/me/weight-entries",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = ListMyWeightEntriesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid weight history query");
    }
    const entries = await listWeightEntries(req.userId!, parsed.data.limit);
    res.json(ListMyWeightEntriesResponse.parse(entries));
  },
);

router.put(
  "/me/weight-entries/today",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = UpsertTodayWeightBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Weight must be between 20 and 500 kg");
    }
    const entry = await upsertTodayWeight(req.user!, parsed.data.weightKg);
    if (!entry) throw new HttpError(500, "Unable to save weigh-in");
    res.json(UpsertTodayWeightResponse.parse(entry));
  },
);

export default router;
