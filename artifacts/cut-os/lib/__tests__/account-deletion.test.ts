import { describe, expect, it } from "vitest";

import {
  accountDeletionKey,
  createAccountDeletionMarker,
  decideAccountDeletionGate,
  parseAccountDeletionMarker,
  parseAccountDeletionServerStatus,
  resolveAccountDeletionGateStatus,
  serializeAccountDeletionMarker,
} from "../account-deletion";

const owner = "user_2abc-123";
const marker = createAccountDeletionMarker(
  owner,
  "018f4d7e-54f0-7c74-9d6e-28fa18c34ad1",
  "2026-08-03T14:30:00.000Z",
);

describe("accountDeletionKey", () => {
  it("creates a stable, SecureStore-safe key for each Clerk user", () => {
    const key = accountDeletionKey("user_2abc-123");
    expect(key).toBe(accountDeletionKey("user_2abc-123"));
    expect(key).toMatch(/^[\w.-]+$/);
  });

  it("does not collide for distinct IDs containing punctuation", () => {
    expect(accountDeletionKey("user/a")).not.toBe(
      accountDeletionKey("user_2f_a"),
    );
  });

  it("rejects an empty user ID", () => {
    expect(() => accountDeletionKey("   ")).toThrow(/user ID/i);
  });
});

describe("account deletion marker", () => {
  it("round-trips a versioned owner-scoped record", () => {
    expect(
      parseAccountDeletionMarker(serializeAccountDeletionMarker(marker), owner),
    ).toEqual(marker);
    expect(parseAccountDeletionMarker(null, owner)).toBeNull();
  });

  it("fails closed for corrupt JSON", () => {
    expect(() => parseAccountDeletionMarker("{", owner)).toThrow(/corrupt/i);
  });

  it("fails closed for a stale schema version", () => {
    expect(() =>
      parseAccountDeletionMarker(
        JSON.stringify({ ...marker, version: 1 }),
        owner,
      ),
    ).toThrow(/stale/i);
  });

  it("fails closed when a record belongs to another principal", () => {
    expect(() =>
      parseAccountDeletionMarker(
        serializeAccountDeletionMarker(marker),
        "user_other",
      ),
    ).toThrow(/another user/i);
  });

  it("fails closed for malformed fields", () => {
    expect(() =>
      parseAccountDeletionMarker(
        JSON.stringify({ ...marker, requestedAt: "yesterday" }),
        owner,
      ),
    ).toThrow(/corrupt/i);
  });

  it("rejects invalid marker inputs", () => {
    expect(() =>
      createAccountDeletionMarker(owner, "", marker.requestedAt),
    ).toThrow(/request ID/i);
    expect(() =>
      createAccountDeletionMarker(owner, marker.requestId, "not-a-date"),
    ).toThrow(/timestamp/i);
  });
});

describe("decideAccountDeletionGate", () => {
  it("allows the app only when both authorities report no deletion", () => {
    expect(decideAccountDeletionGate(null, "none")).toBe("allow_app");
  });

  it("routes every local or server recovery state to Settings", () => {
    expect(decideAccountDeletionGate(marker, "none")).toBe("require_settings");
    expect(decideAccountDeletionGate(null, "pending")).toBe("require_settings");
    expect(decideAccountDeletionGate(null, "completed")).toBe(
      "require_settings",
    );
  });

  it("fails closed for an unknown server status", () => {
    expect(() => parseAccountDeletionServerStatus("queued_forever")).toThrow(
      /unknown account deletion status/i,
    );
  });
});

describe("resolveAccountDeletionGateStatus", () => {
  it("forces only the owner that received a 410 into recovery", () => {
    expect(resolveAccountDeletionGateStatus("none", owner, owner)).toBe(
      "pending",
    );
    expect(resolveAccountDeletionGateStatus("none", owner, "user_other")).toBe(
      "none",
    );
  });

  it("never downgrades a verified durable server status", () => {
    expect(resolveAccountDeletionGateStatus("pending", owner, owner)).toBe(
      "pending",
    );
    expect(resolveAccountDeletionGateStatus("completed", owner, owner)).toBe(
      "completed",
    );
  });
});
