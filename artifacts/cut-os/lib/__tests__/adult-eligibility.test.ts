import { describe, expect, it, vi } from "vitest";

import {
  ADULT_ELIGIBILITY_POLICY_VERSION,
  AdultEligibilityPrincipalChangedError,
  decideAdultEligibilityRoute,
  executeOwnedAdultEligibilityWrite,
  formatDateOfBirth,
  parseAdultEligibilityResponse,
  resolveAdultEligibilityQuery,
  shouldClearAdultEligibilityInput,
  shouldDeferPrivateRouteForDeclaredAgeRange,
  validateDateOfBirth,
} from "../adult-eligibility";
import {
  declaredAgeRangeAllowsPrivateAccess,
  resolveAdultAgeRangeResponse,
  resolveDeclaredAgeRangeRequirement,
} from "../declared-age-range";

describe("Apple declared age range", () => {
  it("requires the system sheet only for an eligible regulated user", () => {
    expect(
      resolveDeclaredAgeRangeRequirement({
        supported: true,
        isEligibleForAgeFeatures: true,
        requiredFeatures: ["declaredAgeRangeRequired"],
      }),
    ).toBe("required");
    expect(
      resolveDeclaredAgeRangeRequirement({
        supported: true,
        isEligibleForAgeFeatures: false,
        requiredFeatures: [],
      }),
    ).toBe("not_required");
  });

  it("opens private features only for an adult range or no requirement", () => {
    expect(
      resolveAdultAgeRangeResponse({
        status: "sharing",
        lowerBound: 18,
        upperBound: null,
      }),
    ).toBe("verified_adult");
    expect(
      resolveAdultAgeRangeResponse({
        status: "sharing",
        lowerBound: null,
        upperBound: 17,
      }),
    ).toBe("ineligible");
    expect(resolveAdultAgeRangeResponse({ status: "declined" })).toBe(
      "declined",
    );
    expect(declaredAgeRangeAllowsPrivateAccess("verified_adult")).toBe(true);
    expect(declaredAgeRangeAllowsPrivateAccess("not_required")).toBe(true);
    expect(declaredAgeRangeAllowsPrivateAccess("required")).toBe(false);
    expect(declaredAgeRangeAllowsPrivateAccess("error")).toBe(false);
  });

  it("rejects ambiguous or contradictory age ranges", () => {
    expect(() =>
      resolveAdultAgeRangeResponse({
        status: "sharing",
        lowerBound: null,
        upperBound: null,
      }),
    ).toThrow(/ambiguous/i);
    expect(() =>
      resolveAdultAgeRangeResponse({
        status: "sharing",
        lowerBound: 18,
        upperBound: 17,
      }),
    ).toThrow(/contradictory/i);
  });
});

