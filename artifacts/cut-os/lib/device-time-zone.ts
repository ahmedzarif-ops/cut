import { isValidTimeZone } from "@workspace/domain";

export type DeviceTimeZoneResolution =
  { ok: true; timeZone: string } | { ok: false };

export interface DeviceTimeZoneSyncAttempt {
  readonly ownerUserId: string;
  readonly serverTimeZone: string;
  readonly deviceTimeZone: string;
  readonly retry: number;
}

function isSameAttempt(
  left: DeviceTimeZoneSyncAttempt,
  right: DeviceTimeZoneSyncAttempt,
): boolean {
  return (
    left.ownerUserId === right.ownerUserId &&
    left.serverTimeZone === right.serverTimeZone &&
    left.deviceTimeZone === right.deviceTimeZone &&
    left.retry === right.retry
  );
}

/**
 * Serialize timezone writes for one signed-in principal.
 *
 * A device-zone change can cause a render while an earlier PATCH is still in
 * flight. Sending both writes concurrently would allow the older response to
 * win at the server after the newer one. This coordinator keeps one write in
 * flight per principal, blocks automatic retry loops after a failure, and
 * invalidates late continuations when a different principal takes ownership.
 */
export class DeviceTimeZoneSyncCoordinator {
  private active: DeviceTimeZoneSyncAttempt | null = null;
  private failed: DeviceTimeZoneSyncAttempt | null = null;

  begin(attempt: DeviceTimeZoneSyncAttempt): DeviceTimeZoneSyncAttempt | null {
    if (this.active?.ownerUserId === attempt.ownerUserId) return null;
    if (this.failed && isSameAttempt(this.failed, attempt)) return null;

    // A new principal supersedes the old principal's client-side continuation.
    // The old HTTP request retains its snapshotted auth getter, but it may no
    // longer write into the shared query cache when it settles.
    this.active = attempt;
    return attempt;
  }

  isCurrent(attempt: DeviceTimeZoneSyncAttempt): boolean {
    return this.active === attempt;
  }

  hasActiveAttempt(ownerUserId: string): boolean {
    return this.active?.ownerUserId === ownerUserId;
  }

  succeed(attempt: DeviceTimeZoneSyncAttempt): boolean {
    if (!this.isCurrent(attempt)) return false;
    this.active = null;
    this.failed = null;
    return true;
  }

  fail(attempt: DeviceTimeZoneSyncAttempt): boolean {
    if (!this.isCurrent(attempt)) return false;
    this.active = null;
    this.failed = attempt;
    return true;
  }

  dispose(): void {
    this.active = null;
    this.failed = null;
  }
}

export function isExpectedDeviceTimeZoneUpdateResponse(
  value: unknown,
  expectedUserId: string,
  attempt: DeviceTimeZoneSyncAttempt,
): value is { id: string; timezone: string } {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { id?: unknown; timezone?: unknown };
  return (
    candidate.id === expectedUserId &&
    candidate.timezone === attempt.deviceTimeZone
  );
}

/**
 * Read the IANA time zone reported by the device without guessing from an
 * offset. Daily CUT OS keys require a named zone so daylight-saving changes
 * and local-midnight rollovers stay correct.
 */
export function resolveDeviceTimeZone(
  readTimeZone: () => unknown = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone,
): DeviceTimeZoneResolution {
  try {
    const value = readTimeZone();
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > 100 ||
      value.trim() !== value ||
      !isValidTimeZone(value)
    ) {
      return { ok: false };
    }
    return { ok: true, timeZone: value };
  } catch {
    return { ok: false };
  }
}

export function needsDeviceTimeZoneUpdate(
  serverTimeZone: string,
  deviceTimeZone: DeviceTimeZoneResolution,
): boolean {
  return deviceTimeZone.ok && deviceTimeZone.timeZone !== serverTimeZone;
}
