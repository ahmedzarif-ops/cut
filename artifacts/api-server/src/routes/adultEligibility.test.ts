import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  accountDeletionRequestsTable,
  profilesTable,
  usersTable,
} from "@workspace/db";
import type { Clock } from "@workspace/domain";

import { hashClerkIdentity } from "../services/accountDeletionService";
import { setAdultEligibilityClock } from "../services/adultEligibilityService";
import {
  TEST_EMAIL_HEADER,
  TEST_USER_HEADER,
  createTestContext,
  type TestContext,
} from "../test/helpers";

let ctx: TestContext;
const asUser = (id: string, email?: string) => ({
  [TEST_USER_HEADER]: id,
  ...(email ? { [TEST_EMAIL_HEADER]: email } : {}),
});
const clock = (iso: string): Clock => ({ now: () => new Date(iso) });
const adultInput = (dateOfBirth: string) => ({
  dateOfBirth,
  policyVersion: "adult-18-v1",
  adultAttestation: true,
});

beforeEach(async () => {
  ctx = await createTestContext();
  setAdultEligibilityClock(clock("2026-08-03T12:00:00.000Z"));
});

afterEach(async () => {
  setAdultEligibilityClock(null);
  await ctx.close();
});

async function usersFor(clerkUserId: string) {
  return ctx.db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
}

