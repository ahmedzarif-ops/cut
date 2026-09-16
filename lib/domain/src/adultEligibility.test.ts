import { describe, expect, it } from "vitest";
import type { Clock } from "./clock";
import {
  ADULT_ELIGIBILITY_MINIMUM_AGE,
  ADULT_ELIGIBILITY_POLICY_VERSION,
  evaluateAdultEligibility,
} from "./adultEligibility";

const clock = (iso: string): Clock => ({ now: () => new Date(iso) });

describe("adult eligibility", () => {
  it("exports the approved versioned 18+ policy", () => {
    expect(ADULT_ELIGIBILITY_POLICY_VERSION).toBe("adult-18-v1");
    expect(ADULT_ELIGIBILITY_MINIMUM_AGE).toBe(18);
  });

  it("accepts the exact 18th birthday using the injected UTC date", () => {
    expect(
      evaluateAdultEligibility("2008-08-03", clock("2026-08-03T00:00:00.000Z")),
    ).toEqual({ status: "eligible" });
  });

  it("rejects someone one day short of 18", () => {
    expect(
      evaluateAdultEligibility("2008-08-04", clock("2026-08-03T23:59:59.999Z")),
    ).toEqual({ status: "ineligible" });
  });

  it("rejects impossible, non-canonical, and future dates", () => {
    expect(
      evaluateAdultEligibility("2008-02-30", clock("2026-08-03T12:00:00.000Z")),
    ).toEqual({ status: "invalid", reason: "invalid_date" });
    expect(
      evaluateAdultEligibility("08/03/2008", clock("2026-08-03T12:00:00.000Z")),
    ).toEqual({ status: "invalid", reason: "invalid_date" });
    expect(
      evaluateAdultEligibility("2026-08-04", clock("2026-08-03T12:00:00.000Z")),
    ).toEqual({ status: "invalid", reason: "future_date" });
  });

  it("treats March 1 as the 18th birthday for a leap-day birth", () => {
    expect(
      evaluateAdultEligibility("2008-02-29", clock("2026-02-28T23:59:59.999Z")),
    ).toEqual({ status: "ineligible" });
    expect(
      evaluateAdultEligibility("2008-02-29", clock("2026-03-01T00:00:00.000Z")),
    ).toEqual({ status: "eligible" });
  });

  it("does not trust a client-local date near the UTC boundary", () => {
    expect(
      evaluateAdultEligibility("2008-08-04", clock("2026-08-04T00:00:00.000Z")),
    ).toEqual({ status: "eligible" });
  });
});
