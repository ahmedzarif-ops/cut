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
    id: "prodProduction1234",
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

function configuredFetch(
  input: {
    entitlement?: unknown;
    app?: unknown;
    products?: unknown;
  } = {},
) {
  return vi
    .fn()
    .mockResolvedValueOnce(response(input.entitlement ?? entitlementPayload()))
    .mockResolvedValueOnce(response(input.app ?? appPayload()))
    .mockResolvedValueOnce(response(input.products ?? productsPayload()));
}

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    REVENUECAT_SECRET_API_KEY: API_KEY,
    REVENUECAT_PROJECT_ID: PROJECT_ID,
    REVENUECAT_ENTITLEMENT_REST_ID: ENTITLEMENT_REST_ID,
    REVENUECAT_APP_REST_ID: APP_REST_ID,
  };
}

function verificationOptions(fetchImpl: typeof globalThis.fetch) {
  return {
    apiKey: API_KEY,
    projectId: PROJECT_ID,
    entitlementRestId: ENTITLEMENT_REST_ID,
    appRestId: APP_REST_ID,
    fetchImpl,
  };
}

describe("RevenueCat production configuration preflight", () => {
  it("verifies the documented app, entitlement, and sole monthly no-trial product", async () => {
    const fetchImpl = configuredFetch();

    await expect(
      verifyRevenueCatConfiguration(verificationOptions(fetchImpl)),
    ).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toEqual([
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_REST_ID}`,
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/apps/${APP_REST_ID}`,
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/entitlements/${ENTITLEMENT_REST_ID}/products?limit=100`,
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
