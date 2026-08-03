import { Router, type IRouter } from "express";
import {
  CreateMyMealEntryBody,
  CreateMyMealEntryResponse,
  DeleteMyMealEntryParams,
  GetTodayMealsResponse,
  ListMyMealOptionsResponse,
  UpdateMyMealEntryBody,
  UpdateMyMealEntryParams,
  UpdateMyMealEntryResponse,
} from "@workspace/api-zod";

import { HttpError } from "../lib/httpError";
import { requireAuth } from "../middlewares/requireAuth";
import {
  createMyMealEntry,
  deleteMyMealEntry,
  getTodayMeals,
  listMyMealOptions,
  updateMyMealEntry,
} from "../services/mealService";

const router: IRouter = Router();
const CREATE_MEAL_ENTRY_KEYS = new Set([
  "clientRequestId",
  "catalogVersion",
  "dayKey",
  "mealTemplateId",
  "servings",
]);
const UPDATE_MEAL_ENTRY_KEYS = new Set(["servings"]);

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

router.get("/me/meal-options", requireAuth, (_req, res): void => {
  res.json(ListMyMealOptionsResponse.parse(listMyMealOptions()));
});

router.get("/me/meals/today", requireAuth, async (req, res): Promise<void> => {
  const meals = await getTodayMeals(req.user!);
  res.json(GetTodayMealsResponse.parse(meals));
});

router.post(
  "/me/meal-entries",
  requireAuth,
  async (req, res): Promise<void> => {
    if (!containsOnlyKnownKeys(req.body, CREATE_MEAL_ENTRY_KEYS)) {
      throw new HttpError(400, "Invalid meal entry");
    }
    const parsed = CreateMyMealEntryBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid meal entry");

    const entry = await createMyMealEntry(req.user!, parsed.data);
    res.status(201).json(CreateMyMealEntryResponse.parse(entry));
  },
);

router.patch(
  "/me/meal-entries/:mealEntryId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateMyMealEntryParams.safeParse(req.params);
    if (!containsOnlyKnownKeys(req.body, UPDATE_MEAL_ENTRY_KEYS)) {
      throw new HttpError(400, "Invalid meal entry update");
    }
    const body = UpdateMyMealEntryBody.safeParse(req.body);
    if (!params.success || !body.success) {
      throw new HttpError(400, "Invalid meal entry update");
    }

    const entry = await updateMyMealEntry(
      req.userId!,
      params.data.mealEntryId,
      body.data.servings,
    );
    if (!entry) throw new HttpError(404, "Meal entry not found");
    res.json(UpdateMyMealEntryResponse.parse(entry));
  },
);

router.delete(
  "/me/meal-entries/:mealEntryId",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = DeleteMyMealEntryParams.safeParse(req.params);
    if (!parsed.success) throw new HttpError(400, "Invalid meal entry ID");

    // DELETE is idempotent: a retry after a lost 204 remains successful. The
    // service still scopes the mutation to the authenticated owner, while the
    // response does not reveal whether another user's entry exists.
    await deleteMyMealEntry(req.userId!, parsed.data.mealEntryId);
    res.status(204).send();
  },
);

export default router;
