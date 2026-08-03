export const REVENUECAT_ENTITLEMENT_ID = "CUT_OS_PRO" as const;

export interface SubscriptionStatus {
  entitled: boolean;
  entitlementId: typeof REVENUECAT_ENTITLEMENT_ID;
  expiresAt: string | null;
  managementUrl: null;
}

export interface SubscriptionStatusProvider {
  getStatus(
    appUserId: string,
    options?: { refresh?: boolean },
  ): Promise<SubscriptionStatus>;
  invalidate?(appUserId: string): void;
}

export type SubscriptionStatusUnavailableReason =
  | "not_configured"
  | "invalid_configuration"
  | "invalid_app_user_id"
  | "timeout"
  | "network_error"
  | "provider_error"
  | "invalid_response";

/** Carries only an allowlisted reason, never provider data or configuration. */
export class SubscriptionStatusUnavailableError extends Error {
  readonly reason: SubscriptionStatusUnavailableReason;

  constructor(reason: SubscriptionStatusUnavailableReason) {
    super("Subscription status is unavailable");
    this.name = "SubscriptionStatusUnavailableError";
    this.reason = reason;
  }
}

export type RevenueCatCustomerDeletionFailureReason =
  | "invalid_app_user_id"
  | "not_configured"
  | "invalid_configuration"
  | "not_found"
  | "deletion_queued"
  | "timeout"
  | "network_error"
  | "auth_error"
  | "rate_limited"
  | "provider_unavailable"
  | "provider_error"
  | "invalid_response";

/** Trusted, sanitized classification for RevenueCat deletion failures. */
export class RevenueCatCustomerDeletionError extends Error {
  readonly reason: RevenueCatCustomerDeletionFailureReason;

  constructor(reason: RevenueCatCustomerDeletionFailureReason) {
    super("RevenueCat customer deletion failed");
    this.name = "RevenueCatCustomerDeletionError";
    this.reason = reason;
  }
}

export interface RevenueCatCustomerDeletionProvider {
  deleteCustomer(appUserId: string): Promise<void>;
  /** Poll a previously queued deletion using only the non-creating GET. */
  confirmCustomerDeleted(appUserId: string): Promise<void>;
}

type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface RevenueCatSubscriptionServiceOptions {
  apiKey?: string;
  projectId?: string;
  entitlementRestId?: string;
  fetchImpl?: FetchImplementation;
  now?: () => number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
  cacheSweepIntervalMs?: number;
  baseUrl?: string;
}

interface RevenueCatCustomerDeletionClientOptions {
  apiKey?: string;
  projectId?: string;
  fetchImpl?: FetchImplementation;
  timeoutMs?: number;
  baseUrl?: string;
}

interface CachedStatus {
  status: SubscriptionStatus;
  validUntilMs: number;
}

interface RequestEntry {
  sequence: number;
  promise: Promise<SubscriptionStatus>;
}

interface ProviderResponse {
  status: number;
  payload?: unknown;
}

type ProviderRequestFailureReason =
  "timeout" | "network_error" | "invalid_response";

class ProviderRequestFailure extends Error {
  readonly reason: ProviderRequestFailureReason;

  constructor(reason: ProviderRequestFailureReason) {
    super("RevenueCat request failed");
    this.reason = reason;
  }
}

class ProviderHttpStatusFailure extends Error {
  readonly status: number;

  constructor(status: number) {
    super("RevenueCat request returned an unexpected status");
    this.status = status;
  }
}

interface ParsedActiveEntitlementPage {
  items: Array<{ entitlementId: string; expiresAtMs: number | null }>;
  nextPageUrl: string | null;
}

const DEFAULT_TIMEOUT_MS = 4_000;
const DEFAULT_CACHE_TTL_MS = 30_000;
const DEFAULT_CACHE_MAX_ENTRIES = 1_000;
const DEFAULT_CACHE_SWEEP_INTERVAL_MS = 30_000;
const DEFAULT_BASE_URL = "https://api.revenuecat.com/v2";
const MAX_ACTIVE_ENTITLEMENT_PAGES = 20;
const MAX_DATE_MS = 8_640_000_000_000_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidRevenueCatAppUserId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSecretApiKey(value: string): boolean {
  return value.startsWith("sk_") && value.length > 3 && !/\s/.test(value);
}

