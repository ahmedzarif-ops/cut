import { describe, expect, it } from "vitest";

import {
  createSubscriptionAdapter,
  SubscriptionAdapterError,
  type RawCustomerInfo,
  type RawOffering,
  type RevenueCatBridge,
} from "../subscription-adapter";

const USER_A = "d9428888-122b-4a5f-a4e8-0a0f874235a8";
const USER_B = "7d444840-9dc0-11d1-b245-5ffdce74fad2";
const PUBLIC_KEY = "appl_PublicIosKey1234";

function customer(
  entitled = false,
  managementURL: string | null = null,
): RawCustomerInfo {
  return {
    entitlements: { active: entitled ? { CUT_OS_PRO: {} } : {} },
    managementURL,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class FakeBridge implements RevenueCatBridge {
  configured = false;
  appUserId = "$RCAnonymousID:test";
  anonymous = true;
  calls: Array<{ name: string; values: unknown[] }> = [];
  listeners = new Set<(info: RawCustomerInfo) => void>();
  currentCustomer = customer();
  offering: RawOffering | null = null;
  eligibility: Record<string, boolean> = {};
  offeringError: unknown = null;
  purchaseDeferred: ReturnType<typeof deferred<RawCustomerInfo>> | null = null;
  purchaseError: unknown = null;

  async isConfigured() {
    return this.configured;
  }

  configure(apiKey: string, appUserId: string) {
    this.calls.push({ name: "configure", values: [apiKey, appUserId] });
    this.configured = true;
    this.appUserId = appUserId;
    this.anonymous = false;
  }

  async getAppUserId() {
    return this.appUserId;
  }

  async logIn(appUserId: string) {
    this.calls.push({ name: "logIn", values: [appUserId] });
    this.appUserId = appUserId;
    this.anonymous = false;
    return {};
  }

  addCustomerInfoListener(listener: (info: RawCustomerInfo) => void) {
    this.calls.push({ name: "addListener", values: [] });
    this.listeners.add(listener);
  }

  removeCustomerInfoListener(listener: (info: RawCustomerInfo) => void) {
    this.calls.push({ name: "removeListener", values: [] });
    this.listeners.delete(listener);
  }

  async getCustomerInfo() {
    return this.currentCustomer;
  }

  async getCurrentOffering() {
    if (this.offeringError) throw this.offeringError;
    return this.offering;
  }

  async checkIntroEligibility(productIds: string[]) {
    this.calls.push({ name: "checkIntro", values: [productIds] });
    return this.eligibility;
  }

  async purchasePackage(_nativePackage: unknown) {
    this.calls.push({ name: "purchase", values: [] });
    if (this.purchaseError) throw this.purchaseError;
    if (this.purchaseDeferred) return this.purchaseDeferred.promise;
    return this.currentCustomer;
  }

  async restorePurchases() {
    this.calls.push({ name: "restore", values: [] });
    return this.currentCustomer;
  }

  isPurchaseCancelled(error: unknown) {
    return (
      !!error &&
      typeof error === "object" &&
      (error as { code?: unknown }).code === "cancelled"
    );
  }
}

function packageItem(input: {
  packageIdentifier: string;
  productIdentifier: string;
  title: string;
  priceString: string;
  period: string | null;
  intro?: {
    price: number;
    priceString: string;
    period: string;
    cycles: number;
  };
}) {
  return {
    identifier: input.packageIdentifier,
    product: {
      identifier: input.productIdentifier,
      title: input.title,
      description: `${input.title} description`,
      priceString: input.priceString,
      subscriptionPeriod: input.period,
      introPrice: input.intro ?? null,
    },
    nativePackage: { packageIdentifier: input.packageIdentifier },
  };
}

describe("RevenueCat subscription adapter", () => {
  it("configures with only the internal UUID and preserves remote package order", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      availablePackages: [
        packageItem({
          packageIdentifier: "quarterly_remote_first",
          productIdentifier: "cut.quarterly",
          title: "Quarterly",
          priceString: "€24,99",
          period: "P3M",
          intro: {
            price: 0,
            priceString: "€0,00",
            period: "P1W",
            cycles: 2,
          },
        }),
        packageItem({
          packageIdentifier: "annual_remote_second",
          productIdentifier: "cut.annual",
          title: "Annual",
          priceString: "€79,99",
          period: "P1Y",
        }),
        packageItem({
          packageIdentifier: "lifetime_not_a_subscription",
          productIdentifier: "cut.lifetime",
          title: "Lifetime",
          priceString: "€199,99",
          period: null,
        }),
      ],
    };
    bridge.eligibility = { "cut.quarterly": true, "cut.annual": false };
    const adapter = createSubscriptionAdapter(bridge);

    const connection = await adapter.connect(PUBLIC_KEY, USER_A, () => {});
    const plans = await adapter.loadPlans(USER_A);

    expect(bridge.calls[0]).toEqual({
      name: "configure",
      values: [PUBLIC_KEY, USER_A],
    });
    expect(JSON.stringify(bridge.calls)).not.toContain("email");
    expect(connection.customer.hasProEntitlement).toBe(false);
    expect(plans.map((plan) => plan.packageIdentifier)).toEqual([
      "quarterly_remote_first",
      "annual_remote_second",
    ]);
    expect(plans[0]).toMatchObject({
      priceString: "€24,99",
      periodLabel: "3 months",
      introductoryText: "Free for 2 weeks, then €24,99 per 3 months",
    });
    expect(plans[1]?.introductoryText).toBeNull();
  });

  it("switches custom UUIDs directly and never creates an anonymous user", async () => {
    const bridge = new FakeBridge();
    const adapter = createSubscriptionAdapter(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await adapter.connect(PUBLIC_KEY, USER_B, () => {});

    const identityCalls = bridge.calls
      .filter((call) => ["configure", "logOut", "logIn"].includes(call.name))
      .map((call) => [call.name, ...call.values]);
    expect(identityCalls).toEqual([
      ["configure", PUBLIC_KEY, USER_A],
      ["logIn", USER_B],
    ]);
    expect(bridge.appUserId).toBe(USER_B);
  });

  it("ignores late purchase results and stale listeners after principal change", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: "cut.monthly",
          title: "Monthly",
          priceString: "$9.99",
          period: "P1M",
        }),
      ],
    };
    const adapter = createSubscriptionAdapter(bridge);
    const updatesA: boolean[] = [];
    const updatesB: boolean[] = [];
    await adapter.connect(PUBLIC_KEY, USER_A, (snapshot) =>
      updatesA.push(snapshot.hasProEntitlement),
    );
    await adapter.loadPlans(USER_A);
    const staleListener = [...bridge.listeners][0]!;
    bridge.purchaseDeferred = deferred<RawCustomerInfo>();

    const purchaseA = adapter.purchase(USER_A, "monthly");
    await Promise.resolve();
    const disconnectA = adapter.disconnect(USER_A);
    const connectB = adapter.connect(PUBLIC_KEY, USER_B, (snapshot) =>
      updatesB.push(snapshot.hasProEntitlement),
    );
    bridge.purchaseDeferred.resolve(customer(true));

    await expect(purchaseA).rejects.toMatchObject({
      code: "principal_changed",
    });
    await disconnectA;
    await connectB;
    staleListener(customer(true));
    expect(updatesA).toEqual([]);

    const listenerB = [...bridge.listeners][0]!;
    listenerB(customer(true));
    expect(updatesB).toEqual([true]);
    expect(bridge.appUserId).toBe(USER_B);
  });

  it("treats Apple purchase cancellation as a neutral result", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: "cut.monthly",
          title: "Monthly",
          priceString: "$9.99",
          period: "P1M",
        }),
      ],
    };
    bridge.purchaseError = { code: "cancelled", privateMessage: "do not show" };
    const adapter = createSubscriptionAdapter(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});
    await adapter.loadPlans(USER_A);

    await expect(adapter.purchase(USER_A, "monthly")).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("rejects packages that were not in the active remote offering", async () => {
    const bridge = new FakeBridge();
    const adapter = createSubscriptionAdapter(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.purchase(USER_A, "invented_annual")).rejects.toEqual(
      new SubscriptionAdapterError("plan_unavailable"),
    );
    expect(bridge.calls.some((call) => call.name === "purchase")).toBe(false);
  });

  it("keeps restore available when the offerings catalog fails", async () => {
    const bridge = new FakeBridge();
    bridge.currentCustomer = customer(true);
    bridge.offeringError = new Error("catalog unavailable");
    const adapter = createSubscriptionAdapter(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toMatchObject({
      code: "unavailable",
    });
    await expect(adapter.restore(USER_A)).resolves.toEqual({
      hasProEntitlement: true,
      managementUrl: null,
    });
    expect(bridge.calls.some((call) => call.name === "restore")).toBe(true);
    expect(bridge.calls.some((call) => call.name === "logOut")).toBe(false);
  });

  it("disconnect removes local listeners without calling RevenueCat logout", async () => {
    const bridge = new FakeBridge();
    const adapter = createSubscriptionAdapter(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await adapter.disconnect(USER_A);

    expect(bridge.listeners.size).toBe(0);
    expect(bridge.calls.some((call) => call.name === "logOut")).toBe(false);
  });
});
