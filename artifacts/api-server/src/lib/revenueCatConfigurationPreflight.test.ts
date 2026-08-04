import { describe, expect, it, vi } from "vitest";

import {
  assertRevenueCatProductionConfiguration,
  CUT_OS_IOS_BUNDLE_ID,
  CUT_OS_MONTHLY_PRODUCT_IDENTIFIER,
  verifyRevenueCatConfiguration,
} from "./revenueCatConfigurationPreflight";
import { REVENUECAT_ENTITLEMENT_ID } from "../services/revenueCatSubscriptionService";

const API_KEY = "sk_production_key_1234";
const PROJECT_ID = "projProduction1234";
const ENTITLEMENT_REST_ID = "entlProduction1234";
const APP_REST_ID = "appProduction1234";
const OFFERING_REST_ID = "ofrngProduction1234";
const PRODUCT_REST_ID = "prodProduction1234";
const CUSTOMER_REST_ID = "cut-internal-user-uuid";

function response(payload: unknown, status = 200): Response {
  return { status, json: async () => payload } as Response;
}

function entitlementPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    object: "entitlement",
    state: "active",
    project_id: PROJECT_ID,
    id: ENTITLEMENT_REST_ID,
    lookup_key: REVENUECAT_ENTITLEMENT_ID,
    ...overrides,
  };
}

function appPayload(
  overrides: Record<string, unknown> = {},
  appStoreOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    object: "app",
    id: APP_REST_ID,
    project_id: PROJECT_ID,
    type: "app_store",
    ...overrides,
    app_store: {
      bundle_id: CUT_OS_IOS_BUNDLE_ID,
      ...appStoreOverrides,
    },
  };
}

function productPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    object: "product",
    id: PRODUCT_REST_ID,
    store_identifier: CUT_OS_MONTHLY_PRODUCT_IDENTIFIER,
    type: "subscription",
    state: "active",
    app_id: APP_REST_ID,
    subscription: {
      duration: "P1M",
      grace_period_duration: null,
      trial_duration: null,
    },
    ...overrides,
  };
}

function packageProductAssociation(
  product: unknown = productPayload(),
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    product,
    eligibility_criteria: "all",
    ...overrides,
  };
}

function offeringPackage({
  overrides = {},
  productAssociations = [packageProductAssociation()],
  productsOverrides = {},
}: {
  overrides?: Record<string, unknown>;
  productAssociations?: unknown[];
  productsOverrides?: Record<string, unknown>;
} = {}): Record<string, unknown> {
  return {
    object: "package",
    id: "pkgeProduction1234",
    lookup_key: "$rc_monthly",
    display_name: "CUT OS Pro monthly",
    position: 1,
    ...overrides,
    products: {
      object: "list",
      items: productAssociations,
      next_page: null,
      url: `/v2/projects/${PROJECT_ID}/offerings/${OFFERING_REST_ID}/packages/pkgeProduction1234/products`,
      ...productsOverrides,
    },
  };
}

function offeringPayload({
  overrides = {},
  packages = [offeringPackage()],
  packagesOverrides = {},
}: {
  overrides?: Record<string, unknown>;
  packages?: unknown[];
  packagesOverrides?: Record<string, unknown>;
} = {}): Record<string, unknown> {
  return {
    object: "offering",
    state: "active",
    id: OFFERING_REST_ID,
    lookup_key: "default",
    display_name: "CUT OS production",
    is_current: true,
    project_id: PROJECT_ID,
    ...overrides,
    packages: {
      object: "list",
      items: packages,
      next_page: null,
      url: `/v2/projects/${PROJECT_ID}/offerings/${OFFERING_REST_ID}/packages`,
      ...packagesOverrides,
    },
  };
}

function productsPayload(
  items: unknown[] = [productPayload()],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    object: "list",
    items,
    next_page: null,
    url: `/v2/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_REST_ID}/products`,
    ...overrides,
  };
}

function customersPayload(
  items: unknown[] = [
    {
      object: "customer",
      id: CUSTOMER_REST_ID,
      project_id: PROJECT_ID,
    },
  ],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    object: "list",
    items,
    next_page: null,
    url: `/v2/projects/${PROJECT_ID}/customers`,
    ...overrides,
  };
}

