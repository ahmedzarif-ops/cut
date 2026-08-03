import { describe, expect, it } from "vitest";

import {
  CUT_OS_PRO_ENTITLEMENT_ID,
  decideSubscriptionRoute,
  formatIntroductoryOffer,
  formatPlanBilling,
  formatSubscriptionPeriod,
  isInternalUserUuid,
  resolvePurchaseCapability,
  resolveServerSubscription,
  safeHttpsUrl,
} from "../subscription";

describe("subscription policy", () => {
  it("uses the exact server and RevenueCat entitlement identifier", () => {
    expect(CUT_OS_PRO_ENTITLEMENT_ID).toBe("CUT_OS_PRO");
  });

  it("fails closed on query errors and unknown entitlement identifiers", () => {
    const staleEntitled = {
      entitled: true,
      entitlementId: "CUT_OS_PRO",
      expiresAt: null,
      managementUrl: null,
    };

    expect(resolveServerSubscription(staleEntitled, true)).toEqual({
      state: "unavailable",
    });
    expect(
      resolveServerSubscription(
        { ...staleEntitled, entitlementId: "another_entitlement" },
        false,
      ),
    ).toEqual({ state: "unavailable" });
  });

  it("keeps only Settings and the paywall open without entitlement", () => {
    const unpaid = resolveServerSubscription(
      {
        entitled: false,
        entitlementId: "CUT_OS_PRO",
        expiresAt: null,
        managementUrl: null,
      },
      false,
    );

    expect(
      decideSubscriptionRoute({
        route: "settings",
        subscription: { state: "unavailable" },
        onboardingComplete: false,
      }),
    ).toBe("allow");
    expect(
      decideSubscriptionRoute({
        route: "subscription",
        subscription: unpaid,
        onboardingComplete: false,
      }),
    ).toBe("allow");
    expect(
      decideSubscriptionRoute({
        route: "paid",
        subscription: unpaid,
        onboardingComplete: false,
      }),
    ).toBe("redirect_subscription");
  });

  it("leaves the paywall only after server-confirmed access", () => {
    const entitled = resolveServerSubscription(
      {
        entitled: true,
        entitlementId: "CUT_OS_PRO",
        expiresAt: "2030-01-01T00:00:00.000Z",
        managementUrl: "https://apps.apple.com/account/subscriptions",
      },
      false,
    );

    expect(
      decideSubscriptionRoute({
        route: "subscription",
        subscription: entitled,
        onboardingComplete: false,
      }),
    ).toBe("redirect_onboarding");
    expect(
      decideSubscriptionRoute({
        route: "subscription",
        subscription: entitled,
        onboardingComplete: true,
      }),
    ).toBe("redirect_today");
  });

  it("formats only StoreKit-supplied prices, periods, and eligible intros", () => {
    expect(formatSubscriptionPeriod("P1M")).toBe("month");
    expect(formatSubscriptionPeriod("P3M")).toBe("3 months");
    expect(formatSubscriptionPeriod("monthly")).toBeNull();
    expect(formatPlanBilling("€12,49", "P1M")).toBe("€12,49 per month");
    expect(
      formatIntroductoryOffer(
        { price: 0, priceString: "€0,00", period: "P1W", cycles: 2 },
        true,
      ),
    ).toBe("Free for 2 weeks");
    expect(
      formatIntroductoryOffer(
        {
          price: 1.99,
          priceString: "$1.99",
          period: "P1M",
          cycles: 3,
        },
        true,
      ),
    ).toBe("$1.99 per month for 3 billing periods");
    expect(
      formatIntroductoryOffer(
        {
          price: 9.99,
          priceString: "$9.99",
          period: "P3M",
          cycles: 1,
        },
        true,
      ),
    ).toBe("$9.99 per 3 months for 1 billing period");
    expect(
      formatIntroductoryOffer(
        { price: 0, priceString: "$0.00", period: "P1W", cycles: 1 },
        false,
      ),
    ).toBeNull();
  });

  it("never attempts real purchases off iOS, in Expo Go, or without a key", () => {
    expect(
      resolvePurchaseCapability({
        platform: "android",
        isExpoGo: false,
        apiKey: "appl_PublicIosKey1234",
      }),
    ).toEqual({ available: false, reason: "ios_only" });
    expect(
      resolvePurchaseCapability({
        platform: "ios",
        isExpoGo: true,
        apiKey: "appl_PublicIosKey1234",
      }),
    ).toEqual({ available: false, reason: "expo_go" });
    expect(
      resolvePurchaseCapability({
        platform: "ios",
        isExpoGo: false,
        apiKey: undefined,
      }),
    ).toEqual({ available: false, reason: "configuration_missing" });
    expect(
      resolvePurchaseCapability({
        platform: "ios",
        isExpoGo: false,
        apiKey: "appl_PublicIosKey1234",
      }),
    ).toEqual({ available: true });
  });

  it("accepts internal UUIDs and sanitizes management URLs", () => {
    expect(isInternalUserUuid("d9428888-122b-4a5f-a4e8-0a0f874235a8")).toBe(
      true,
    );
    expect(isInternalUserUuid("user_clerk_identity")).toBe(false);
    expect(safeHttpsUrl("https://apps.apple.com/account/subscriptions")).toBe(
      "https://apps.apple.com/account/subscriptions",
    );
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpsUrl("http://example.com/manage")).toBeNull();
    expect(safeHttpsUrl("https://user:password@example.com/manage")).toBeNull();
  });
});