function isValidResourceId(value: string, prefix: "proj" | "entl"): boolean {
  return (
    value.startsWith(prefix) &&
    value.length > prefix.length &&
    value.length <= 255 &&
    !/[\s/?#]/.test(value)
  );
}

function isValidEpochMilliseconds(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_DATE_MS
  );
}

async function performProviderRequest(input: {
  fetchImpl: FetchImplementation;
  url: string;
  method: "GET" | "DELETE";
  apiKey: string;
  timeoutMs: number;
  parseJsonStatuses: ReadonlySet<number>;
}): Promise<ProviderResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(1, input.timeoutMs),
  );
  (timeout as { unref?: () => void }).unref?.();
  let receivedHeaders = false;

  try {
    const response = await input.fetchImpl(input.url, {
      method: input.method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      signal: controller.signal,
    });
    receivedHeaders = true;
    if (!input.parseJsonStatuses.has(response.status)) {
      return { status: response.status };
    }
    const payload = await response.json();
    return { status: response.status, payload };
  } catch (error) {
    if (error instanceof ProviderRequestFailure) throw error;
    if (controller.signal.aborted) {
      throw new ProviderRequestFailure("timeout");
    }
    throw new ProviderRequestFailure(
      receivedHeaders ? "invalid_response" : "network_error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function parseListEnvelope(payload: unknown): {
  items: unknown[];
  nextPage: string | null;
  url: string;
} {
  if (
    !isRecord(payload) ||
    payload.object !== "list" ||
    !Array.isArray(payload.items) ||
    !("next_page" in payload) ||
    (payload.next_page !== null && typeof payload.next_page !== "string") ||
    typeof payload.url !== "string"
  ) {
    throw new ProviderRequestFailure("invalid_response");
  }
  return {
    items: payload.items,
    nextPage: payload.next_page,
    url: payload.url,
  };
}

function normalizeProviderPageUrl(input: {
  value: string;
  baseUrl: string;
  expectedPath: string;
  requireCursor: boolean;
}): string {
  let parsed: URL;
  let base: URL;
  try {
    base = new URL(input.baseUrl);
    parsed = new URL(input.value, `${base.origin}/`);
  } catch {
    throw new ProviderRequestFailure("invalid_response");
  }
  const queryKeys = [...parsed.searchParams.keys()];
  if (
    parsed.origin !== base.origin ||
    parsed.pathname !== input.expectedPath ||
    parsed.hash.length > 0 ||
    queryKeys.some((key) => key !== "starting_after" && key !== "limit") ||
    (input.requireCursor && !parsed.searchParams.get("starting_after"))
  ) {
    throw new ProviderRequestFailure("invalid_response");
  }
  return parsed.toString();
}

function parseActiveEntitlementPage(input: {
  payload: unknown;
  baseUrl: string;
  expectedPath: string;
}): ParsedActiveEntitlementPage {
  const envelope = parseListEnvelope(input.payload);
  normalizeProviderPageUrl({
    value: envelope.url,
    baseUrl: input.baseUrl,
    expectedPath: input.expectedPath,
    requireCursor: false,
  });

  const items = envelope.items.map((item) => {
    if (
      !isRecord(item) ||
      item.object !== "customer.active_entitlement" ||
      typeof item.entitlement_id !== "string" ||
      (item.expires_at !== null && !isValidEpochMilliseconds(item.expires_at))
    ) {
      throw new ProviderRequestFailure("invalid_response");
    }
    return {
      entitlementId: item.entitlement_id,
      expiresAtMs: item.expires_at,
    };
  });

  return {
    items,
    nextPageUrl:
      envelope.nextPage === null
        ? null
        : normalizeProviderPageUrl({
            value: envelope.nextPage,
            baseUrl: input.baseUrl,
            expectedPath: input.expectedPath,
            requireCursor: true,
          }),
  };
}

function inactiveStatus(): SubscriptionStatus {
  return {
    entitled: false,
    entitlementId: REVENUECAT_ENTITLEMENT_ID,
    expiresAt: null,
    managementUrl: null,
  };
}

function mapStatusRequestFailure(error: unknown): never {
  if (error instanceof ProviderRequestFailure) {
    throw new SubscriptionStatusUnavailableError(error.reason);
  }
  if (error instanceof SubscriptionStatusUnavailableError) throw error;
  throw new SubscriptionStatusUnavailableError("provider_error");
}

function mapDeletionRequestFailure(error: unknown): never {
  if (error instanceof ProviderRequestFailure) {
    throw new RevenueCatCustomerDeletionError(error.reason);
  }
  if (error instanceof ProviderHttpStatusFailure) {
    throw deletionErrorForHttpStatus(error.status);
  }
  if (error instanceof RevenueCatCustomerDeletionError) throw error;
  throw new RevenueCatCustomerDeletionError("provider_error");
}

class RevenueCatProjectAccessValidator {
  private validated = false;
  private validationInFlight: Promise<void> | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly projectId: string,
    private readonly fetchImpl: FetchImplementation,
    private readonly timeoutMs: number,
    private readonly baseUrl: string,
  ) {}

  markValidated(): void {
    this.validated = true;
  }

  async ensureValidated(): Promise<void> {
    if (this.validated) return;
    if (this.validationInFlight) {
      await this.validationInFlight;
      return;
    }

    const validation = this.validate();
    this.validationInFlight = validation;
    try {
      await validation;
    } finally {
      if (this.validationInFlight === validation) {
        this.validationInFlight = null;
      }
    }
  }

  private async validate(): Promise<void> {
    const expectedPath = `/v2/projects/${encodeURIComponent(
      this.projectId,
    )}/customers`;
    const response = await performProviderRequest({
      fetchImpl: this.fetchImpl,
      url: `${this.baseUrl}/projects/${encodeURIComponent(
        this.projectId,
      )}/customers?limit=1`,
      method: "GET",
      apiKey: this.apiKey,
      timeoutMs: this.timeoutMs,
      parseJsonStatuses: new Set([200]),
    });
    if (response.status !== 200) {
      throw new ProviderHttpStatusFailure(response.status);
    }

    const envelope = parseListEnvelope(response.payload);
    normalizeProviderPageUrl({
      value: envelope.url,
      baseUrl: this.baseUrl,
      expectedPath,
      requireCursor: false,
    });
    if (envelope.nextPage !== null) {
      normalizeProviderPageUrl({
        value: envelope.nextPage,
        baseUrl: this.baseUrl,
        expectedPath,
        requireCursor: true,
      });
    }
    for (const item of envelope.items) {
      if (
        !isRecord(item) ||
        item.object !== "customer" ||
        typeof item.id !== "string" ||
        item.project_id !== this.projectId
      ) {
        throw new ProviderRequestFailure("invalid_response");
      }
    }
    this.validated = true;
  }
}

