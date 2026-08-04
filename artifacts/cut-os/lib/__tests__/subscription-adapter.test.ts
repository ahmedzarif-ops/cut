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
const PRODUCT_ID = "com.zarifahmed.cut.pro.monthly";
const OFFERING_ID = "default";

type StoreDisplayOverride = Partial<{
  title: string;
  description: string;
  priceString: string;
}>;

const INVALID_STORE_DISPLAY_CASES: Array<
  [label: string, override: StoreDisplayOverride]
> = [
  ["empty title", { title: "" }],
  ["whitespace-only title", { title: " \u00a0 " }],
  ["title with surrounding whitespace", { title: " Monthly" }],
  ["title with a control character", { title: "Monthly\nPlan" }],
  ["absurdly long title", { title: "界".repeat(257) }],
  ["empty description", { description: "" }],
  ["whitespace-only description", { description: "\u00a0" }],
  [
    "description with surrounding whitespace",
    { description: "Monthly access " },
  ],
  [
    "description with a control character",
    { description: "Monthly\u0000access" },
  ],
  ["absurdly long description", { description: "界".repeat(4_097) }],
  ["empty localized price", { priceString: "" }],
  ["whitespace-only localized price", { priceString: " \u00a0" }],
  ["localized price with surrounding whitespace", { priceString: " $4.99" }],
  ["localized price with a control character", { priceString: "$4.99\t" }],
  ["absurdly long localized price", { priceString: `$${"4".repeat(128)}` }],
  ["localized price without a Unicode digit", { priceString: "€four" }],
];

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
  description?: string;
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
      description: input.description ?? `${input.title} description`,
      priceString: input.priceString,
      subscriptionPeriod: input.period,
      introPrice: input.intro ?? null,
    },
    nativePackage: { packageIdentifier: input.packageIdentifier },
  };
}

function adapterFor(bridge: RevenueCatBridge) {
  return createSubscriptionAdapter(bridge, PRODUCT_ID);
}

