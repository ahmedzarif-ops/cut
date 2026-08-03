import { describe, expect, it } from "vitest";

import {
  DeviceTimeZoneSyncCoordinator,
  isExpectedDeviceTimeZoneUpdateResponse,
  needsDeviceTimeZoneUpdate,
  resolveDeviceTimeZone,
} from "../device-time-zone";

describe("device time zone", () => {
  it.each(["UTC", "America/Chicago", "Asia/Dhaka"])(
    "accepts a runtime-supported IANA zone: %s",
    (timeZone) => {
      expect(resolveDeviceTimeZone(() => timeZone)).toEqual({
        ok: true,
        timeZone,
      });
    },
  );

  it.each([undefined, null, "", " America/Chicago ", "Mars/Phobos"])(
    "fails closed for an unavailable or invalid zone: %s",
    (timeZone) => {
      expect(resolveDeviceTimeZone(() => timeZone)).toEqual({ ok: false });
    },
  );

  it("fails closed when Intl resolution throws", () => {
    expect(
      resolveDeviceTimeZone(() => {
        throw new Error("device detail");
      }),
    ).toEqual({ ok: false });
  });

  it("updates only when a valid device zone differs from the server", () => {
    expect(
      needsDeviceTimeZoneUpdate("UTC", {
        ok: true,
        timeZone: "America/Chicago",
      }),
    ).toBe(true);
    expect(
      needsDeviceTimeZoneUpdate("America/Chicago", {
        ok: true,
        timeZone: "America/Chicago",
      }),
    ).toBe(false);
    expect(needsDeviceTimeZoneUpdate("UTC", { ok: false })).toBe(false);
  });

  it("serializes changed targets for the same principal", () => {
    const coordinator = new DeviceTimeZoneSyncCoordinator();
    const chicago = {
      ownerUserId: "user-a",
      serverTimeZone: "UTC",
      deviceTimeZone: "America/Chicago",
      retry: 0,
    } as const;
    const dhaka = {
      ...chicago,
      deviceTimeZone: "Asia/Dhaka",
    } as const;

    const first = coordinator.begin(chicago);
    expect(first).toBe(chicago);
    expect(coordinator.begin(chicago)).toBeNull();
    expect(coordinator.begin(dhaka)).toBeNull();
    expect(coordinator.hasActiveAttempt("user-a")).toBe(true);

    expect(coordinator.succeed(first!)).toBe(true);
    expect(coordinator.begin(dhaka)).toBe(dhaka);
  });

  it("blocks an automatic failure loop until retry or input changes", () => {
    const coordinator = new DeviceTimeZoneSyncCoordinator();
    const attempt = {
      ownerUserId: "user-a",
      serverTimeZone: "UTC",
      deviceTimeZone: "America/Chicago",
      retry: 0,
    } as const;
    const first = coordinator.begin(attempt);

    expect(coordinator.fail(first!)).toBe(true);
    expect(coordinator.begin(attempt)).toBeNull();
    expect(coordinator.begin({ ...attempt, retry: 1 })).not.toBeNull();
  });

  it("invalidates a late principal A continuation when principal B begins", () => {
    const coordinator = new DeviceTimeZoneSyncCoordinator();
    const principalA = coordinator.begin({
      ownerUserId: "user-a",
      serverTimeZone: "UTC",
      deviceTimeZone: "America/Chicago",
      retry: 0,
    });
    const principalB = coordinator.begin({
      ownerUserId: "user-b",
      serverTimeZone: "UTC",
      deviceTimeZone: "Asia/Dhaka",
      retry: 0,
    });

    expect(principalB).not.toBeNull();
    expect(coordinator.isCurrent(principalA!)).toBe(false);
    expect(coordinator.succeed(principalA!)).toBe(false);
    expect(coordinator.isCurrent(principalB!)).toBe(true);
  });

  it("invalidates an in-flight continuation when disposed", () => {
    const coordinator = new DeviceTimeZoneSyncCoordinator();
    const attempt = coordinator.begin({
      ownerUserId: "user-a",
      serverTimeZone: "UTC",
      deviceTimeZone: "America/Chicago",
      retry: 0,
    });

    coordinator.dispose();

    expect(coordinator.isCurrent(attempt!)).toBe(false);
    expect(coordinator.succeed(attempt!)).toBe(false);
  });

  it("accepts only the expected principal and target in a PATCH response", () => {
    const attempt = {
      ownerUserId: "clerk-user-a",
      serverTimeZone: "UTC",
      deviceTimeZone: "America/Chicago",
      retry: 0,
    } as const;

    expect(
      isExpectedDeviceTimeZoneUpdateResponse(
        { id: "internal-user-a", timezone: "America/Chicago" },
        "internal-user-a",
        attempt,
      ),
    ).toBe(true);
    expect(
      isExpectedDeviceTimeZoneUpdateResponse(
        { id: "internal-user-b", timezone: "America/Chicago" },
        "internal-user-a",
        attempt,
      ),
    ).toBe(false);
    expect(
      isExpectedDeviceTimeZoneUpdateResponse(
        { id: "internal-user-a", timezone: "UTC" },
        "internal-user-a",
        attempt,
      ),
    ).toBe(false);
  });
});
