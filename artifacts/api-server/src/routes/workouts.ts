import { Router, type IRouter } from "express";
import {
  CreateMyWorkoutBody,
  CreateMyWorkoutResponse,
  DeleteMyWorkoutParams,
  ListMyWorkoutsQueryParams,
  ListMyWorkoutsResponse,
} from "@workspace/api-zod";

import { HttpError } from "../lib/httpError";
import { requireAuth } from "../middlewares/requireAuth";
import { requireDeviceTimeZone } from "../middlewares/requireDeviceTimeZone";
import {
  createMyWorkout,
  deleteMyWorkout,
  listMyWorkouts,
} from "../services/workoutService";

const router: IRouter = Router();
const CREATE_WORKOUT_KEYS = new Set([
  "clientRequestId",
  "dayKey",
  "kind",
  "name",
  "notes",
  "exercises",
]);

function containsOnlyKnownKeys(
  value: unknown,
  knownKeys: ReadonlySet<string>,
): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => knownKeys.has(key))
  );
}

router.get("/me/workouts", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListMyWorkoutsQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.limit)) {
    throw new HttpError(400, "Invalid workout history query");
  }
  res.setHeader("Cache-Control", "no-store");
  res.json(
    ListMyWorkoutsResponse.parse(
      await listMyWorkouts(req.userId!, parsed.data.limit),
    ),
  );
});

router.post(
  "/me/workouts",
  requireAuth,
  requireDeviceTimeZone,
  async (req, res): Promise<void> => {
    if (!containsOnlyKnownKeys(req.body, CREATE_WORKOUT_KEYS)) {
      throw new HttpError(400, "Invalid workout");
    }
    const parsed = CreateMyWorkoutBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid workout");
    res
      .status(201)
      .json(
        CreateMyWorkoutResponse.parse(
          await createMyWorkout(req.user!, parsed.data, req.deviceTimeZone!),
        ),
      );
  },
);

router.delete(
  "/me/workouts/:workoutId",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = DeleteMyWorkoutParams.safeParse(req.params);
    if (!parsed.success) throw new HttpError(400, "Invalid workout ID");
    if (!(await deleteMyWorkout(req.userId!, parsed.data.workoutId))) {
      throw new HttpError(404, "Workout not found");
    }
    res.status(204).send();
  },
);

export default router;
