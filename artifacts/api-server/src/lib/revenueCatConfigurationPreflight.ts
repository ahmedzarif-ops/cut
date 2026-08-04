import { REVENUECAT_ENTITLEMENT_ID } from "../services/revenueCatSubscriptionService";

export const CUT_OS_IOS_BUNDLE_ID = "com.zarifahmed.cut" as const;
export const CUT_OS_MONTHLY_PRODUCT_IDENTIFIER =
  "com.zarifahmed.cut.pro.monthly" as const;

export type RevenueCatConfigurationPreflightFailureReason =
  | "invalid_configuration"
  | "timeout"
  | "network_error"
  | "auth_error"
  | "not_found"
  | "rate_limited"
  | "provider_unavailable"
  | "provider_error"
  | "invalid_response"
  | "configuration_mismatch";

export type RevenueCatTransientPreflightFailureReason =
  "timeout" | "network_error" | "rate_limited" | "provider_unavailable";

export type RevenueCatProductionConfigurationCheck =
  | { status: "skipped" }
  | { status: "verified" }
  | {
      status: "degraded";
      reason: RevenueCatTransientPreflightFailureReason;
    };

/** Contains only an allowlisted reason and never provider/configuration data. */
export class RevenueCatConfigurationPreflightError extends Error {
  constructor(readonly reason: RevenueCatConfigurationPreflightFailureReason) {
    super("RevenueCat production configuration could not be verified");
    this.name = "RevenueCatConfigurationPreflightError";
  }
}

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface RevenueCatConfigurationPreflightOptions {
  apiKey: string | undefined;
  projectId: string | undefined;
  entitlementRestId: string | undefined;
  appRestId: string | undefined;
  expectedEntitlementLookupKey?: string;
  expectedBundleId?: string;
  expectedProductIdentifier?: string;
  fetchImpl?: FetchImplementation;
  timeoutMs?: number;
  baseUrl?: string;
}

const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_BASE_URL = "https://api.revenuecat.com/v2";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validSecretApiKey(value: string): boolean {
  return /^sk_[A-Za-z0-9_-]{8,}$/u.test(value) && value.length <= 255;
}

function validResourceId(
  value: string,
  prefix: "proj" | "entl" | "app",
): boolean {
  return (
    value.startsWith(prefix) &&
    value.length > prefix.length + 7 &&
    value.length <= 255 &&
    !/[\s/?#]/u.test(value)
  );
}

function cleanConfigurationValue(value: string | undefined): string {
  if (!value || value.trim() !== value) {
    throw new RevenueCatConfigurationPreflightError("invalid_configuration");
  }
  return value;
}

function providerFailureForStatus(
  status: number,
): RevenueCatConfigurationPreflightFailureReason {
  if (status === 401 || status === 403) return "auth_error";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 423 || status === 425 || status >= 500) {
    return "provider_unavailable";
  }
  return "provider_error";
}

function isTransientFailureReason(
  reason: RevenueCatConfigurationPreflightFailureReason,
): reason is RevenueCatTransientPreflightFailureReason {
  return [
    "timeout",
    "network_error",
    "rate_limited",
    "provider_unavailable",
  ].includes(reason);
}

