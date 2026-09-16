import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BALANCED_MEAL_CATALOG,
  BALANCED_MEAL_CATALOG_VERSION,
  getBalancedMealTemplate,
  scaleNutrition,
  type Clock,
} from "@workspace/domain";
import { db, mealEntriesTable } from "@workspace/db";

import { createTestContext, type TestContext } from "../test/helpers";
import {
  createMyMealEntry as createMyMealEntryForDevice,
  deleteMyMealEntry,
  getMealEntriesForDay,
  getTodayMeals as getTodayMealsForDevice,
  listMyMealOptions,
  listMyProMealFits,
  updateMyMealEntry,
} from "./mealService";
import { provisionUser, updateUser } from "./userService";

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.close();
});

const clock = (iso: string): Clock => ({ now: () => new Date(iso) });
const chicagoEvening = clock("2026-08-04T04:30:00.000Z");
const firstTemplate = BALANCED_MEAL_CATALOG[0];

type MealUser = Parameters<typeof createMyMealEntryForDevice>[0];
type MealInput = Parameters<typeof createMyMealEntryForDevice>[1];

const createMyMealEntry = (
  user: MealUser,
  input: MealInput,
  testClock: Clock,
) => createMyMealEntryForDevice(user, input, user.timezone, testClock);

const getTodayMeals = (user: MealUser, testClock: Clock) =>
  getTodayMealsForDevice(user, user.timezone, testClock);

async function user(clerkUserId: string) {
  const provisioned = await provisionUser({ clerkUserId, email: null });
  if (!provisioned) throw new Error("Test user was not provisioned");
  return provisioned;
}

