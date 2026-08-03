import { describe, expect, it } from "vitest";

import {
  isWeightEntryPreconditionFailed,
  shouldResetReviewedWeightDay,
} from "../weight-form";

describe("isWeightEntryPreconditionFailed", () => {
  it("recognizes a stale reviewed day without misclassifying other failures", () => {
    expect(isWeightEntryPreconditionFailed({ status: 412 })).toBe(true);
    expect(isWeightEntryPreconditionFailed({ status: 409 })).toBe(false);
    expect(isWeightEntryPreconditionFailed({ status: 503 })).toBe(false);
    expect(isWeightEntryPreconditionFailed(new Error("offline"))).toBe(false);
    expect(isWeightEntryPreconditionFailed(null)).toBe(false);
  });

  it("requires a fresh review when Today or the reviewed day changes", () => {
    expect(
      shouldResetReviewedWeightDay({
        priorAuthoritativeDayKey: "2026-08-03",
        currentAuthoritativeDayKey: "2026-08-04",
        reviewedDayKey: "2026-08-03",
      }),
    ).toBe(true);
    expect(
      shouldResetReviewedWeightDay({
        priorAuthoritativeDayKey: "2026-08-04",
        currentAuthoritativeDayKey: "2026-08-04",
        reviewedDayKey: "2026-08-03",
      }),
    ).toBe(true);
    expect(
      shouldResetReviewedWeightDay({
        priorAuthoritativeDayKey: "2026-08-04",
        currentAuthoritativeDayKey: "2026-08-04",
        reviewedDayKey: "2026-08-04",
      }),
    ).toBe(false);
    expect(
      shouldResetReviewedWeightDay({
        priorAuthoritativeDayKey: null,
        currentAuthoritativeDayKey: "2026-08-04",
        reviewedDayKey: null,
      }),
    ).toBe(false);
  });
});