function configuredFetch(
  input: {
    entitlement?: unknown;
    app?: unknown;
    products?: unknown;
    offering?: unknown;
    offeringStatus?: number;
    customers?: unknown;
    customerStatus?: number;
  } = {},
) {
  return vi
    .fn()
    .mockResolvedValueOnce(response(input.entitlement ?? entitlementPayload()))
    .mockResolvedValueOnce(response(input.app ?? appPayload()))
    .mockResolvedValueOnce(response(input.products ?? productsPayload()))
    .mockResolvedValueOnce(
      response(input.offering ?? offeringPayload(), input.offeringStatus),
    )
    .mockResolvedValueOnce(
      response(input.customers ?? customersPayload(), input.customerStatus),
    );
}

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    REVENUECAT_SECRET_API_KEY: API_KEY,
    REVENUECAT_PROJECT_ID: PROJECT_ID,
    REVENUECAT_ENTITLEMENT_REST_ID: ENTITLEMENT_REST_ID,
    REVENUECAT_APP_REST_ID: APP_REST_ID,
    REVENUECAT_OFFERING_REST_ID: OFFERING_REST_ID,
  };
}

function verificationOptions(fetchImpl: typeof globalThis.fetch) {
  return {
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    entitlementRestId: ENTITLEMENT_REST_ID,
    appRestId: APP_REST_ID,
    offeringRestId: OFFERING_REST_ID,
    fetchImpl,
  };
}