async function getProviderJson({
  url,
  apiKey,
  fetchImpl,
  timeoutMs,
}: {
  url: string;
  apiKey: string;
  fetchImpl: FetchImplementation;
  timeoutMs: number;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  (timeout as { unref?: () => void }).unref?.();
  let receivedHeaders = false;

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });
    receivedHeaders = true;
    if (response.status !== 200) {
      throw new RevenueCatConfigurationPreflightError(
        providerFailureForStatus(response.status),
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof RevenueCatConfigurationPreflightError) throw error;
    if (controller.signal.aborted) {
      throw new RevenueCatConfigurationPreflightError("timeout");
    }
    throw new RevenueCatConfigurationPreflightError(
      receivedHeaders ? "invalid_response" : "network_error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function verifyEntitlementPayload(
  payload: unknown,
  expected: {
    projectId: string;
    entitlementRestId: string;
    lookupKey: string;
  },
): void {
  if (
    !isRecord(payload) ||
    typeof payload.object !== "string" ||
    typeof payload.state !== "string" ||
    typeof payload.project_id !== "string" ||
    typeof payload.id !== "string" ||
    typeof payload.lookup_key !== "string"
  ) {
    throw new RevenueCatConfigurationPreflightError("invalid_response");
  }
  if (
    payload.object !== "entitlement" ||
    payload.state !== "active" ||
    payload.project_id !== expected.projectId ||
    payload.id !== expected.entitlementRestId ||
    payload.lookup_key !== expected.lookupKey
  ) {
    throw new RevenueCatConfigurationPreflightError("configuration_mismatch");
  }
}

function verifyAppPayload(
  payload: unknown,
  expected: { projectId: string; appRestId: string; bundleId: string },
): void {
  if (
    !isRecord(payload) ||
    typeof payload.object !== "string" ||
    typeof payload.id !== "string" ||
    typeof payload.project_id !== "string" ||
    typeof payload.type !== "string" ||
    !isRecord(payload.app_store) ||
    typeof payload.app_store.bundle_id !== "string"
  ) {
    throw new RevenueCatConfigurationPreflightError("invalid_response");
  }
  if (
    payload.object !== "app" ||
    payload.id !== expected.appRestId ||
    payload.project_id !== expected.projectId ||
    payload.type !== "app_store" ||
    payload.app_store.bundle_id !== expected.bundleId
  ) {
    throw new RevenueCatConfigurationPreflightError("configuration_mismatch");
  }
}

function verifyAttachedProductsPayload(
  payload: unknown,
  expected: { appRestId: string; productIdentifier: string },
): void {
  if (
    !isRecord(payload) ||
    payload.object !== "list" ||
    !Array.isArray(payload.items) ||
    !(payload.next_page === null || typeof payload.next_page === "string") ||
    typeof payload.url !== "string"
  ) {
    throw new RevenueCatConfigurationPreflightError("invalid_response");
  }

  if (payload.items.length !== 1 || payload.next_page !== null) {
    throw new RevenueCatConfigurationPreflightError("configuration_mismatch");
  }
  const product = payload.items[0];
  if (
    !isRecord(product) ||
    typeof product.object !== "string" ||
    typeof product.id !== "string" ||
    typeof product.store_identifier !== "string" ||
    typeof product.type !== "string" ||
    typeof product.state !== "string" ||
    typeof product.app_id !== "string" ||
    !isRecord(product.subscription) ||
    !(
      product.subscription.duration === null ||
      typeof product.subscription.duration === "string"
    ) ||
    !(
      product.subscription.trial_duration === null ||
      typeof product.subscription.trial_duration === "string"
    )
  ) {
    throw new RevenueCatConfigurationPreflightError("invalid_response");
  }
  if (
    product.object !== "product" ||
    product.store_identifier !== expected.productIdentifier ||
    product.type !== "subscription" ||
    product.state !== "active" ||
    product.app_id !== expected.appRestId ||
    product.subscription.duration !== "P1M" ||
    product.subscription.trial_duration !== null
  ) {
    throw new RevenueCatConfigurationPreflightError("configuration_mismatch");
  }
}

/**
 * Performs three read-only RevenueCat v2 requests. No customer is created and
 * no entitlement is granted; a verified result requires the exact app
 * identity, entitlement, and sole active monthly/no-trial product
 * association for this binary. RevenueCat's documented read response does not
 * expose Apple credential-configuration state; release evidence verifies that
 * separately in the dashboard and on the exact build.
 */
export async function verifyRevenueCatConfiguration({
  apiKey: rawApiKey,
  projectId: rawProjectId,
  entitlementRestId: rawEntitlementRestId,
  appRestId: rawAppRestId,
  expectedEntitlementLookupKey = REVENUECAT_ENTITLEMENT_ID,
  expectedBundleId = CUT_OS_IOS_BUNDLE_ID,
  expectedProductIdentifier = CUT_OS_MONTHLY_PRODUCT_IDENTIFIER,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  baseUrl = DEFAULT_BASE_URL,
}: RevenueCatConfigurationPreflightOptions): Promise<void> {
  const apiKey = cleanConfigurationValue(rawApiKey);
  const projectId = cleanConfigurationValue(rawProjectId);
  const entitlementRestId = cleanConfigurationValue(rawEntitlementRestId);
  const appRestId = cleanConfigurationValue(rawAppRestId);
  if (
    !validSecretApiKey(apiKey) ||
    !validResourceId(projectId, "proj") ||
    !validResourceId(entitlementRestId, "entl") ||
    !validResourceId(appRestId, "app") ||
    expectedEntitlementLookupKey !== REVENUECAT_ENTITLEMENT_ID ||
    expectedBundleId !== CUT_OS_IOS_BUNDLE_ID ||
    expectedProductIdentifier !== CUT_OS_MONTHLY_PRODUCT_IDENTIFIER
  ) {
    throw new RevenueCatConfigurationPreflightError("invalid_configuration");
  }

  const root = baseUrl.replace(/\/$/u, "");
  const [entitlement, app, products] = await Promise.all([
    getProviderJson({
      url: `${root}/projects/${encodeURIComponent(projectId)}/entitlements/${encodeURIComponent(entitlementRestId)}`,
      apiKey,
      fetchImpl,
      timeoutMs,
    }),
    getProviderJson({
      url: `${root}/projects/${encodeURIComponent(projectId)}/apps/${encodeURIComponent(appRestId)}`,
      apiKey,
      fetchImpl,
      timeoutMs,
    }),
    getProviderJson({
      url: `${root}/projects/${encodeURIComponent(projectId)}/entitlements/${encodeURIComponent(entitlementRestId)}/products?limit=100`,
      apiKey,
      fetchImpl,
      timeoutMs,
    }),
  ]);

  verifyEntitlementPayload(entitlement, {
    projectId,
    entitlementRestId,
    lookupKey: expectedEntitlementLookupKey,
  });
  verifyAppPayload(app, { projectId, appRestId, bundleId: expectedBundleId });
  verifyAttachedProductsPayload(products, {
    appRestId,
    productIdentifier: expectedProductIdentifier,
  });
}

/**
 * Development and tests stay network-independent. Production fails closed on
 * semantic/auth/configuration errors, while a sanitized transient result lets
 * unrelated account APIs start in a degraded provider state.
 */
export async function assertRevenueCatProductionConfiguration(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: Pick<
    RevenueCatConfigurationPreflightOptions,
    "fetchImpl" | "timeoutMs" | "baseUrl"
  > = {},
): Promise<RevenueCatProductionConfigurationCheck> {
  if (env.NODE_ENV !== "production") return { status: "skipped" };
  try {
    await verifyRevenueCatConfiguration({
      apiKey: env.REVENUECAT_SECRET_API_KEY,
      projectId: env.REVENUECAT_PROJECT_ID,
      entitlementRestId: env.REVENUECAT_ENTITLEMENT_REST_ID,
      appRestId: env.REVENUECAT_APP_REST_ID,
      ...dependencies,
    });
    return { status: "verified" };
  } catch (error) {
    if (
      error instanceof RevenueCatConfigurationPreflightError &&
      isTransientFailureReason(error.reason)
    ) {
      return { status: "degraded", reason: error.reason };
    }
    throw error;
  }
}
