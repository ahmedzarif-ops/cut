import type { NextFunction, Request, Response } from "express";
import { isValidTimeZone } from "@workspace/domain";

export const DEVICE_TIME_ZONE_HEADER = "X-CUT-Device-Timezone";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      deviceTimeZone?: string;
    }
  }
}

/**
 * Resolve the local-day boundary from this request's device, not from one
 * shared mutable account setting. This lets two devices in different zones
 * operate concurrently without one silently changing the other's calendar
 * day. Missing, malformed, and unsupported values fail closed before a daily
 * read or write reaches its service.
 */
export function requireDeviceTimeZone(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Daily responses contain private health data and vary by a request header.
  // Keep them out of native/intermediary caches and declare the variance even
  // for validation errors so no response can be reused across device zones.
  res.setHeader("Cache-Control", "no-store");
  res.vary(DEVICE_TIME_ZONE_HEADER);

  const timeZone = req.get(DEVICE_TIME_ZONE_HEADER);
  if (
    typeof timeZone !== "string" ||
    timeZone.length === 0 ||
    timeZone.length > 100 ||
    timeZone.trim() !== timeZone ||
    !isValidTimeZone(timeZone)
  ) {
    res.status(400).json({
      error: "A valid device timezone is required for daily data",
      code: "device_timezone_required",
    });
    return;
  }

  req.deviceTimeZone = timeZone;
  next();
}
