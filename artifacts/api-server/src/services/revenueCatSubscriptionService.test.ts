import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REVENUECAT_ENTITLEMENT_ID,
  RevenueCatCustomerDeletionClient,
  RevenueCatCustomerDeletionError,
  RevenueCatSubscriptionService,
  SubscriptionStatusUnavailableError,
} from "./revenueCatSubscriptionService";

const NOW_MS = Date.parse("2026-01-01T00:00:00.000Z");
const APP_USER_ID = "1046f55b-d2fc-4c39-8e93-d67e18056236";
const APP_USER_ID_2 = "2046f55b-d2fc-4c39-8e93-d67e18056236";
const APP_USER_ID_3 = "3046f55b-d2fc-4c39-8e93-d67e18056236";
const PROJECT_ID = "projea0cbd46";
const ENTITLEMENT_REST_ID = "entl8efd6d2c18";
const SECRET_API_KEY = "sk_test_server_secret";
const ACTIVE_PATH = `/v2/projects/${PROJECT_ID}/customers/${APP_USER_ID}/active_entitlements`;

function response(payload: unknown, status = 200): Response {
  return {
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

function activePage(
  items: unknown[],
  options: { nextPage?: string | null; url?: string } = {},
): unknown {
  return {
    object: "list",
    items,
    next_page: options.nextPage ?? null,
    url: options.url ?? ACTIVE_PATH,
    provider_private_field: "must-not-escape",
  };
}

function activeEntitlement(
  entitlementId = ENTITLEMENT_REST_ID,
  expiresAt: number | null = Date.parse("2026-02-01T00:00:00.000Z"),
): unknown {
  return {
    object: "customer.active_entitlement",
    entitlement_id: entitlementId,
    expires_at: expiresAt,
  };
}

function customer(appUserId = APP_USER_ID): unknown {
  return {
    object: "customer",
    id: appUserId,
    project_id: PROJECT_ID,
    first_seen_at: NOW_MS,
    last_seen_at: NOW_MS,
  };
}

function customerList(items: unknown[] = []): unknown {
  return {
    object: "list",
    items,
    next_page: null,
    url: `/v2/projects/${PROJECT_ID}/customers`,
  };
}

function deletionReceipt(appUserId = APP_USER_ID): unknown {
  return {
    object: "customer",
    id: appUserId,
    deleted_at: NOW_MS,
  };
}

function subscriptionService(
  fetchImpl: ReturnType<typeof vi.fn>,
  overrides: Record<string, unknown> = {},
): RevenueCatSubscriptionService {
  return new RevenueCatSubscriptionService({
    apiKey: SECRET_API_KEY,
    projectId: PROJECT_ID,
    entitlementRestId: ENTITLEMENT_REST_ID,
    fetchImpl,
    now: () => NOW_MS,
    ...overrides,
  });
}

function deletionClient(
  fetchImpl: ReturnType<typeof vi.fn>,
  overrides: Record<string, unknown> = {},
): RevenueCatCustomerDeletionClient {
  return new RevenueCatCustomerDeletionClient({
    apiKey: SECRET_API_KEY,
    projectId: PROJECT_ID,
    fetchImpl,
    ...overrides,
  });
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("RevenueCatSubscriptionService v2", () => {
  it("queries non-creating active_entitlements and maps the REST id to CUT_OS_PRO", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response(activePage([activeEntitlement()])));
    const service = subscriptionService(fetchImpl);

    const status = await service.getStatus(APP_USER_ID);

    expect(status).toEqual({
      entitled: true,
      entitlementId: "CUT_OS_PRO",
      expiresAt: "2026-02-01T00:00:00.000Z",
      managementUrl: null,
    });
    expect(Object.keys(status).sort()).toEqual(
      ["entitled", "entitlementId", "expiresAt", "managementUrl"].sort(),
    );
    expect(JSON.stringify(status)).not.toContain("provider_private_field");
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/customers/${APP_USER_ID}/active_entitlements?limit=100`,
    );
    expect(init).toMatchObject({
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${SECRET_API_KEY}`,
      },
    });
  });

  it("validates project access before treating a non-creating 404 as not entitled", async () => {
    const notFound = response({ raw: "not exposed" }, 404);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(notFound)
      .mockResolvedValueOnce(response(customerList()));

    await expect(
      subscriptionService(fetchImpl).getStatus(APP_USER_ID),
    ).resolves.toEqual({
      entitled: false,
      entitlementId: REVENUECAT_ENTITLEMENT_ID,
      expiresAt: null,
      managementUrl: null,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]![0]).toBe(
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/customers?limit=1`,
    );
    expect(notFound.json).not.toHaveBeenCalled();
  });

  it("fails closed when an active-entitlements 404 has an invalid project/key pairing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response({}, 404));

    await expect(
      subscriptionService(fetchImpl).getStatus(APP_USER_ID),
    ).rejects.toMatchObject({
      name: "SubscriptionStatusUnavailableError",
      reason: "provider_error",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("compares the generated entitlement REST id, not the public lookup key", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        response(activePage([activeEntitlement("CUT_OS_PRO")])),
      );

    await expect(
      subscriptionService(fetchImpl).getStatus(APP_USER_ID),
    ).resolves.toMatchObject({
      entitled: false,
      entitlementId: "CUT_OS_PRO",
    });
  });

  it("accepts an active entitlement with no finite expiration", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        response(activePage([activeEntitlement(ENTITLEMENT_REST_ID, null)])),
      );

    await expect(
      subscriptionService(fetchImpl).getStatus(APP_USER_ID),
    ).resolves.toMatchObject({
      entitled: true,
      expiresAt: null,
    });
  });

  it("trusts inclusion in active_entitlements for grace access even if expires_at is past", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        response(
          activePage([activeEntitlement(ENTITLEMENT_REST_ID, NOW_MS - 1)]),
        ),
      );

    await expect(
      subscriptionService(fetchImpl).getStatus(APP_USER_ID),
    ).resolves.toMatchObject({
      entitled: true,
      expiresAt: "2025-12-31T23:59:59.999Z",
    });
  });

  it("follows validated pagination until it finds the configured entitlement", async () => {
    const nextPage = `${ACTIVE_PATH}?starting_after=entl_other&limit=100`;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        response(activePage([activeEntitlement("entl_other")], { nextPage })),
      )
      .mockResolvedValueOnce(
        response(
          activePage([activeEntitlement()], {
            url: nextPage,
          }),
        ),
      );

    const status = await subscriptionService(fetchImpl).getStatus(APP_USER_ID);

    expect(status.entitled).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]![0]).toBe(
      `https://api.revenuecat.com${nextPage}`,
    );
  });

  it.each([
    null,
    {},
    { subscriber: { entitlements: {} } },
    { object: "list", items: [], next_page: null },
    activePage([
      {
        object: "wrong",
        entitlement_id: ENTITLEMENT_REST_ID,
        expires_at: NOW_MS,
      },
    ]),
    activePage([
      {
        object: "customer.active_entitlement",
        entitlement_id: ENTITLEMENT_REST_ID,
      },
    ]),
    activePage([activeEntitlement(ENTITLEMENT_REST_ID, Number.NaN)]),
    activePage([], {
      nextPage: "https://attacker.example/customers?starting_after=x",
    }),
  ])("fails closed on malformed v2 response shapes", async (payload) => {
    const service = subscriptionService(
      vi.fn().mockResolvedValue(response(payload)),
    );

    await expect(service.getStatus(APP_USER_ID)).rejects.toMatchObject({
      name: "SubscriptionStatusUnavailableError",
      reason: "invalid_response",
      message: "Subscription status is unavailable",
    });
  });

  it.each([
    [{ apiKey: "" }, "not_configured"],
    [{ projectId: "" }, "not_configured"],
    [{ entitlementRestId: "" }, "not_configured"],
    [{ apiKey: "appl_public_key" }, "invalid_configuration"],
    [{ apiKey: "not-secret" }, "invalid_configuration"],
    [{ projectId: "wrong_project" }, "invalid_configuration"],
    [{ entitlementRestId: "CUT_OS_PRO" }, "invalid_configuration"],
  ])(
    "rejects missing, public, or malformed configuration",
    async (overrides, reason) => {
      const fetchImpl = vi.fn();
      const service = subscriptionService(fetchImpl, overrides);

      await expect(service.getStatus(APP_USER_ID)).rejects.toMatchObject({
        reason,
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("rejects a non-UUID customer id before network access", async () => {
    const fetchImpl = vi.fn();

    await expect(
      subscriptionService(fetchImpl).getStatus("clerk-user-id"),
    ).rejects.toMatchObject({
      reason: "invalid_app_user_id",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps provider and network failures to sanitized errors", async () => {
    const providerFailure = subscriptionService(
      vi.fn().mockResolvedValue(response({ raw: "provider-secret" }, 500)),
    );
    const networkFailure = subscriptionService(
      vi.fn().mockRejectedValue(new Error("Bearer secret network detail")),
    );

    const providerError = await providerFailure
      .getStatus(APP_USER_ID)
      .catch((error: unknown) => error);
    const networkError = await networkFailure
      .getStatus(APP_USER_ID)
      .catch((error: unknown) => error);
    expect(providerError).toMatchObject({ reason: "provider_error" });
    expect(networkError).toMatchObject({ reason: "network_error" });
    expect(JSON.stringify([providerError, networkError])).not.toContain(
      "secret",
    );
  });

  it("keeps the abort timeout active while a successful response body stalls", async () => {
    const fetchImpl = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) =>
        ({
          status: 200,
          json: () =>
            new Promise((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () =>
                reject(new Error("raw stalled body")),
              );
            }),
        }) as Response,
    );

    await expect(
      subscriptionService(fetchImpl, { timeoutMs: 5 }).getStatus(APP_USER_ID),
    ).rejects.toMatchObject({ reason: "timeout" });
  });

  it("caches results, bounds the cache, and evicts least-recently-used users", async () => {
    const fetchImpl = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        response(
          activePage([], {
            url: new URL(url).pathname,
          }),
        ),
      ),
    );
    const service = subscriptionService(fetchImpl, { cacheMaxEntries: 2 });

    await service.getStatus(APP_USER_ID);
    await service.getStatus(APP_USER_ID_2);
    await service.getStatus(APP_USER_ID); // touch first; second becomes oldest
    await service.getStatus(APP_USER_ID_3);
    await service.getStatus(APP_USER_ID_2);

    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("sweeps expired entries and never caches beyond a finite expiration", async () => {
    let nowMs = NOW_MS;
    const fetchImpl = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          response(
            activePage(
              [activeEntitlement(ENTITLEMENT_REST_ID, NOW_MS + 1_000)],
              { url: new URL(url).pathname },
            ),
          ),
        ),
      );
    const service = subscriptionService(fetchImpl, {
      now: () => nowMs,
      cacheTtlMs: 60_000,
      cacheSweepIntervalMs: 0,
    });

    await service.getStatus(APP_USER_ID);
    nowMs += 1_000;
    await service.getStatus(APP_USER_ID);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("explicit invalidation removes cached access for one user", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response(activePage([activeEntitlement()])));
    const service = subscriptionService(fetchImpl);

    await service.getStatus(APP_USER_ID);
    await service.getStatus(APP_USER_ID);
    service.invalidate(APP_USER_ID);
    await service.getStatus(APP_USER_ID);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("forced refresh never joins an older ordinary request or lets it overwrite cache", async () => {
    const oldBody = deferred<unknown>();
    const refreshedBody = deferred<unknown>();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: () => oldBody.promise,
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        json: () => refreshedBody.promise,
      } as Response);
    const service = subscriptionService(fetchImpl);

    const ordinary = service.getStatus(APP_USER_ID);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const refresh = service.getStatus(APP_USER_ID, { refresh: true });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));

    refreshedBody.resolve(activePage([]));
    await expect(refresh).resolves.toMatchObject({ entitled: false });
    oldBody.resolve(activePage([activeEntitlement()]));
    await expect(ordinary).resolves.toMatchObject({ entitled: true });
    await expect(service.getStatus(APP_USER_ID)).resolves.toMatchObject({
      entitled: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("invalidation during an in-flight read prevents that older result from repopulating cache", async () => {
    const oldBody = deferred<unknown>();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        status: 200,
        json: () => oldBody.promise,
      } as Response)
      .mockResolvedValueOnce(response(activePage([])));
    const service = subscriptionService(fetchImpl);

    const oldRead = service.getStatus(APP_USER_ID);
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledOnce());
    service.invalidate(APP_USER_ID);
    oldBody.resolve(activePage([activeEntitlement()]));
    await oldRead;
    await expect(service.getStatus(APP_USER_ID)).resolves.toMatchObject({
      entitled: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("RevenueCatCustomerDeletionClient v2", () => {
  it("uses a non-creating GET then DELETE and validates the exact 200 receipt", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(customer()))
      .mockResolvedValueOnce(response(deletionReceipt()));
    const client = deletionClient(fetchImpl);

    await expect(client.deleteCustomer(APP_USER_ID)).resolves.toBeUndefined();

    const customerUrl = `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/customers/${APP_USER_ID}`;
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      customerUrl,
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      customerUrl,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("validates project access before trusting a customer GET 404 as absent", async () => {
    const missing = response({ raw: "customer missing" }, 404);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(missing)
      .mockResolvedValueOnce(response(customerList()));
    const client = deletionClient(fetchImpl);

    await expect(client.deleteCustomer(APP_USER_ID)).rejects.toEqual(
      new RevenueCatCustomerDeletionError("not_found"),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1]![0]).toBe(
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/customers?limit=1`,
    );
    expect(
      fetchImpl.mock.calls.some(([, init]) => init.method === "DELETE"),
    ).toBe(false);
    expect(missing.json).not.toHaveBeenCalled();
  });

  it("does not trust a 404 when the configured project/key pairing cannot be validated", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response({}, 404));

    await expect(
      deletionClient(fetchImpl).deleteCustomer(APP_USER_ID),
    ).rejects.toMatchObject({
      reason: "provider_error",
    });
  });

  it("treats DELETE 404 as absent after the preceding customer read validates the project", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(customer()))
      .mockResolvedValueOnce(response({}, 404));

    await expect(
      deletionClient(fetchImpl).deleteCustomer(APP_USER_ID),
    ).rejects.toMatchObject({
      reason: "not_found",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps a queued 202 deletion non-terminal and exposes a GET-only poll", async () => {
    const queued = response(deletionReceipt(), 202);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(customer()))
      .mockResolvedValueOnce(queued)
      .mockResolvedValueOnce(response({}, 404));
    const client = deletionClient(fetchImpl);

    await expect(client.deleteCustomer(APP_USER_ID)).rejects.toMatchObject({
      reason: "deletion_queued",
    });
    await expect(
      client.confirmCustomerDeleted(APP_USER_ID),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([, init]) => init.method)).toEqual([
      "GET",
      "DELETE",
      "GET",
    ]);
    expect(queued.json).not.toHaveBeenCalled();
  });

  it("keeps GET-only polling pending while a queued customer still exists", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(customer()));
    const client = deletionClient(fetchImpl);

    await expect(
      client.confirmCustomerDeleted(APP_USER_ID),
    ).rejects.toMatchObject({
      reason: "deletion_queued",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]![1]).toMatchObject({ method: "GET" });
  });

  it("revalidates project access after restart before trusting poll 404", async () => {
    const missing = response({}, 404);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(missing)
      .mockResolvedValueOnce(response(customerList()));
    const restartedClient = deletionClient(fetchImpl);

    await expect(
      restartedClient.confirmCustomerDeleted(APP_USER_ID),
    ).resolves.toBeUndefined();
    expect(fetchImpl.mock.calls.map(([, init]) => init.method)).toEqual([
      "GET",
      "GET",
    ]);
    expect(fetchImpl.mock.calls[1]![0]).toBe(
      `https://api.revenuecat.com/v2/projects/${PROJECT_ID}/customers?limit=1`,
    );
    expect(missing.json).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { object: "customer", id: APP_USER_ID, deleted_at: NOW_MS },
    { object: "customer", id: APP_USER_ID_2, project_id: PROJECT_ID },
  ])("fails closed on a malformed customer response", async (payload) => {
    const fetchImpl = vi.fn().mockResolvedValue(response(payload));

    await expect(
      deletionClient(fetchImpl).deleteCustomer(APP_USER_ID),
    ).rejects.toMatchObject({
      reason: "invalid_response",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it.each([
    null,
    {},
    { object: "customer", id: APP_USER_ID, deleted_at: "now" },
    { object: "customer", id: APP_USER_ID_2, deleted_at: NOW_MS },
    { object: "deleted_customer", id: APP_USER_ID, deleted_at: NOW_MS },
  ])(
    "fails closed when a 200 deletion receipt is not exact",
    async (payload) => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(response(customer()))
        .mockResolvedValueOnce(response(payload));

      await expect(
        deletionClient(fetchImpl).deleteCustomer(APP_USER_ID),
      ).rejects.toMatchObject({
        reason: "invalid_response",
      });
    },
  );

  it.each([
    [{ apiKey: "" }, "not_configured"],
    [{ projectId: "" }, "not_configured"],
    [{ apiKey: "appl_public_key" }, "invalid_configuration"],
    [{ apiKey: "secret" }, "invalid_configuration"],
    [{ projectId: "wrong" }, "invalid_configuration"],
  ])(
    "rejects missing, public, or malformed deletion configuration",
    async (overrides, reason) => {
      const fetchImpl = vi.fn();

      await expect(
        deletionClient(fetchImpl, overrides).deleteCustomer(APP_USER_ID),
      ).rejects.toMatchObject({
        reason,
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("keeps the timeout active through deletion receipt body parsing", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(customer()))
      .mockImplementationOnce(
        async (_url, init?: RequestInit) =>
          ({
            status: 200,
            json: () =>
              new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () =>
                  reject(new Error("raw deletion receipt stall")),
                );
              }),
          }) as Response,
      );

    await expect(
      deletionClient(fetchImpl, { timeoutMs: 5 }).deleteCustomer(APP_USER_ID),
    ).rejects.toMatchObject({ reason: "timeout" });
  });
});