function deletionErrorForHttpStatus(
  status: number,
): RevenueCatCustomerDeletionError {
  if (status === 401 || status === 403) {
    return new RevenueCatCustomerDeletionError("auth_error");
  }
  if (status === 429) {
    return new RevenueCatCustomerDeletionError("rate_limited");
  }
  if (status >= 500) {
    return new RevenueCatCustomerDeletionError("provider_unavailable");
  }
  return new RevenueCatCustomerDeletionError("provider_error");
}

export class RevenueCatSubscriptionService implements SubscriptionStatusProvider {
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly entitlementRestId: string;
  private readonly fetchImpl: FetchImplementation;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly cacheMaxEntries: number;
  private readonly cacheSweepIntervalMs: number;
  private readonly baseUrl: string;
  private readonly projectAccessValidator: RevenueCatProjectAccessValidator;
  private readonly cache = new Map<string, CachedStatus>();
  private readonly ordinaryInFlight = new Map<string, RequestEntry>();
  private readonly refreshInFlight = new Map<string, RequestEntry>();
  private readonly activeRequestCounts = new Map<string, number>();
  private readonly latestSequence = new Map<string, number>();
  private sequence = 0;
  private lastCacheSweepMs = Number.NEGATIVE_INFINITY;

  constructor(options: RevenueCatSubscriptionServiceOptions = {}) {
    this.apiKey = options.apiKey?.trim() ?? "";
    this.projectId = options.projectId?.trim() ?? "";
    this.entitlementRestId = options.entitlementRestId?.trim() ?? "";
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cacheTtlMs = Math.max(0, options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
    this.cacheMaxEntries = Math.max(
      1,
      Math.min(
        10_000,
        Math.trunc(options.cacheMaxEntries ?? DEFAULT_CACHE_MAX_ENTRIES),
      ),
    );
    this.cacheSweepIntervalMs = Math.max(
      0,
      options.cacheSweepIntervalMs ?? DEFAULT_CACHE_SWEEP_INTERVAL_MS,
    );
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.projectAccessValidator = new RevenueCatProjectAccessValidator(
      this.apiKey,
      this.projectId,
      this.fetchImpl,
      this.timeoutMs,
      this.baseUrl,
    );
  }

  async getStatus(
    appUserId: string,
    options: { refresh?: boolean } = {},
  ): Promise<SubscriptionStatus> {
    const refresh = options.refresh === true;
    const nowMs = this.now();
    this.sweepCache(nowMs, false);

    if (!refresh) {
      const cached = this.cache.get(appUserId);
      if (cached && cached.validUntilMs > nowMs) {
        this.cache.delete(appUserId);
        this.cache.set(appUserId, cached);
        return cached.status;
      }
      if (cached) this.cache.delete(appUserId);

      const currentRefresh = this.refreshInFlight.get(appUserId);
      if (currentRefresh) return currentRefresh.promise;
      const currentOrdinary = this.ordinaryInFlight.get(appUserId);
      if (currentOrdinary) return currentOrdinary.promise;
    }

    return this.startRequest(appUserId, refresh).promise;
  }

  invalidate(appUserId: string): void {
    this.cache.delete(appUserId);
    this.ordinaryInFlight.delete(appUserId);
    this.refreshInFlight.delete(appUserId);
    if ((this.activeRequestCounts.get(appUserId) ?? 0) > 0) {
      this.latestSequence.set(appUserId, ++this.sequence);
    }
  }

  private startRequest(appUserId: string, refresh: boolean): RequestEntry {
    const sequence = ++this.sequence;
    this.latestSequence.set(appUserId, sequence);
    this.activeRequestCounts.set(
      appUserId,
      (this.activeRequestCounts.get(appUserId) ?? 0) + 1,
    );

    let entry: RequestEntry;
    const promise = this.fetchStatus(appUserId)
      .then((status) => {
        if (this.latestSequence.get(appUserId) === sequence) {
          this.storeStatus(appUserId, status, this.now());
        }
        return status;
      })
      .finally(() => {
        const map = refresh ? this.refreshInFlight : this.ordinaryInFlight;
        if (map.get(appUserId) === entry) map.delete(appUserId);
        const remaining = (this.activeRequestCounts.get(appUserId) ?? 1) - 1;
        if (remaining <= 0) {
          this.activeRequestCounts.delete(appUserId);
          this.latestSequence.delete(appUserId);
        } else {
          this.activeRequestCounts.set(appUserId, remaining);
        }
      });
    entry = { sequence, promise };

    if (refresh) {
      // A forced refresh is a new provider read. It must never join an older
      // ordinary read, and future ordinary callers should join this refresh.
      this.ordinaryInFlight.delete(appUserId);
      this.refreshInFlight.set(appUserId, entry);
    } else {
      this.ordinaryInFlight.set(appUserId, entry);
    }
    return entry;
  }

  private assertConfiguration(appUserId: string): void {
    if (!this.apiKey || !this.projectId || !this.entitlementRestId) {
      throw new SubscriptionStatusUnavailableError("not_configured");
    }
    if (
      !isValidSecretApiKey(this.apiKey) ||
      !isValidResourceId(this.projectId, "proj") ||
      !isValidResourceId(this.entitlementRestId, "entl")
    ) {
      throw new SubscriptionStatusUnavailableError("invalid_configuration");
    }
    if (!isValidRevenueCatAppUserId(appUserId)) {
      throw new SubscriptionStatusUnavailableError("invalid_app_user_id");
    }
  }

  private async fetchStatus(appUserId: string): Promise<SubscriptionStatus> {
    this.assertConfiguration(appUserId);
    const expectedPath = `/v2/projects/${encodeURIComponent(
      this.projectId,
    )}/customers/${encodeURIComponent(appUserId)}/active_entitlements`;
    let pageUrl = `${this.baseUrl}/projects/${encodeURIComponent(
      this.projectId,
    )}/customers/${encodeURIComponent(appUserId)}/active_entitlements?limit=100`;
    const visited = new Set<string>();

    try {
      for (
        let pageNumber = 0;
        pageNumber < MAX_ACTIVE_ENTITLEMENT_PAGES;
        pageNumber += 1
      ) {
        if (visited.has(pageUrl)) {
          throw new ProviderRequestFailure("invalid_response");
        }
        visited.add(pageUrl);
        const response = await performProviderRequest({
          fetchImpl: this.fetchImpl,
          url: pageUrl,
          method: "GET",
          apiKey: this.apiKey,
          timeoutMs: this.timeoutMs,
          parseJsonStatuses: new Set([200]),
        });
        if (response.status === 404 && pageNumber === 0) {
          // A v2 404 can also mean a bad project/key pairing. Trust customer
          // absence only after an independent project-scoped read succeeds.
          await this.projectAccessValidator.ensureValidated();
          return inactiveStatus();
        }
        if (response.status !== 200) {
          throw new SubscriptionStatusUnavailableError("provider_error");
        }

        const page = parseActiveEntitlementPage({
          payload: response.payload,
          baseUrl: this.baseUrl,
          expectedPath,
        });
        this.projectAccessValidator.markValidated();
        const matches = page.items.filter(
          (item) => item.entitlementId === this.entitlementRestId,
        );
        if (matches.length > 1) {
          throw new ProviderRequestFailure("invalid_response");
        }
        const match = matches[0];
        if (match) {
          return {
            entitled: true,
            entitlementId: REVENUECAT_ENTITLEMENT_ID,
            expiresAt:
              match.expiresAtMs === null
                ? null
                : new Date(match.expiresAtMs).toISOString(),
            managementUrl: null,
          };
        }
        if (page.nextPageUrl === null) return inactiveStatus();
        pageUrl = page.nextPageUrl;
      }
      throw new ProviderRequestFailure("invalid_response");
    } catch (error) {
      mapStatusRequestFailure(error);
    }
  }

  private storeStatus(
    appUserId: string,
    status: SubscriptionStatus,
    evaluatedAtMs: number,
  ): void {
    let validUntilMs = evaluatedAtMs + this.cacheTtlMs;
    if (status.entitled && status.expiresAt !== null) {
      validUntilMs = Math.min(validUntilMs, Date.parse(status.expiresAt));
    }
    if (validUntilMs <= evaluatedAtMs) return;

    this.sweepCache(evaluatedAtMs, true);
    this.cache.delete(appUserId);
    while (this.cache.size >= this.cacheMaxEntries) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.cache.delete(oldestKey);
    }
    this.cache.set(appUserId, { status, validUntilMs });
  }