describe("RevenueCat production configuration preflight", () => {
  it("verifies the documented subscription mapping and bounded customer-read permission", async () => {
    const fetchImpl = configuredFetch();

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_REST_ID}`,
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/apps/${APP_REST_ID}`,
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_REST_ID}/products?limit=100`,
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/offerings/${OFFERING_REST_ID}?expand=package.product`,
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/customers?limit=1`,
    ]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init).toMatchObject({
        method: "GET",
        headers: { Accept: "application/json" },
      });
      expect((init as RequestInit).headers).toHaveProperty(
        "Authorization",
        `Bearer ${API_KEY}`,
      );
    }
  });

  it("accepts the official documented App Store app response shape without credential flags", async () => {
    const documentedAppResponse = {
      object: "app",
      id: APP_REST_ID,
      name: "CUT OS",
      created_at: 1_658_399_423_658,
      type: "app_store",
      project_id: PROJECT_ID,
      custom_url_scheme: "rc-cut-os",
      app_store: { bundle_id: CUT_OS_IOS_BUNDLE_ID },
    };
    const fetchImpl = configuredFetch({ app: documentedAppResponse });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["wrong project", entitlementPayload({ project_id: "projOther123456" })],
    [
      "wrong entitlement resource",
      entitlementPayload({ id: "entlOther123456" }),
    ],
    ["wrong lookup key", entitlementPayload({ lookup_key: "OTHER_PRO" })],
    ["inactive entitlement", entitlementPayload({ state: "inactive" })],
  ])("fails closed on %s", async (_label, badEntitlement) => {
    const fetchImpl = configuredFetch({ entitlement: badEntitlement });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).rejects.toMatchObject({
      name: "RevenueCatConfigurationPreflightError",
      reason: "configuration_mismatch",
    });
  });

  it.each([
    ["wrong app resource", appPayload({ id: "appOther123456" })],
    ["wrong app project", appPayload({ project_id: "projOther123456" })],
    ["wrong platform", appPayload({ type: "play_store" })],
    ["wrong bundle", appPayload({}, { bundle_id: "com.example.other" })],
  ])("fails closed on %s", async (_label, badApp) => {
    const fetchImpl = configuredFetch({ app: badApp });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).rejects.toMatchObject({ reason: "configuration_mismatch" });
  });

  it.each([
    [
      "wrong store product",
      productsPayload([
        productPayload({ store_identifier: "com.example.other" }),
      ]),
    ],
    [
      "wrong app",
      productsPayload([productPayload({ app_id: "appOther123456" })]),
    ],
    [
      "inactive product",
      productsPayload([productPayload({ state: "inactive" })]),
    ],
    [
      "non-subscription product",
      productsPayload([productPayload({ type: "non_consumable" })]),
    ],
    [
      "non-monthly subscription",
      productsPayload([
        productPayload({
          subscription: {
            duration: "P1Y",
            grace_period_duration: null,
            trial_duration: null,
          },
        }),
      ]),
    ],
    [
      "subscription with a trial",
      productsPayload([
        productPayload({
          subscription: {
            duration: "P1M",
            grace_period_duration: null,
            trial_duration: "P1W",
          },
        }),
      ]),
    ],
    [
      "additional attached product",
      productsPayload([
        productPayload(),
        productPayload({
          id: "prodOther123456",
          store_identifier: "com.zarifahmed.cut.pro.annual",
        }),
      ]),
    ],
    [
      "uninspected next page",
      productsPayload([productPayload()], {
        next_page: "/v2/projects/next-page",
      }),
    ],
  ])("fails closed on %s", async (_label, badProducts) => {
    const fetchImpl = configuredFetch({ products: badProducts });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).rejects.toMatchObject({ reason: "configuration_mismatch" });
  });

  it.each([
    [
      "wrong offering resource",
      offeringPayload({ overrides: { id: "ofrngOther123456" } }),
    ],
    [
      "wrong offering project",
      offeringPayload({ overrides: { project_id: "projOther123456" } }),
    ],
    [
      "inactive offering",
      offeringPayload({ overrides: { state: "inactive" } }),
    ],
    [
      "non-current offering",
      offeringPayload({ overrides: { is_current: false } }),
    ],
    ["missing package", offeringPayload({ packages: [] })],
    [
      "additional package",
      offeringPayload({
        packages: [
          offeringPackage(),
          offeringPackage({ overrides: { id: "pkgeOther123456" } }),
        ],
      }),
    ],
    [
      "uninspected package page",
      offeringPayload({
        packagesOverrides: { next_page: "/v2/projects/next-packages" },
      }),
    ],
    [
      "package without a product",
      offeringPayload({
        packages: [offeringPackage({ productAssociations: [] })],
      }),
    ],
    [
      "package with an additional product",
      offeringPayload({
        packages: [
          offeringPackage({
            productAssociations: [
              packageProductAssociation(),
              packageProductAssociation(
                productPayload({
                  id: "prodOther123456",
                  store_identifier: "com.zarifahmed.cut.pro.annual",
                }),
              ),
            ],
          }),
        ],
      }),
    ],
    [
      "uninspected package-product page",
      offeringPayload({
        packages: [
          offeringPackage({
            productsOverrides: {
              next_page: "/v2/projects/next-package-products",
            },
          }),
        ],
      }),
    ],
    [
      "different RevenueCat product resource",
      offeringPayload({
        packages: [
          offeringPackage({
            productAssociations: [
              packageProductAssociation(
                productPayload({ id: "prodOther123456" }),
              ),
            ],
          }),
        ],
      }),
    ],
    [
      "inactive package product",
      offeringPayload({
        packages: [
          offeringPackage({
            productAssociations: [
              packageProductAssociation(productPayload({ state: "inactive" })),
            ],
          }),
        ],
      }),
    ],
    [
      "package product with a trial",
      offeringPayload({
        packages: [
          offeringPackage({
            productAssociations: [
              packageProductAssociation(
                productPayload({
                  subscription: {
                    duration: "P1M",
                    grace_period_duration: null,
                    trial_duration: "P1W",
                  },
                }),
              ),
            ],
          }),
        ],
      }),
    ],
    [
      "store-specific eligibility split for the iOS product",
      offeringPayload({
        packages: [
          offeringPackage({
            productAssociations: [
              packageProductAssociation(productPayload(), {
                eligibility_criteria: "google_sdk_ge_6",
              }),
            ],
          }),
        ],
      }),
    ],
  ])("fails closed on an offering with %s", async (_label, badOffering) => {
    const fetchImpl = configuredFetch({ offering: badOffering });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).rejects.toMatchObject({ reason: "configuration_mismatch" });
  });

  it("accepts official list responses that omit a null next-page cursor", async () => {
    const attachedProducts = productsPayload();
    delete attachedProducts.next_page;
    const offering = offeringPayload();
    const packages = offering.packages as Record<string, unknown>;
    delete packages.next_page;
    const packagePayload = (packages.items as Record<string, unknown>[])[0];
    const packageProducts = packagePayload.products as Record<string, unknown>;
    delete packageProducts.next_page;
    const fetchImpl = configuredFetch({
      products: attachedProducts,
      offering,
    });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).resolves.toBeUndefined();
  });

  it("does not follow a customer-list cursor after the bounded permission read", async () => {
    const fetchImpl = configuredFetch({
      customers: customersPayload(undefined, {
        next_page: `/v2/projects/${PROJECT_ID}/customers?starting_after=${CUSTOMER_REST_ID}`,
      }),
    });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("accepts an empty customer list as proof of project-scoped read access", async () => {
    const fetchImpl = configuredFetch({ customers: customersPayload([]) });

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).resolves.toBeUndefined();
  });

  it("rejects an unexpanded offering response with a sanitized reason", async () => {
    const fetchImpl = configuredFetch({
      offering: {
        ...offeringPayload(),
        packages: "unexpanded provider detail",
      },
    });

    const error = await verifyRevenueCatConfiguration(
      verificationOptions(fetchImpl),
    ).catch((failure: unknown) => failure);

    expect(error).toMatchObject({ reason: "invalid_response" });
    expect(JSON.stringify(error)).not.toContain("provider detail");
  });

  it("rejects malformed provider bodies with a sanitized reason", async () => {
    const fetchImpl = configuredFetch({
      entitlement: { raw: "provider secret" },
    });

    const error = await verifyRevenueCatConfiguration(
      verificationOptions(fetchImpl),
    ).catch((failure: unknown) => failure);

    expect(error).toMatchObject({ reason: "invalid_response" });
    expect(JSON.stringify(error)).not.toContain("provider secret");
  });

  it("keeps a customer-read authorization failure fatal without probing deletion", async () => {
    const fetchImpl = configuredFetch({ customerStatus: 403 });

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
      }),
    ).rejects.toMatchObject({ reason: "auth_error" });

    expect(fetchImpl).toHaveBeenCalledTimes(5);
    for (const [, init] of fetchImpl.mock.calls) {
      expect((init as RequestInit).method).toBe("GET");
    }
  });

  it("rejects a malformed customer-list response with a sanitized reason", async () => {
    const fetchImpl = configuredFetch({
      customers: {
        object: "list",
        items: "provider customer secret",
        next_page: null,
        url: `/v2/projects/${PROJECT_ID}/customers`,
      },
    });

    const error = await verifyRevenueCatConfiguration(
      verificationOptions(fetchImpl),
    ).catch((failure: unknown) => failure);

    expect(error).toMatchObject({ reason: "invalid_response" });
    expect(JSON.stringify(error)).not.toContain("provider customer secret");
  });

  it.each([
    [400, "provider_error"],
    [401, "auth_error"],
    [403, "auth_error"],
    [404, "not_found"],
  ])("keeps fatal HTTP %i classified as %s", async (status, reason) => {
    const fetchImpl = vi.fn().mockResolvedValue(response({}, status));

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
      }),
    ).rejects.toMatchObject({ reason });
  });

  it("keeps an offering-read authorization failure fatal", async () => {
    const fetchImpl = configuredFetch({ offeringStatus: 403 });

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
      }),
    ).rejects.toMatchObject({ reason: "auth_error" });
  });

  it.each([
    [429, "rate_limited"],
    [500, "provider_unavailable"],
    [503, "provider_unavailable"],
  ])(
    "allows account APIs to start degraded after transient HTTP %i",
    async (status, reason) => {
      const fetchImpl = vi.fn().mockResolvedValue(response({}, status));

      await expect(
        assertRevenueCatProductionConfiguration(configuredEnvironment(), {
          fetchImpl,
        }),
      ).resolves.toEqual({ status: "degraded", reason });
    },
  );

  it("allows startup degraded when only the offering read is transiently unavailable", async () => {
    const fetchImpl = configuredFetch({ offeringStatus: 503 });

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
      }),
    ).resolves.toEqual({
      status: "degraded",
      reason: "provider_unavailable",
    });
  });

  it("allows startup degraded after a sanitized network failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new Error("secret network provider detail"));

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
      }),
    ).resolves.toEqual({ status: "degraded", reason: "network_error" });
  });

  it("allows startup degraded after a bounded provider timeout", async () => {
    const fetchImpl = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("secret stalled provider detail")),
          );
        }),
    );

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
        timeoutMs: 5,
      }),
    ).resolves.toEqual({ status: "degraded", reason: "timeout" });
  });

  it("keeps a semantic mismatch fatal at the startup boundary", async () => {
    const fetchImpl = configuredFetch({
      products: productsPayload([
        productPayload({ store_identifier: "com.example.other" }),
      ]),
    });

    await expect(
      assertRevenueCatProductionConfiguration(configuredEnvironment(), {
        fetchImpl,
      }),
    ).rejects.toMatchObject({ reason: "configuration_mismatch" });
  });

  it.each([
    undefined,
    "",
    " ofrngProduction1234",
    "ofrngProduction1234 ",
    "offeringProduction1234",
    "ofrng/bad-value",
    "ofrng_________",
  ])(
    "fails closed before network access for an invalid offering resource ID: %s",
    async (offeringRestId) => {
      const environment = configuredEnvironment();
      environment.REVENUECAT_OFFERING_REST_ID = offeringRestId;
      const fetchImpl = vi.fn();

      await expect(
        assertRevenueCatProductionConfiguration(environment, { fetchImpl }),
      ).rejects.toMatchObject({ reason: "invalid_configuration" });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("never contacts RevenueCat outside production", async () => {
    const fetchImpl = vi.fn();
    await expect(
      assertRevenueCatProductionConfiguration(
        { NODE_ENV: "test" },
        { fetchImpl },
      ),
    ).resolves.toEqual({ status: "skipped" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