describe("adult eligibility route gate", () => {
  it("waits on a private route while Apple's declared-age check is loading", () => {
    expect(
      shouldDeferPrivateRouteForDeclaredAgeRange({
        route: "private",
        status: "eligible",
        declaredAgeRangeLoading: true,
      }),
    ).toBe(true);
    expect(
      shouldDeferPrivateRouteForDeclaredAgeRange({
        route: "adult_eligibility",
        status: "eligible",
        declaredAgeRangeLoading: true,
      }),
    ).toBe(false);
    expect(
      shouldDeferPrivateRouteForDeclaredAgeRange({
        route: "private",
        status: "eligible",
        declaredAgeRangeLoading: false,
      }),
    ).toBe(false);
  });

  it("allows private routes only for the exact eligible status", () => {
    expect(
      decideAdultEligibilityRoute({
        deletionRequired: false,
        route: "private",
        status: "eligible",
      }),
    ).toBe("allow_route");
    for (const status of [
      null,
      "unverified",
      "ineligible",
      "review_required",
    ] as const) {
      expect(
        decideAdultEligibilityRoute({
          deletionRequired: false,
          route: "private",
          status,
        }),
      ).toBe("redirect_adult_eligibility");
    }
  });

  it("keeps the gate and Settings reachable while failing closed", () => {
    expect(
      decideAdultEligibilityRoute({
        deletionRequired: false,
        route: "adult_eligibility",
        status: null,
      }),
    ).toBe("allow_route");
    expect(
      decideAdultEligibilityRoute({
        deletionRequired: false,
        route: "settings",
        status: null,
      }),
    ).toBe("allow_route");
  });

  it("gives account-deletion recovery precedence over every age state", () => {
    expect(
      decideAdultEligibilityRoute({
        deletionRequired: true,
        route: "adult_eligibility",
        status: "eligible",
      }),
    ).toBe("redirect_settings");
    expect(
      decideAdultEligibilityRoute({
        deletionRequired: true,
        route: "settings",
        status: null,
      }),
    ).toBe("allow_route");
  });

  it("rejects unknown policy, age, and status responses", () => {
    expect(() =>
      parseAdultEligibilityResponse({
        status: "eligible",
        minimumAge: 21,
        policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
      }),
    ).toThrow(/unknown age requirement/i);
    expect(() =>
      parseAdultEligibilityResponse({
        status: "grandfathered",
        minimumAge: 18,
        policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
      }),
    ).toThrow(/unknown age requirement/i);
  });

  it("fails closed when a refresh error retains an older eligible result", () => {
    const cachedEligible = {
      status: "eligible",
      minimumAge: 18,
      policyVersion: ADULT_ELIGIBILITY_POLICY_VERSION,
    };
    expect(resolveAdultEligibilityQuery(cachedEligible, true)).toEqual({
      response: null,
      error: "unavailable",
    });
    expect(resolveAdultEligibilityQuery(cachedEligible, false)).toEqual({
      response: cachedEligible,
      error: null,
    });
  });

  it("clears transient DOB input when a recovered decision is terminal", () => {
    expect(shouldClearAdultEligibilityInput("eligible")).toBe(true);
    expect(shouldClearAdultEligibilityInput("ineligible")).toBe(true);
    expect(shouldClearAdultEligibilityInput("unverified")).toBe(false);
    expect(shouldClearAdultEligibilityInput("review_required")).toBe(false);
    expect(shouldClearAdultEligibilityInput(null)).toBe(false);
  });
});

describe("date-of-birth form", () => {
  it("normalizes a valid civil date without a timezone conversion", () => {
    expect(
      validateDateOfBirth({ month: "8", day: "3", year: "1996" }, "2026-08-03"),
    ).toEqual({ ok: true, dateOfBirth: "1996-08-03" });
    expect(formatDateOfBirth("1996-08-03", "en-US")).toBe("August 3, 1996");
  });

  it("accepts leap day only in a leap year", () => {
    expect(
      validateDateOfBirth({ month: "2", day: "29", year: "2004" }, "2026-08-03")
        .ok,
    ).toBe(true);
    expect(
      validateDateOfBirth(
        { month: "2", day: "29", year: "2003" },
        "2026-08-03",
      ),
    ).toMatchObject({ ok: false, field: "day" });
  });

  it("identifies incomplete, invalid, and future dates", () => {
    expect(
      validateDateOfBirth({ month: "", day: "3", year: "1996" }, "2026-08-03"),
    ).toMatchObject({ ok: false, field: "month" });
    expect(
      validateDateOfBirth(
        { month: "13", day: "3", year: "1996" },
        "2026-08-03",
      ),
    ).toMatchObject({ ok: false, field: "month" });
    expect(
      validateDateOfBirth({ month: "8", day: "4", year: "2026" }, "2026-08-03"),
    ).toMatchObject({ ok: false, field: "year", message: /future/i });
  });
});

describe("owner-scoped eligibility writes", () => {
  it("stops before sending if the active account changes during token loading", async () => {
    let principal = { userId: "user_a", sessionId: "session_a" };
    const sendRequest = vi.fn();
    await expect(
      executeOwnedAdultEligibilityWrite({
        ownerUserId: "user_a",
        ownerSessionId: "session_a",
        currentPrincipal: () => principal,
        getToken: async () => {
          principal = { userId: "user_b", sessionId: "session_b" };
          return "token_a";
        },
        sendRequest,
      }),
    ).rejects.toBeInstanceOf(AdultEligibilityPrincipalChangedError);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it("passes only the captured owner's token to the request", async () => {
    const sendRequest = vi.fn().mockResolvedValue("eligible");
    await expect(
      executeOwnedAdultEligibilityWrite({
        ownerUserId: "user_a",
        ownerSessionId: "session_a",
        currentPrincipal: () => ({
          userId: "user_a",
          sessionId: "session_a",
        }),
        getToken: async () => "token_a",
        sendRequest,
      }),
    ).resolves.toBe("eligible");
    expect(sendRequest).toHaveBeenCalledWith("token_a");
  });
});