  private sweepCache(nowMs: number, force: boolean): void {
    if (
      !force &&
      nowMs - this.lastCacheSweepMs < this.cacheSweepIntervalMs &&
      this.cache.size < this.cacheMaxEntries
    ) {
      return;
    }
    for (const [appUserId, cached] of this.cache) {
      if (cached.validUntilMs <= nowMs) this.cache.delete(appUserId);
    }
    this.lastCacheSweepMs = nowMs;
  }
}

export class RevenueCatCustomerDeletionClient implements RevenueCatCustomerDeletionProvider {
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly fetchImpl: FetchImplementation;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;
  private readonly projectAccessValidator: RevenueCatProjectAccessValidator;

  constructor(options: RevenueCatCustomerDeletionClientOptions = {}) {
    this.apiKey = options.apiKey?.trim() ?? "";
    this.projectId = options.projectId?.trim() ?? "";
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.projectAccessValidator = new RevenueCatProjectAccessValidator(
      this.apiKey,
      this.projectId,
      this.fetchImpl,
      this.timeoutMs,
      this.baseUrl,
    );
  }

  async deleteCustomer(appUserId: string): Promise<void> {
    this.assertConfiguration(appUserId);
    const customerUrl = `${this.baseUrl}/projects/${encodeURIComponent(
      this.projectId,
    )}/customers/${encodeURIComponent(appUserId)}`;

    try {
      const customer = await performProviderRequest({
        fetchImpl: this.fetchImpl,
        url: customerUrl,
        method: "GET",
        apiKey: this.apiKey,
        timeoutMs: this.timeoutMs,
        parseJsonStatuses: new Set([200]),
      });
      if (customer.status === 404) {
        await this.projectAccessValidator.ensureValidated();
        throw new RevenueCatCustomerDeletionError("not_found");
      }
      if (customer.status !== 200) {
        throw deletionErrorForHttpStatus(customer.status);
      }
      this.validateCustomer(customer.payload, appUserId);
      this.projectAccessValidator.markValidated();

      const deletion = await performProviderRequest({
        fetchImpl: this.fetchImpl,
        url: customerUrl,
        method: "DELETE",
        apiKey: this.apiKey,
        timeoutMs: this.timeoutMs,
        parseJsonStatuses: new Set([200]),
      });
      if (deletion.status === 404) {
        throw new RevenueCatCustomerDeletionError("not_found");
      }
      if (deletion.status === 202) {
        throw new RevenueCatCustomerDeletionError("deletion_queued");
      }
      if (deletion.status !== 200) {
        throw deletionErrorForHttpStatus(deletion.status);
      }
      this.validateDeletionReceipt(deletion.payload, appUserId);
    } catch (error) {
      mapDeletionRequestFailure(error);
    }
  }

