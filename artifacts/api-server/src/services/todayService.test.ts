import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Clock } from "@workspace/domain";

import { createTestContext, type TestContext } from "../test/helpers";
import { provisionUser, updateUser, upsertProfile } from "./userService";
import {
  getTodayState,
  listWeightEntries,
  upsertTodayWeight,
} from "./todayService";

let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx.close();
});

const clock = (iso: string): Clock => ({ now: () => new Date(iso) });

describe("Today state and weigh-ins", () => {
  it("uses the user's local day and advances after the weigh-in", async () => {
    const user = await provisionUser({
      clerkUserId: "today_user",
      email: null,
    });
    await upsertProfile(user!.id, { goal: "cut" });
    const configured = await updateUser(user!.id, {
      timezone: "America/Chicago",
    });
    const lateEvening = clock("2026-08-04T04:30:00.000Z");

    const before = await getTodayState(configured!, lateEvening);
    expect(before.dayKey).toBe("2026-08-03");
    expect(before.nextAction.kind).toBe("weigh_in");

    const saved = await upsertTodayWeight(configured!, 95.25, lateEvening);
    expect(saved?.recordedOn).toBe("2026-08-03");

    const after = await getTodayState(configured!, lateEvening);
    expect(after.nextAction.kind).toBe("first_meal");
    expect(after.weightEntry?.weightKg).toBeCloseTo(95.25);
  });

  it("upserts one record per local day instead of duplicating a double tap", async () => {
    const user = await provisionUser({
      clerkUserId: "today_idempotent",
      email: null,
    });
    const fixed = clock("2026-08-03T14:00:00.000Z");

    const first = await upsertTodayWeight(user!, 96, fixed);
    const second = await upsertTodayWeight(user!, 95.8, fixed);
    const entries = await listWeightEntries(user!.id);

    expect(second?.id).toBe(first?.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].weightKg).toBeCloseTo(95.8);
  });

  it("lists only the authenticated user's records", async () => {
    const userA = await provisionUser({ clerkUserId: "weight_a", email: null });
    const userB = await provisionUser({ clerkUserId: "weight_b", email: null });
    await upsertTodayWeight(userA!, 90, clock("2026-08-03T12:00:00.000Z"));

    expect(await listWeightEntries(userA!.id)).toHaveLength(1);
    expect(await listWeightEntries(userB!.id)).toHaveLength(0);
  });
});
