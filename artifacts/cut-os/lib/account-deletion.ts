export const ACCOUNT_DELETION_MARKER_VERSION = 2 as const;
export const ACCOUNT_DELETION_MARKER_STATE = "requested" as const;
export const ACCOUNT_DELETION_SERVER_STATUSES = [
  "none",
  "pending",
  "completed",
] as const;

export type AccountDeletionServerStatus =
  (typeof ACCOUNT_DELETION_SERVER_STATUSES)[number];

export interface AccountDeletionMarker {
  version: typeof ACCOUNT_DELETION_MARKER_VERSION;
  ownerClerkUserId: string;
  requestId: string;
  state: typeof ACCOUNT_DELETION_MARKER_STATE;
  requestedAt: string;
}

export type AccountDeletionGateDecision = "allow_app" | "require_settings";

const KEY_PREFIX = "cut_os.account_deletion.v2.";

/**
 * SecureStore accepts only alphanumeric characters plus `.`, `-`, and `_`.
 * Code-point encoding is deterministic, collision-free, and keeps the marker
 * isolated to the exact Clerk user on a shared device.
 */
export function accountDeletionKey(clerkUserId: string): string {
  if (clerkUserId.trim() === "") {
    throw new Error("A Clerk user ID is required for account deletion state.");
  }

  const encodedUserId = Array.from(clerkUserId, (character) =>
    character.codePointAt(0)!.toString(16),
  ).join("_");
  return `${KEY_PREFIX}${encodedUserId}`;
}

export function createAccountDeletionMarker(
  ownerClerkUserId: string,
  requestId: string,
  requestedAt: string,
): AccountDeletionMarker {
  if (ownerClerkUserId.trim() === "") {
    throw new Error("An owner Clerk user ID is required.");
  }
  if (requestId.trim() === "") {
    throw new Error("An opaque deletion request ID is required.");
  }
  if (!isValidTimestamp(requestedAt)) {
    throw new Error("A valid deletion request timestamp is required.");
  }

  return {
    version: ACCOUNT_DELETION_MARKER_VERSION,
    ownerClerkUserId,
    requestId,
    state: ACCOUNT_DELETION_MARKER_STATE,
    requestedAt,
  };
}

export function serializeAccountDeletionMarker(
  marker: AccountDeletionMarker,
): string {
  return JSON.stringify(marker);
}

/** Null means no local request. Corrupt, stale, or mismatched data fails closed. */
export function parseAccountDeletionMarker(
  storedValue: string | null,
  expectedClerkUserId: string,
): AccountDeletionMarker | null {
  if (storedValue === null) return null;

  let candidate: unknown;
  try {
    candidate = JSON.parse(storedValue);
  } catch {
    throw new Error("Account deletion recovery data is corrupt.");
  }

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Account deletion recovery data is corrupt.");
  }
  const record = candidate as Record<string, unknown>;
  if (record.version !== ACCOUNT_DELETION_MARKER_VERSION) {
    throw new Error("Account deletion recovery data uses a stale version.");
  }
  if (record.ownerClerkUserId !== expectedClerkUserId) {
    throw new Error("Account deletion recovery data belongs to another user.");
  }
  if (
    typeof record.requestId !== "string" ||
    record.requestId.trim() === "" ||
    record.state !== ACCOUNT_DELETION_MARKER_STATE ||
    typeof record.requestedAt !== "string" ||
    !isValidTimestamp(record.requestedAt)
  ) {
    throw new Error("Account deletion recovery data is corrupt.");
  }

  return {
    version: ACCOUNT_DELETION_MARKER_VERSION,
    ownerClerkUserId: expectedClerkUserId,
    requestId: record.requestId,
    state: ACCOUNT_DELETION_MARKER_STATE,
    requestedAt: record.requestedAt,
  };
}

/** Server status is authoritative; a local marker only makes recovery stricter. */
export function decideAccountDeletionGate(
  marker: AccountDeletionMarker | null,
  serverStatus: AccountDeletionServerStatus,
): AccountDeletionGateDecision {
  return marker || serverStatus !== "none" ? "require_settings" : "allow_app";
}

/**
 * A normal endpoint's 410 is an authoritative tombstone signal, but it does
 * not distinguish pending from completed. Surface a synthetic pending state
 * only to the same active owner until the status endpoint verifies the exact
 * durable state. A late response for owner A can therefore never gate owner B.
 */
export function resolveAccountDeletionGateStatus(
  serverStatus: AccountDeletionServerStatus,
  forcedOwnerClerkUserId: string | null,
  activeOwnerClerkUserId: string,
): AccountDeletionServerStatus {
  if (
    serverStatus === "none" &&
    forcedOwnerClerkUserId === activeOwnerClerkUserId
  ) {
    return "pending";
  }
  return serverStatus;
}

export function parseAccountDeletionServerStatus(
  value: unknown,
): AccountDeletionServerStatus {
  if (
    typeof value === "string" &&
    ACCOUNT_DELETION_SERVER_STATUSES.includes(
      value as AccountDeletionServerStatus,
    )
  ) {
    return value as AccountDeletionServerStatus;
  }
  throw new Error("The server returned an unknown account deletion status.");
}

function isValidTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}
