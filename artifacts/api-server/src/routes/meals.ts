import { Router, type IRouter } from "express";
import {
  CreateMyMealEntryBody,
  CreateMyMealEntryResponse,
  CreateMyFoodEntryBody,
  CreateMyFoodEntryResponse,
  DeleteMyMealEntryParams,
  GetTodayMealsResponse,
  GetMyBarcodeFoodParams,
  GetMyBarcodeFoodResponse,
  ListMyMealOptionsResponse,
  ListMyProMealFitsResponse,
  ListMyFoodLibraryQueryParams,
  ListMyFoodLibraryResponse,
  UpdateMyMealEntryBody,
  UpdateMyMealEntryParams,
  UpdateMyMealEntryResponse,
  GetMyNutritionPreferencesResponse,
  UpsertMyNutritionPreferencesBody,
  UpsertMyNutritionPreferencesResponse,
  ListMySavedFoodsResponse,
  SaveMyFoodBody,
  SaveMyFoodResponse,
  DeleteMySavedFoodParams,
  UpsertMyMealFeedbackParams,
  UpsertMyMealFeedbackBody,
  UpsertMyMealFeedbackResponse,
  DeleteMyMealFeedbackParams,
  CreateMyProMealDraftsBody,
  CreateMyProMealDraftsResponse,
} from "@workspace/api-zod";

import { HttpError } from "../lib/httpError";
import { lookupBarcodeFood } from "../services/foodLookupService";
import { requireDeviceTimeZone } from "../middlewares/requireDeviceTimeZone";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSubscription } from "../middlewares/requireSubscription";
import {
  createMyMealEntry,
  createMyFoodEntry,
  deleteMyMealEntry,
  getTodayMeals,
  listMyMealOptions,
  listMyProMealFits,
  listMyFoodLibrary,
  updateMyMealEntry,
} from "../services/mealService";
import {
  deleteMyMealFeedback,
  deleteMySavedFood,
  getMyNutritionPreferences,
  listMySavedFoods,
  resetMyNutritionPreferences,
  saveMyFood,
  upsertMyMealFeedback,
  upsertMyNutritionPreferences,
} from "../services/nutritionService";
import { createMyMealDrafts } from "../services/mealDraftService";

const router: IRouter = Router();
const CREATE_MEAL_ENTRY_KEYS = new Set([
  "clientRequestId",
  "catalogVersion",
  "dayKey",
  "mealTemplateId",
  "servings",
]);
const UPDATE_MEAL_ENTRY_KEYS = new Set(["servings"]);
const CREATE_FOOD_ENTRY_KEYS = new Set([
  "clientRequestId",
  "dayKey",
  "name",
  "servingDescription",
  "servings",
  "caloriesKcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
]);
const NUTRITION_PREFERENCE_KEYS = new Set([
  "dailyCalorieTarget",
  "dailyProteinTargetG",
  "dietStyle",
  "preferredCuisines",
  "avoidedIngredients",
  "learningEnabled",
]);
const SAVED_FOOD_KEYS = new Set([
  "source",
  "sourceRef",
  "name",
  "servingDescription",
  "caloriesKcal",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
]);
const MEAL_FEEDBACK_KEYS = new Set(["preference"]);
const MEAL_DRAFT_KEYS = new Set([
  "goal",
  "mealTime",
  "maxPrepMinutes",
  "availableIngredients",
  "notes",
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

router.get("/me/meal-options", requireAuth, (_req, res): void => {
  res.json(ListMyMealOptionsResponse.parse(listMyMealOptions()));
});

router.get("/me/food-library", requireAuth, (req, res): void => {
  const parsed = ListMyFoodLibraryQueryParams.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, "Invalid food search");
  res.json(
    ListMyFoodLibraryResponse.parse(listMyFoodLibrary(parsed.data.query)),
  );
});

router.get(
  "/me/nutrition-preferences",
  requireAuth,
  async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    res.json(
      GetMyNutritionPreferencesResponse.parse(
        await getMyNutritionPreferences(req.userId!),
      ),
    );
  },
);

router.put(
  "/me/nutrition-preferences",
  requireAuth,
  async (req, res): Promise<void> => {
    if (!containsOnlyKnownKeys(req.body, NUTRITION_PREFERENCE_KEYS)) {
      throw new HttpError(400, "Invalid nutrition preferences");
    }
    const parsed = UpsertMyNutritionPreferencesBody.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid nutrition preferences");
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(
      UpsertMyNutritionPreferencesResponse.parse(
        await upsertMyNutritionPreferences(req.userId!, parsed.data),
      ),
    );
  },
);

router.delete(
  "/me/nutrition-preferences",
  requireAuth,
  async (req, res): Promise<void> => {
    await resetMyNutritionPreferences(req.userId!);
    res.status(204).send();
  },
);