  async confirmCustomerDeleted(appUserId: string): Promise<void> {
    this.assertConfiguration(appUserId);
    const customerUrl = `${this.baseUrl}/projects/${encodeURIComponent(
      this.projectId,
    )}/customers/${encodeURIComponent(appUserId)}`;

    try {
      const customer = await performProviderRequest({
        fetchImpl: this.fetchImpl,
        url: customerUrl,
        method: "GET",
        apiKey: this.apiKey,
        timeoutMs: this.timeoutMs,
        parseJsonStatuses: new Set([200]),
      });
      if (customer.status === 404) {
        await this.projectAccessValidator.ensureValidated();
        return;
      }
      if (customer.status !== 200) {
        throw deletionErrorForHttpStatus(customer.status);
      }
      this.validateCustomer(customer.payload, appUserId);
      this.projectAccessValidator.markValidated();
      throw new RevenueCatCustomerDeletionError("deletion_queued");
    } catch (error) {
      mapDeletionRequestFailure(error);
    }
  }

  private assertConfiguration(appUserId: string): void {
    if (!this.apiKey || !this.projectId) {
      throw new RevenueCatCustomerDeletionError("not_configured");
    }
    if (
      !isValidSecretApiKey(this.apiKey) ||
      !isValidResourceId(this.projectId, "proj")
    ) {
      throw new RevenueCatCustomerDeletionError("invalid_configuration");
    }
    if (!isValidRevenueCatAppUserId(appUserId)) {
      throw new RevenueCatCustomerDeletionError("invalid_app_user_id");
    }
  }

