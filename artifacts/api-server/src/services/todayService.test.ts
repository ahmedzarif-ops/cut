import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Clock } from "@workspace/domain";

import { createTestContext, type TestContext } from "../test/helpers";
import { provisionUser, updateUser, upsertProfile } from "./userService";
import { decideAdultEligibility } from "./adultEligibilityService";
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
  it("uses the request device's local day and advances after the weigh-in", async () => {
    const decision = await decideAdultEligibility({
      clerkUserId: "today_user",
      email: null,
      dateOfBirth: "1990-01-01",
      policyVersion: "adult-18-v1",
    });
    await upsertProfile(decision.userId, { goal: "cut" });
    const configured = await updateUser(decision.userId, {
      // Deliberately different: daily services must use the request device's
      // timezone, never this shared account preference.
      timezone: "Asia/Dhaka",
    });
    const lateEvening = clock("2026-08-04T04:30:00.000Z");

    const before = await getTodayState(
      configured!,
      "America/Chicago",
      lateEvening,
    );
    expect(before.dayKey).toBe("2026-08-03");
    expect(before.nextAction.kind).toBe("weigh_in");

    const saved = await upsertTodayWeight(
      configured!,
      { dayKey: before.dayKey, weightKg: 95.25 },
      "America/Chicago",
      lateEvening,
    );
    expect(saved?.recordedOn).toBe("2026-08-03");

    const after = await getTodayState(
      configured!,
      "America/Chicago",
      lateEvening,
    );
    expect(after.nextAction.kind).toBe("first_meal");
    expect(after.weightEntry?.weightKg).toBeCloseTo(95.25);
  });

  it("upserts one record per local day instead of duplicating a double tap", async () => {
    const user = await provisionUser({
      clerkUserId: "today_idempotent",
      email: null,
    });
    const fixed = clock("2026-08-03T14:00:00.000Z");

    const first = await upsertTodayWeight(
      user!,
      { dayKey: "2026-08-03", weightKg: 96 },
      "UTC",
      fixed,
    );
    const second = await upsertTodayWeight(
      user!,
      { dayKey: "2026-08-03", weightKg: 95.8 },
      "UTC",
      fixed,
    );
    const entries = await listWeightEntries(user!.id);

    expect(second?.id).toBe(first?.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].weightKg).toBeCloseTo(95.8);
  });

  it("rejects a reviewed day that is stale before writing a weigh-in", async () => {
    const user = await provisionUser({
      clerkUserId: "today_stale_review",
      email: null,
    });

    await expect(
      upsertTodayWeight(
        user!,
        { dayKey: "2026-08-02", weightKg: 95.8 },
        "UTC",
        clock("2026-08-03T14:00:00.000Z"),
      ),
    ).rejects.toMatchObject({
      statusCode: 412,
      message: "Today changed. Refresh and review your weigh-in before saving",
    });
    expect(await listWeightEntries(user!.id)).toEqual([]);
  });

  it("lists only the authenticated user's records", async () => {
    const userA = await provisionUser({ clerkUserId: "weight_a", email: null });
    const userB = await provisionUser({ clerkUserId: "weight_b", email: null });
    await upsertTodayWeight(
      userA!,
      { dayKey: "2026-08-03", weightKg: 90 },
      "UTC",
      clock("2026-08-03T12:00:00.000Z"),
    );

    expect(await listWeightEntries(userA!.id)).toHaveLength(1);
    expect(await listWeightEntries(userB!.id)).toHaveLength(0);
  });

  it("rejects a fractional weight-history limit before querying", async () => {
    const user = await provisionUser({
      clerkUserId: "weight_fractional_limit",
      email: null,
    });

    await expect(listWeightEntries(user!.id, 1.5)).rejects.toMatchObject({
      statusCode: 400,
      message: "Weight history limit must be a whole number from 1 to 90",
    });
  });
});
