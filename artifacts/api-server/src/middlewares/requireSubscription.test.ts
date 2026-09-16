import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireSubscription } from "./requireSubscription";
import {
  REVENUECAT_ENTITLEMENT_ID,
  setSubscriptionStatusProviderForTesting,
  SubscriptionStatusUnavailableError,
  type SubscriptionStatusProvider,
} from "../services/revenueCatSubscriptionService";

const USER_ID = "f32642cd-884f-4db7-bfc0-78efa78d7237";

function requestWithUser(userId: string | null = USER_ID): {
  req: Request;
  logError: ReturnType<typeof vi.fn>;
} {
  const logError = vi.fn();
  return {
    req: {
      userId: userId ?? undefined,
      log: { error: logError },
    } as unknown as Request,
    logError,
  };
}

function mockResponse(): {
  res: Response;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
} {
  const status = vi.fn();
  const json = vi.fn();
  const setHeader = vi.fn();
  const res = { status, json, setHeader } as unknown as Response;
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  return { res, status, json, setHeader };
}

function provider(
  getStatus: SubscriptionStatusProvider["getStatus"],
): SubscriptionStatusProvider {
  return { getStatus };
}

afterEach(() => {
  setSubscriptionStatusProviderForTesting(null);
});

describe("requireSubscription", () => {
  it("continues only when the internal user has the entitlement", async () => {
    const getStatus = vi.fn().mockResolvedValue({
      entitled: true,
      entitlementId: REVENUECAT_ENTITLEMENT_ID,
      expiresAt: null,
      managementUrl: null,
    });
    setSubscriptionStatusProviderForTesting(provider(getStatus));
    const { req } = requestWithUser();
    const { res, status, json } = mockResponse();
    const next = vi.fn() as NextFunction;

    await requireSubscription(req, res, next);

    expect(getStatus).toHaveBeenCalledWith(USER_ID);
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it("returns the exact paywall response for an inactive entitlement", async () => {
    setSubscriptionStatusProviderForTesting(
      provider(
        vi.fn().mockResolvedValue({
          entitled: false,
          entitlementId: REVENUECAT_ENTITLEMENT_ID,
          expiresAt: "2026-01-01T00:00:00.000Z",
          managementUrl: null,
        }),
      ),
    );
    const { req } = requestWithUser();
    const { res, status, json, setHeader } = mockResponse();
    const next = vi.fn() as NextFunction;

    await requireSubscription(req, res, next);

    expect(status).toHaveBeenCalledWith(402);
    expect(json).toHaveBeenCalledWith({
      error: "An active CUT OS Pro subscription is required",
      code: "subscription_required",
    });
    expect(setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed with a sanitized 503 and sanitized log metadata", async () => {
    setSubscriptionStatusProviderForTesting(
      provider(
        vi
          .fn()
          .mockRejectedValue(
            new Error("Bearer secret-key raw RevenueCat response"),
          ),
      ),
    );
    const { req, logError } = requestWithUser();
    const { res, status, json } = mockResponse();
    const next = vi.fn() as NextFunction;

    await requireSubscription(req, res, next);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      error: "Subscription status is temporarily unavailable",
      code: "subscription_status_unavailable",
    });
    expect(logError).toHaveBeenCalledWith(
      { errorCode: "subscription_status_unexpected_error" },
      "Subscription status could not be verified",
    );
    expect(
      JSON.stringify([json.mock.calls, logError.mock.calls]),
    ).not.toContain("secret-key");
    expect(next).not.toHaveBeenCalled();
  });

  it("logs only the typed provider failure category", async () => {
    setSubscriptionStatusProviderForTesting(
      provider(
        vi
          .fn()
          .mockRejectedValue(
            new SubscriptionStatusUnavailableError("provider_error"),
          ),
      ),
    );
    const { req, logError } = requestWithUser();
    const { res } = mockResponse();

    await requireSubscription(req, res, vi.fn());

    expect(logError).toHaveBeenCalledWith(
      { errorCode: "subscription_status_provider_error" },
      "Subscription status could not be verified",
    );
  });

  it("fails closed when it is accidentally registered before requireAuth", async () => {
    const getStatus = vi.fn();
    setSubscriptionStatusProviderForTesting(provider(getStatus));
    const { req } = requestWithUser(null);
    const { res, status, json } = mockResponse();
    const next = vi.fn() as NextFunction;

    await requireSubscription(req, res, next);

    expect(getStatus).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      error: "Subscription status is temporarily unavailable",
      code: "subscription_status_unavailable",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