describe("RevenueCat subscription adapter", () => {
  it("configures with only the internal UUID and exposes the bound production product", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "€4,99",
          period: "P1M",
        }),
      ],
    };
    const adapter = adapterFor(bridge);

    const connection = await adapter.connect(PUBLIC_KEY, USER_A, () => {});
    const plans = await adapter.loadPlans(USER_A);

    expect(bridge.calls[0]).toEqual({
      name: "configure",
      values: [PUBLIC_KEY, USER_A],
    });
    expect(JSON.stringify(bridge.calls)).not.toContain("email");
    expect(connection.customer.hasProEntitlement).toBe(false);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      packageIdentifier: "monthly",
      productIdentifier: PRODUCT_ID,
      priceString: "€4,99",
      periodLabel: "month",
      introductoryText: null,
    });
    expect(bridge.calls.some((call) => call.name === "checkIntro")).toBe(false);
  });

  it("preserves legitimate localized Unicode offer display fields", async () => {
    const bridge = new FakeBridge();
    const localizedTitle = "CUT OS プロ月額 🏋️";
    const localizedDescription = "毎日の計量、バランスのよい食事、栄養合計。";
    const localizedPrice = "\u200f٤٫٩٩\u00a0ر.س.\u200f";
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: localizedTitle,
          description: localizedDescription,
          priceString: localizedPrice,
          period: "P1M",
        }),
      ],
    };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).resolves.toEqual([
      expect.objectContaining({
        title: localizedTitle,
        description: localizedDescription,
        priceString: localizedPrice,
      }),
    ]);
  });

  it.each(INVALID_STORE_DISPLAY_CASES)(
    "fails closed for an offer with %s",
    async (_label, override) => {
      const bridge = new FakeBridge();
      bridge.offering = {
        identifier: OFFERING_ID,
        availablePackages: [
          packageItem({
            packageIdentifier: "monthly",
            productIdentifier: PRODUCT_ID,
            title: override.title ?? "CUT OS Pro Monthly",
            description: override.description ?? "Monthly CUT OS Pro access",
            priceString: override.priceString ?? "$4.99",
            period: "P1M",
          }),
        ],
      };
      const adapter = adapterFor(bridge);
      await adapter.connect(PUBLIC_KEY, USER_A, () => {});

      await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
        new SubscriptionAdapterError("unavailable"),
      );
      await expect(adapter.purchase(USER_A, "monthly")).rejects.toEqual(
        new SubscriptionAdapterError("plan_unavailable"),
      );
      expect(bridge.calls.some((call) => call.name === "purchase")).toBe(false);
    },
  );

  it("fails closed when RevenueCat returns a different current offering", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: "other",
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$4.99",
          period: "P1M",
        }),
      ],
    };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
  });

  it("fails closed when the compiled product differs from the canonical contract", async () => {
    const differentProduct = "com.zarifahmed.cut.pro.other";
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: differentProduct,
          title: "CUT OS Pro Other",
          priceString: "$4.99",
          period: "P1M",
        }),
      ],
    };
    const adapter = createSubscriptionAdapter(bridge, differentProduct);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
  });

  it("fails closed when the offering contains a rogue product", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$4.99",
          period: "P1M",
        }),
        packageItem({
          packageIdentifier: "rogue_annual",
          productIdentifier: "com.zarifahmed.cut.pro.annual",
          title: "Rogue Annual",
          priceString: "$49.99",
          period: "P1Y",
        }),
      ],
    };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
    await expect(adapter.purchase(USER_A, "monthly")).rejects.toEqual(
      new SubscriptionAdapterError("plan_unavailable"),
    );
    expect(bridge.calls.some((call) => call.name === "purchase")).toBe(false);
  });

  it("fails closed when the production product appears in duplicate packages", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$4.99",
          period: "P1M",
        }),
        packageItem({
          packageIdentifier: "monthly_duplicate",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$4.99",
          period: "P1M",
        }),
      ],
    };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
  });

  it("fails closed when the production product has an introductory offer", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$4.99",
          period: "P1M",
          intro: {
            price: 0,
            priceString: "$0.00",
            period: "P1W",
            cycles: 1,
          },
        }),
      ],
    };
    bridge.eligibility = { [PRODUCT_ID]: false };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
    expect(bridge.calls.some((call) => call.name === "checkIntro")).toBe(false);
  });

  it("fails closed when the bound monthly product has another duration", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$49.99",
          period: "P1Y",
        }),
      ],
    };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
    await expect(adapter.purchase(USER_A, "monthly")).rejects.toEqual(
      new SubscriptionAdapterError("plan_unavailable"),
    );
    expect(bridge.calls.some((call) => call.name === "purchase")).toBe(false);
  });

  it("fails closed when no production product is compiled into the app", async () => {
    const bridge = new FakeBridge();
    bridge.offering = {
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "CUT OS Pro Monthly",
          priceString: "$4.99",
          period: "P1M",
        }),
      ],
    };
    const adapter = createSubscriptionAdapter(bridge, "");
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await expect(adapter.loadPlans(USER_A)).rejects.toEqual(
      new SubscriptionAdapterError("unavailable"),
    );
  });

  it("switches custom UUIDs directly and never creates an anonymous user", async () => {
    const bridge = new FakeBridge();
    const adapter = adapterFor(bridge);
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
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "Monthly",
          priceString: "$9.99",
          period: "P1M",
        }),
      ],
    };
    const adapter = adapterFor(bridge);
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
      identifier: OFFERING_ID,
      availablePackages: [
        packageItem({
          packageIdentifier: "monthly",
          productIdentifier: PRODUCT_ID,
          title: "Monthly",
          priceString: "$9.99",
          period: "P1M",
        }),
      ],
    };
    bridge.purchaseError = { code: "cancelled", privateMessage: "do not show" };
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});
    await adapter.loadPlans(USER_A);

    await expect(adapter.purchase(USER_A, "monthly")).resolves.toEqual({
      status: "cancelled",
    });
  });

  it("rejects packages that were not in the active remote offering", async () => {
    const bridge = new FakeBridge();
    const adapter = adapterFor(bridge);
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
    const adapter = adapterFor(bridge);
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
    const adapter = adapterFor(bridge);
    await adapter.connect(PUBLIC_KEY, USER_A, () => {});

    await adapter.disconnect(USER_A);

    expect(bridge.listeners.size).toBe(0);
    expect(bridge.calls.some((call) => call.name === "logOut")).toBe(false);
  });
});
