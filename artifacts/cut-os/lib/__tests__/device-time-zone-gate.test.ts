import { describe, expect, it } from "vitest";

import {
  dailyDeviceTimeZoneQueryKey,
  dailyDeviceTimeZoneRequest,
  DEVICE_TIME_ZONE_HEADER,
  isDailyDeviceTimeZoneQueryKey,
  isDeviceTimeZoneContextError,
} from "../device-time-zone-gate";

describe("daily device timezone request context", () => {
  it("binds each daily request to the current device timezone", () => {
    const request = dailyDeviceTimeZoneRequest("America/Chicago");

    expect(new Headers(request.headers).get(DEVICE_TIME_ZONE_HEADER)).toBe(
      "America/Chicago",
    );
  });

  it("isolates query caches across devices, zones, and account switches", () => {
    const base = ["/api/me/today"] as const;
    const deviceA = dailyDeviceTimeZoneQueryKey(base, {
      ownerClerkUserId: "clerk-a",
      timeZone: "America/Chicago",
    });
    const deviceB = dailyDeviceTimeZoneQueryKey(base, {
      ownerClerkUserId: "clerk-a",
      timeZone: "Asia/Dhaka",
    });
    const switchedAccount = dailyDeviceTimeZoneQueryKey(base, {
      ownerClerkUserId: "clerk-b",
      timeZone: "Asia/Dhaka",
    });

    expect(deviceA).not.toEqual(deviceB);
    expect(deviceB).not.toEqual(switchedAccount);
    expect(deviceA[0]).toBe(base[0]);
  });

  it("identifies every daily cache that must be removed on rejection", () => {
    expect(isDailyDeviceTimeZoneQueryKey(["/api/me/today"])).toBe(true);
    expect(isDailyDeviceTimeZoneQueryKey(["/api/me/meals/today"])).toBe(true);
    expect(isDailyDeviceTimeZoneQueryKey(["/api/me/weight-entries"])).toBe(
      false,
    );
    expect(isDailyDeviceTimeZoneQueryKey(["/api/me"])).toBe(false);
    expect(isDailyDeviceTimeZoneQueryKey([])).toBe(false);
  });

  it("recognizes only the server's fail-closed timezone context error", () => {
    expect(
      isDeviceTimeZoneContextError({
        status: 400,
        data: { code: "device_timezone_required" },
      }),
    ).toBe(true);
    expect(
      isDeviceTimeZoneContextError({
        status: 400,
        data: { code: "some_other_error" },
      }),
    ).toBe(false);
    expect(
      isDeviceTimeZoneContextError({
        status: 412,
        data: { code: "device_timezone_required" },
      }),
    ).toBe(false);
  });
});