router.get("/me/saved-foods", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.json(ListMySavedFoodsResponse.parse(await listMySavedFoods(req.userId!)));
});

router.post("/me/saved-foods", requireAuth, async (req, res): Promise<void> => {
  if (!containsOnlyKnownKeys(req.body, SAVED_FOOD_KEYS)) {
    throw new HttpError(400, "Invalid saved food");
  }
  const parsed = SaveMyFoodBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "Invalid saved food");
  res
    .status(201)
    .json(SaveMyFoodResponse.parse(await saveMyFood(req.userId!, parsed.data)));
});

router.delete(
  "/me/saved-foods/:savedFoodId",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = DeleteMySavedFoodParams.safeParse(req.params);
    if (!parsed.success) throw new HttpError(400, "Invalid saved food ID");
    await deleteMySavedFood(req.userId!, parsed.data.savedFoodId);
    res.status(204).send();
  },
);

router.put(
  "/me/meal-feedback/:templateId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpsertMyMealFeedbackParams.safeParse(req.params);
    if (!containsOnlyKnownKeys(req.body, MEAL_FEEDBACK_KEYS)) {
      throw new HttpError(400, "Invalid meal feedback");
    }
    const body = UpsertMyMealFeedbackBody.safeParse(req.body);
    if (!params.success || !body.success) {
      throw new HttpError(400, "Invalid meal feedback");
    }
    res.json(
      UpsertMyMealFeedbackResponse.parse(
        await upsertMyMealFeedback(
          req.userId!,
          params.data.templateId,
          body.data.preference,
        ),
      ),
    );
  },
);

router.delete(
  "/me/meal-feedback/:templateId",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = DeleteMyMealFeedbackParams.safeParse(req.params);
    if (!parsed.success) throw new HttpError(400, "Invalid meal template ID");
    await deleteMyMealFeedback(req.userId!, parsed.data.templateId);
    res.status(204).send();
  },
);

router.get(
  "/me/pro/meal-fits",
  requireAuth,
  requireSubscription,
  requireDeviceTimeZone,
  async (req, res): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    res.json(
      ListMyProMealFitsResponse.parse(
        await listMyProMealFits(req.userId!, req.deviceTimeZone!),
      ),
    );
  },
);

router.post(
  "/me/pro/meal-drafts",
  requireAuth,
  requireSubscription,
  requireDeviceTimeZone,
  async (req, res): Promise<void> => {
    if (!containsOnlyKnownKeys(req.body, MEAL_DRAFT_KEYS)) {
      throw new HttpError(400, "Invalid meal draft request");
    }
    const parsed = CreateMyProMealDraftsBody.safeParse(req.body);
    if (!parsed.success || !Number.isInteger(parsed.data.maxPrepMinutes)) {
      throw new HttpError(400, "Invalid meal draft request");
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(
      CreateMyProMealDraftsResponse.parse(
        await createMyMealDrafts(req.user!, parsed.data, req.deviceTimeZone!, {
          logger: req.log,
        }),
      ),
    );
  },
);

router.get(
  "/me/meals/today",
  requireAuth,
  requireDeviceTimeZone,
  async (req, res): Promise<void> => {
    const meals = await getTodayMeals(req.user!, req.deviceTimeZone!);
    res.json(GetTodayMealsResponse.parse(meals));
  },
);

router.get(
  "/me/foods/barcode/:barcode",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = GetMyBarcodeFoodParams.safeParse(req.params);
    if (!parsed.success) throw new HttpError(400, "Invalid barcode");
    const food = await lookupBarcodeFood(parsed.data.barcode);
    res.json(GetMyBarcodeFoodResponse.parse(food));
  },
);

router.post(
  "/me/meal-entries",
  requireAuth,
  requireDeviceTimeZone,
  async (req, res): Promise<void> => {
    if (!containsOnlyKnownKeys(req.body, CREATE_MEAL_ENTRY_KEYS)) {
      throw new HttpError(400, "Invalid meal entry");
    }
    const parsed = CreateMyMealEntryBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid meal entry");

    const entry = await createMyMealEntry(
      req.user!,
      parsed.data,
      req.deviceTimeZone!,
    );
    res.status(201).json(CreateMyMealEntryResponse.parse(entry));
  },
);

router.post(
  "/me/food-entries",
  requireAuth,
  requireDeviceTimeZone,
  async (req, res): Promise<void> => {
    if (!containsOnlyKnownKeys(req.body, CREATE_FOOD_ENTRY_KEYS)) {
      throw new HttpError(400, "Invalid food entry");
    }
    const parsed = CreateMyFoodEntryBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid food entry");

    const entry = await createMyFoodEntry(
      req.user!,
      parsed.data,
      req.deviceTimeZone!,
    );
    res.status(201).json(CreateMyFoodEntryResponse.parse(entry));
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