  private validateCustomer(payload: unknown, appUserId: string): void {
    if (
      !isRecord(payload) ||
      payload.object !== "customer" ||
      payload.id !== appUserId ||
      payload.project_id !== this.projectId
    ) {
      throw new ProviderRequestFailure("invalid_response");
    }
  }

  private validateDeletionReceipt(payload: unknown, appUserId: string): void {
    if (
      !isRecord(payload) ||
      payload.object !== "customer" ||
      payload.id !== appUserId ||
      !isValidEpochMilliseconds(payload.deleted_at)
    ) {
      throw new ProviderRequestFailure("invalid_response");
    }
  }
}

let testProvider: SubscriptionStatusProvider | null = null;
let productionProvider: SubscriptionStatusProvider | null = null;
let productionCustomerDeletionProvider: RevenueCatCustomerDeletionProvider | null =
  null;

export function getSubscriptionStatusProvider(): SubscriptionStatusProvider {
  if (testProvider) return testProvider;
  productionProvider ??= new RevenueCatSubscriptionService({
    apiKey: process.env.REVENUECAT_SECRET_API_KEY,
    projectId: process.env.REVENUECAT_PROJECT_ID,
    entitlementRestId: process.env.REVENUECAT_ENTITLEMENT_REST_ID,
  });
  return productionProvider;
}

export function invalidateSubscriptionStatusForUser(appUserId: string): void {
  getSubscriptionStatusProvider().invalidate?.(appUserId);
}

/** Test seam: production code always uses the lazily configured singleton. */
export function setSubscriptionStatusProviderForTesting(
  provider: SubscriptionStatusProvider | null,
): void {
  testProvider = provider;
}

export function getRevenueCatCustomerDeletionProvider(): RevenueCatCustomerDeletionProvider {
  productionCustomerDeletionProvider ??= new RevenueCatCustomerDeletionClient({
    apiKey: process.env.REVENUECAT_SECRET_API_KEY,
    projectId: process.env.REVENUECAT_PROJECT_ID,
  });
  return productionCustomerDeletionProvider;
}
