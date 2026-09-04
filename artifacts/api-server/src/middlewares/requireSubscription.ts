import type { NextFunction, Request, Response } from "express";
import {
  getSubscriptionStatusProvider,
  SubscriptionStatusUnavailableError,
} from "../services/revenueCatSubscriptionService";

const SUBSCRIPTION_REQUIRED_RESPONSE = {
  error: "An active CUT OS Pro subscription is required",
  code: "subscription_required",
} as const;

const SUBSCRIPTION_UNAVAILABLE_RESPONSE = {
  error: "Subscription status is temporarily unavailable",
  code: "subscription_status_unavailable",
} as const;

function safeFailureCode(error: unknown): string {
  return error instanceof SubscriptionStatusUnavailableError
    ? `subscription_status_${error.reason}`
    : "subscription_status_unexpected_error";
}

export function sendSubscriptionStatusUnavailable(
  req: Request,
  res: Response,
  error: unknown,
): void {
  // Never serialize the exception: it may originate in an external provider.
  req.log?.error(
    { errorCode: safeFailureCode(error) },
    "Subscription status could not be verified",
  );
  res.setHeader("Cache-Control", "no-store");
  res.status(503).json(SUBSCRIPTION_UNAVAILABLE_RESPONSE);
}

/** Must always be registered after requireAuth so req.userId is internal UUID. */
export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    sendSubscriptionStatusUnavailable(req, res, undefined);
    return;
  }

  try {
    const status = await getSubscriptionStatusProvider().getStatus(req.userId);
    if (!status.entitled) {
      res.setHeader("Cache-Control", "no-store");
      res.status(402).json(SUBSCRIPTION_REQUIRED_RESPONSE);
      return;
    }
  } catch (error) {
    sendSubscriptionStatusUnavailable(req, res, error);
    return;
  }

  next();
}