describe("Balanced meal service", () => {
  it("lists the whole ranked catalog with transparent nutrition reasons", async () => {
    const options = await listMyMealOptions();

    expect(options).toHaveLength(BALANCED_MEAL_CATALOG.length);
    expect(options[0]).toMatchObject({
      id: expect.any(String),
      catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
      caloriesKcal: expect.any(Number),
      proteinG: expect.any(Number),
      fiberG: expect.any(Number),
      fitReason: expect.stringContaining("per serving"),
    });
    expect(options.every((option) => option.description.length > 0)).toBe(true);
    expect(
      options
        .flatMap((option) => option.dietaryTags)
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
        .sort(),
    ).toEqual(["pescatarian", "vegan", "vegetarian"]);
    expect(
      options.every(
        (option) =>
          option.fitReason ===
          `${option.proteinG} g protein and ${option.fiberG} g fiber per serving.`,
      ),
    ).toBe(true);

    expect(
      options.find(({ id }) => id === "bengali-chicken-curry-plate"),
    ).toMatchObject({
      catalogVersion: "2026-09-04.2",
      servingDescription:
        "Entire recipe: 150 g chicken, 160 g rice, curry vegetables, spinach and cucumber",
      ingredients: expect.arrayContaining([
        "150 g cooked stewed chicken breast",
        "8 g olive oil",
        "1 g iodized salt",
      ]),
      dietaryTags: [],
      allergens: [],
      caloriesKcal: 600,
      proteinG: 53.5,
      carbsG: 64.7,
      fatG: 13.9,
      fiberG: 6.1,
    });
  });

  it("builds private adaptive Pro fits from only that user's confirmed logs", async () => {
    const owner = await user("adaptive_fit_owner");
    const other = await user("adaptive_fit_other");
    const templateIds = [
      "desi-chicken-masoor-rice-bowl",
      "desi-chicken-quinoa-sabzi-bowl",
      "masoor-brown-rice-sabzi-bowl",
    ];

    for (const [index, mealTemplateId] of templateIds.entries()) {
      await createMyMealEntry(
        owner,
        {
          clientRequestId: `00000000-0000-4000-8000-00000000000${index + 1}`,
          catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
          dayKey: "2026-08-04",
          mealTemplateId,
          servings: 1,
        },
        chicagoEvening,
      );
    }

    const ownerFits = await listMyProMealFits(owner.id);
    const otherFits = await listMyProMealFits(other.id);
    expect(ownerFits).toHaveLength(3);
    expect(ownerFits[0]?.fitReason).toContain(
      "confirmed Desi-inspired meal logs",
    );
    expect(otherFits[0]?.fitReason).toBe(
      "A balanced starting option. Review ingredients and portions.",
    );
  });

  it("uses the user's local day and scales immutable nutrition snapshots", async () => {
    const provisioned = await user("meal_local_day");
    const configured = await updateUser(provisioned.id, {
      timezone: "America/Chicago",
    });
    if (!configured) throw new Error("Test user was not updated");

    const entry = await createMyMealEntry(
      configured,
      {
        clientRequestId: "2bdc77b5-4cbd-49a8-a8bf-36901ba09579",
        catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
        dayKey: "2026-08-03",
        mealTemplateId: firstTemplate.id,
        servings: 1.5,
      },
      chicagoEvening,
    );
    const template = getBalancedMealTemplate(firstTemplate.id)!;
    const expectedNutrition = scaleNutrition(template.nutritionPerServing, 1.5);

    expect(entry.loggedOn).toBe("2026-08-03");
    expect(entry).toMatchObject(expectedNutrition);

    const today = await getTodayMeals(configured, chicagoEvening);
    expect(today.dayKey).toBe("2026-08-03");
    expect(today.entries).toHaveLength(1);
    expect(today.totals).toMatchObject({
      caloriesKcal: entry.caloriesKcal,
      proteinG: entry.proteinG,
      fiberG: entry.fiberG,
    });
  });

  it("returns the original result for an identical retry and rejects key reuse", async () => {
    const provisioned = await user("meal_idempotency");
    const input = {
      clientRequestId: "8e289fe9-1543-408a-9e65-911f456b8a1c",
      mealTemplateId: firstTemplate.id,
      catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
      dayKey: "2026-08-04",
      servings: 1,
    };

    const first = await createMyMealEntry(provisioned, input, chicagoEvening);
    const retry = await createMyMealEntry(provisioned, input, chicagoEvening);
    expect(retry).toEqual(first);
    expect(
      await getMealEntriesForDay(provisioned.id, first.loggedOn),
    ).toHaveLength(1);

    await expect(
      createMyMealEntry(provisioned, { ...input, servings: 2 }, chicagoEvening),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      createMyMealEntry(
        provisioned,
        { ...input, catalogVersion: "2026-08-02.9" },
        chicagoEvening,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(
      createMyMealEntry(
        provisioned,
        { ...input, dayKey: "2026-08-03" },
        chicagoEvening,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("keeps identical retries on their original day and rejects a new stale-day request", async () => {
    const provisioned = await user("meal_midnight_recovery");
    const configured = await updateUser(provisioned.id, {
      timezone: "America/Chicago",
    });
    if (!configured) throw new Error("Test user was not updated");

    const input = {
      clientRequestId: "734af11f-f89d-4019-8624-7bccfb2353f2",
      catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
      dayKey: "2026-08-03",
      mealTemplateId: firstTemplate.id,
      servings: 1,
    };
    const beforeMidnight = chicagoEvening;
    const afterMidnight = clock("2026-08-04T06:30:00.000Z");

    const original = await createMyMealEntry(configured, input, beforeMidnight);
    const recovered = await createMyMealEntry(configured, input, afterMidnight);
    expect(recovered).toEqual(original);
    expect(recovered.loggedOn).toBe("2026-08-03");

    await expect(
      createMyMealEntry(
        configured,
        {
          ...input,
          clientRequestId: "dd4d26aa-3bd2-4445-aed2-8e7a9722754b",
        },
        afterMidnight,
      ),
    ).rejects.toMatchObject({ statusCode: 412 });
    expect(
      await getMealEntriesForDay(configured.id, "2026-08-03"),
    ).toHaveLength(1);
    expect(await getMealEntriesForDay(configured.id, "2026-08-04")).toEqual([]);
  });

  it("resolves truly concurrent identical creates to one snapshot", async () => {
    const provisioned = await user("meal_concurrent_idempotency");
    const input = {
      clientRequestId: "5267f65e-d1ab-40d9-8f3e-a9c3bf91ef3e",
      catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
      dayKey: "2026-08-04",
      mealTemplateId: firstTemplate.id,
      servings: 1,
    };

    const [first, second] = await Promise.all([
      createMyMealEntry(provisioned, input, chicagoEvening),
      createMyMealEntry(provisioned, input, chicagoEvening),
    ]);
    expect(second).toEqual(first);
    expect(
      await getMealEntriesForDay(provisioned.id, "2026-08-04"),
    ).toHaveLength(1);
  });

  it("rejects a stale catalog for a new entry without logging it", async () => {
    const provisioned = await user("meal_stale_catalog");

    await expect(
      createMyMealEntry(
        provisioned,
        {
          clientRequestId: "3c728bed-baf2-4e8d-bbe0-b4e86b25dbec",
          catalogVersion: "2026-08-02.9",
          dayKey: "2026-08-04",
          mealTemplateId: firstTemplate.id,
          servings: 1,
        },
        chicagoEvening,
      ),
    ).rejects.toMatchObject({ statusCode: 412 });

    expect(await getMealEntriesForDay(provisioned.id, "2026-08-03")).toEqual(
      [],
    );
  });

  it("returns an original stale-version snapshot for its identical retry", async () => {
    const provisioned = await user("meal_stale_retry");
    const clientRequestId = "9ca7b593-55c2-4a20-80d6-9f624983360e";
    const staleVersion = "2026-08-02.9";
    const nutrition = firstTemplate.nutritionPerServing;
    await db.insert(mealEntriesTable).values({
      userId: provisioned.id,
      clientRequestId,
      loggedOn: "2026-08-03",
      catalogVersion: staleVersion,
      templateId: firstTemplate.id,
      name: firstTemplate.name,
      servingDescription: firstTemplate.servingDescription,
      servings: 1,
      caloriesKcalPerServing: nutrition.caloriesKcal,
      proteinGPerServing: nutrition.proteinG,
      carbsGPerServing: nutrition.carbsG,
      fatGPerServing: nutrition.fatG,
      fiberGPerServing: nutrition.fiberG,
    });

    const retry = await createMyMealEntry(
      provisioned,
      {
        clientRequestId,
        catalogVersion: staleVersion,
        dayKey: "2026-08-03",
        mealTemplateId: firstTemplate.id,
        servings: 1,
      },
      chicagoEvening,
    );

    expect(retry.catalogVersion).toBe(staleVersion);
    expect(
      await getMealEntriesForDay(provisioned.id, "2026-08-03"),
    ).toHaveLength(1);
  });

  it("rejects unknown templates and out-of-range servings", async () => {
    const provisioned = await user("meal_invalid");

    await expect(
      createMyMealEntry(
        provisioned,
        {
          clientRequestId: "c4ad40af-e338-47c8-b6c4-a034f43e3a89",
          catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
          dayKey: "2026-08-04",
          mealTemplateId: "not-in-the-catalog",
          servings: 1,
        },
        chicagoEvening,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });

    await expect(
      createMyMealEntry(
        provisioned,
        {
          clientRequestId: "a9a693fa-17c9-4389-b81d-4ca86a739043",
          catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
          dayKey: "2026-08-04",
          mealTemplateId: firstTemplate.id,
          servings: 0.1,
        },
        chicagoEvening,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("scopes reads, edits, and deletes to the authenticated user", async () => {
    const owner = await user("meal_owner");
    const other = await user("meal_other");
    const createInput = {
      clientRequestId: "8cfb7875-95a1-4e6c-9793-0254761c2a91",
      catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
      dayKey: "2026-08-04",
      mealTemplateId: firstTemplate.id,
      servings: 1,
    };
    const saved = await createMyMealEntry(owner, createInput, chicagoEvening);

    expect((await getTodayMeals(other, chicagoEvening)).entries).toEqual([]);
    expect(await updateMyMealEntry(other.id, saved.id, 2)).toBeUndefined();
    expect(await deleteMyMealEntry(other.id, saved.id)).toBe(false);

    const updated = await updateMyMealEntry(
      owner.id,
      saved.id,
      2,
      chicagoEvening,
    );
    expect(updated?.servings).toBe(2);
    expect(updated?.caloriesKcal).toBe(saved.caloriesKcal * 2);
    expect(
      (await getTodayMeals(owner, chicagoEvening)).totals.caloriesKcal,
    ).toBe(saved.caloriesKcal * 2);

    expect(await deleteMyMealEntry(owner.id, saved.id)).toBe(true);
    expect((await getTodayMeals(owner, chicagoEvening)).totals).toEqual({
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    });

    // The opaque request UUID remains consumed after deletion. A delayed
    // replay can neither resurrect the deleted meal nor repurpose the key.
    await expect(
      createMyMealEntry(owner, createInput, chicagoEvening),
    ).rejects.toMatchObject({ statusCode: 412 });
    await expect(
      createMyMealEntry(owner, { ...createInput, servings: 2 }, chicagoEvening),
    ).rejects.toMatchObject({ statusCode: 412 });
    expect((await getTodayMeals(owner, chicagoEvening)).entries).toEqual([]);
  });

  it("keeps daily totals invariant across equivalent serving partitions", async () => {
    const quarterUser = await user("meal_partition_quarters");
    const wholeUser = await user("meal_partition_whole");

    for (const clientRequestId of [
      "4ca42b36-71c9-4e7c-af59-0630d3133ced",
      "b66ab323-2879-438c-b529-927c8655ec81",
      "c9e195ba-112b-461a-b19a-8ce34a565b2a",
      "9a65dc02-b744-4701-8dcc-f47b5aaecfef",
    ]) {
      await createMyMealEntry(
        quarterUser,
        {
          clientRequestId,
          catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
          dayKey: "2026-08-04",
          mealTemplateId: firstTemplate.id,
          servings: 0.25,
        },
        chicagoEvening,
      );
    }
    await createMyMealEntry(
      wholeUser,
      {
        clientRequestId: "b953cc06-ab02-49f9-bb4a-92633d336b9e",
        catalogVersion: BALANCED_MEAL_CATALOG_VERSION,
        dayKey: "2026-08-04",
        mealTemplateId: firstTemplate.id,
        servings: 1,
      },
      chicagoEvening,
    );

    const quarterTotals = (await getTodayMeals(quarterUser, chicagoEvening))
      .totals;
    const wholeTotals = (await getTodayMeals(wholeUser, chicagoEvening)).totals;
    expect(quarterTotals).toEqual(wholeTotals);
    expect(quarterTotals).toEqual(firstTemplate.nutritionPerServing);
  });
});