describe("adult eligibility API", () => {
  it("requires Clerk auth, reports unverified without JIT, and normal APIs fail closed", async () => {
    expect(
      (await request(ctx.app).get("/api/me/adult-eligibility")).status,
    ).toBe(401);
    expect(
      (
        await request(ctx.app)
          .put("/api/me/adult-eligibility")
          .send(adultInput("1990-01-01"))
      ).status,
    ).toBe(401);

    const clerkUserId = "adult_status_only";
    const status = await request(ctx.app)
      .get("/api/me/adult-eligibility")
      .set(asUser(clerkUserId));
    expect(status.status).toBe(200);
    expect(status.body).toEqual({
      status: "unverified",
      minimumAge: 18,
      policyVersion: "adult-18-v1",
    });
    expect(status.headers["cache-control"]).toBe("no-store");
    expect(await usersFor(clerkUserId)).toEqual([]);

    const privateResponse = await request(ctx.app)
      .get("/api/me")
      .set(asUser(clerkUserId));
    expect(privateResponse.status).toBe(428);
    expect(privateResponse.body.code).toBe("adult_eligibility_required");
    expect(await usersFor(clerkUserId)).toEqual([]);

    const existingUnverifiedId = "adult_existing_unverified";
    await ctx.db
      .insert(usersTable)
      .values({ clerkUserId: existingUnverifiedId });
    const existingStatus = await request(ctx.app)
      .get("/api/me/adult-eligibility")
      .set(asUser(existingUnverifiedId));
    const existingPrivate = await request(ctx.app)
      .get("/api/me")
      .set(asUser(existingUnverifiedId));
    expect(existingStatus.body.status).toBe("unverified");
    expect(existingPrivate.status).toBe(428);
    expect(existingPrivate.body.code).toBe("adult_eligibility_required");
    expect(await usersFor(existingUnverifiedId)).toHaveLength(1);
  });

  it("rejects invalid, future, stale-policy, and unknown-field inputs without creating a row", async () => {
    const clerkUserId = "adult_invalid";
    const headers = asUser(clerkUserId);
    const impossible = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send(adultInput("2008-02-30"));
    const future = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send(adultInput("2026-08-04"));
    const stale = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send({ ...adultInput("1990-01-01"), policyVersion: "adult-17-v0" });
    const unknown = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send({ ...adultInput("1990-01-01"), rawBirthDateCopy: true });
    const unattested = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send({ ...adultInput("1990-01-01"), adultAttestation: false });

    expect(impossible.status).toBe(400);
    expect(future.status).toBe(400);
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("adult_eligibility_policy_changed");
    expect(unknown.status).toBe(400);
    expect(unattested.status).toBe(400);
    expect(await usersFor(clerkUserId)).toEqual([]);
  });

  it("accepts the exact 18th birthday and persists only the derived decision", async () => {
    const clerkUserId = "adult_exact_boundary";
    const email = "adult@example.com";
    const response = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(asUser(clerkUserId, email))
      .send(adultInput("2008-08-03"));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "eligible",
      minimumAge: 18,
      policyVersion: "adult-18-v1",
    });

    const [stored] = await usersFor(clerkUserId);
    expect(stored).toMatchObject({
      email,
      adultEligibilityStatus: "eligible",
      adultEligibilityPolicyVersion: "adult-18-v1",
    });
    expect(stored?.adultEligibilityDecidedAt).toEqual(
      new Date("2026-08-03T12:00:00.000Z"),
    );
    expect(JSON.stringify(stored)).not.toContain("2008-08-03");
    expect(
      (
        await request(ctx.app)
          .get("/api/me/adult-eligibility")
          .set(asUser(clerkUserId))
      ).body.status,
    ).toBe("eligible");
    expect(
      (await request(ctx.app).get("/api/me").set(asUser(clerkUserId))).status,
    ).toBe(200);
  });

  it("makes an underage decision monotonic, stores no email, and blocks private data", async () => {
    const clerkUserId = "adult_underage";
    const headers = asUser(clerkUserId, "minor@example.com");
    const first = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send(adultInput("2008-08-04"));
    expect(first.status).toBe(403);
    expect(first.body.code).toBe("adult_eligibility_denied");

    const retryWithOlderDate = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(headers)
      .send(adultInput("1990-01-01"));
    expect(retryWithOlderDate.status).toBe(403);

    const [stored] = await usersFor(clerkUserId);
    expect(stored).toMatchObject({
      email: null,
      adultEligibilityStatus: "ineligible",
      adultEligibilityPolicyVersion: "adult-18-v1",
    });
    expect(
      (await request(ctx.app).get("/api/me/adult-eligibility").set(headers))
        .body.status,
    ).toBe("ineligible");
    const privateResponses = await Promise.all([
      request(ctx.app).get("/api/me").set(headers),
      request(ctx.app).get("/api/me/profile").set(headers),
      request(ctx.app).get("/api/me/today").set(headers),
      request(ctx.app).get("/api/me/meal-options").set(headers),
      request(ctx.app).get("/api/me/weight-entries").set(headers),
    ]);
    expect(privateResponses.map((item) => item.status)).toEqual([
      403, 403, 403, 403, 403,
    ]);
    expect(
      await ctx.db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, stored!.id)),
    ).toEqual([]);
  });

  it("serializes contradictory concurrent decisions so the first decision wins", async () => {
    const clerkUserId = "adult_concurrent";
    const headers = asUser(clerkUserId, "winner@example.com");
    const [eligibleAttempt, ineligibleAttempt] = await Promise.all([
      request(ctx.app)
        .put("/api/me/adult-eligibility")
        .set(headers)
        .send(adultInput("1990-01-01")),
      request(ctx.app)
        .put("/api/me/adult-eligibility")
        .set(headers)
        .send(adultInput("2010-01-01")),
    ]);
    expect(
      [eligibleAttempt.status, ineligibleAttempt.status].every(
        (status) => status === 200,
      ) ||
        [eligibleAttempt.status, ineligibleAttempt.status].every(
          (status) => status === 403,
        ),
    ).toBe(true);

    const [stored] = await usersFor(clerkUserId);
    expect(stored?.adultEligibilityStatus).toMatch(/^(eligible|ineligible)$/);
    expect(stored?.email).toBe(
      stored?.adultEligibilityStatus === "eligible"
        ? "winner@example.com"
        : null,
    );
  });

  it("isolates principals and requires review when an eligible decision is from an old policy", async () => {
    const eligibleId = "adult_cross_a";
    const otherId = "adult_cross_b";
    await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(asUser(eligibleId))
      .send(adultInput("1990-01-01"));
    expect(
      (await request(ctx.app).get("/api/me").set(asUser(eligibleId))).status,
    ).toBe(200);
    expect(
      (await request(ctx.app).get("/api/me").set(asUser(otherId))).status,
    ).toBe(428);
    expect(await usersFor(otherId)).toEqual([]);

    await ctx.db
      .update(usersTable)
      .set({ adultEligibilityPolicyVersion: "adult-18-v0" })
      .where(eq(usersTable.clerkUserId, eligibleId));
    const status = await request(ctx.app)
      .get("/api/me/adult-eligibility")
      .set(asUser(eligibleId));
    expect(status.body.status).toBe("review_required");
    expect(
      (await request(ctx.app).get("/api/me").set(asUser(eligibleId))).status,
    ).toBe(428);
  });

  it("gives durable account deletion precedence without creating a user", async () => {
    const clerkUserId = "adult_deleted";
    await ctx.db.insert(accountDeletionRequestsTable).values({
      identityHash: hashClerkIdentity(clerkUserId),
      clerkUserId: null,
      status: "completed",
      completedAt: new Date("2026-08-03T12:00:00.000Z"),
    });

    const get = await request(ctx.app)
      .get("/api/me/adult-eligibility")
      .set(asUser(clerkUserId));
    const put = await request(ctx.app)
      .put("/api/me/adult-eligibility")
      .set(asUser(clerkUserId))
      .send(adultInput("1990-01-01"));
    expect(get.status).toBe(410);
    expect(put.status).toBe(410);
    expect(await usersFor(clerkUserId)).toEqual([]);
  });
});
