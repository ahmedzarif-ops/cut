import { describe, expect, it, vi } from "vitest";

import { accountDeletionKey } from "../account-deletion";
import { pendingMealCreateKey } from "../meal-create-intent";
import {
  finishTerminalDeletionDeviceCleanup,
  isTerminalDeletionServerCompleted,
  MINIMIZED_TERMINAL_DELETION_MEAL_MARKER,
} from "../terminal-deletion-device-cleanup";

const owner = "user_2abc-123";

describe("isTerminalDeletionServerCompleted", () => {
  it("preserves an authoritative server completion", () => {
    expect(isTerminalDeletionServerCompleted("completed", null, owner)).toBe(
      true,
    );
  });

  it("preserves a just-confirmed terminal response only for its owner", () => {
    expect(isTerminalDeletionServerCompleted("none", owner, owner)).toBe(true);
    expect(isTerminalDeletionServerCompleted("none", owner, "user_other")).toBe(
      false,
    );
    expect(isTerminalDeletionServerCompleted("none", owner, null)).toBe(false);
  });
});

describe("finishTerminalDeletionDeviceCleanup", () => {
  it("removes sensitive meal recovery before the minimal deletion marker, then finishes", async () => {
    const mealKey = pendingMealCreateKey(owner);
    const deletionKey = accountDeletionKey(owner);
    const retained = new Set([mealKey, deletionKey]);
    const deleteSecureItem = vi.fn(async (key: string) => {
      retained.delete(key);
    });
    const setSecureItem = vi.fn(async () => undefined);
    const onRecordsCleared = vi.fn(async () => undefined);

    await expect(
      finishTerminalDeletionDeviceCleanup({
        ownerClerkUserId: owner,
        deleteSecureItem,
        setSecureItem,
        onRecordsCleared,
      }),
    ).resolves.toEqual({ ok: true });

    expect(deleteSecureItem.mock.calls.map(([key]) => key)).toEqual([
      mealKey,
      deletionKey,
    ]);
    expect(retained.size).toBe(0);
    expect(setSecureItem).not.toHaveBeenCalled();
    expect(onRecordsCleared).toHaveBeenCalledOnce();
  });

  it("minimizes meal recovery and fails closed when its removal fails", async () => {
    const mealKey = pendingMealCreateKey(owner);
    const retained = new Map([[mealKey, "private meal recovery fields"]]);
    const deleteSecureItem = vi.fn(async () => {
      throw new Error("keychain unavailable");
    });
    const setSecureItem = vi.fn(async (key: string, value: string) => {
      retained.set(key, value);
    });
    const onRecordsCleared = vi.fn(async () => undefined);

    await expect(
      finishTerminalDeletionDeviceCleanup({
        ownerClerkUserId: owner,
        deleteSecureItem,
        setSecureItem,
        onRecordsCleared,
      }),
    ).resolves.toEqual({
      ok: false,
      failedRecord: "pending_meal_recovery",
    });

    expect(deleteSecureItem).toHaveBeenCalledOnce();
    expect(retained.get(mealKey)).toBe(MINIMIZED_TERMINAL_DELETION_MEAL_MARKER);
    expect(onRecordsCleared).not.toHaveBeenCalled();
  });

  it("still fails closed when SecureStore cannot minimize the meal record", async () => {
    const deleteSecureItem = vi.fn(async () => {
      throw new Error("delete unavailable");
    });
    const setSecureItem = vi.fn(async () => {
      throw new Error("overwrite unavailable");
    });
    const onRecordsCleared = vi.fn(async () => undefined);

    await expect(
      finishTerminalDeletionDeviceCleanup({
        ownerClerkUserId: owner,
        deleteSecureItem,
        setSecureItem,
        onRecordsCleared,
      }),
    ).resolves.toEqual({
      ok: false,
      failedRecord: "pending_meal_recovery",
    });

    expect(setSecureItem).toHaveBeenCalledOnce();
    expect(onRecordsCleared).not.toHaveBeenCalled();
  });

  it("leaves only the minimal deletion marker when its removal fails", async () => {
    const mealKey = pendingMealCreateKey(owner);
    const deletionKey = accountDeletionKey(owner);
    const retained = new Set([mealKey, deletionKey]);
    const deleteSecureItem = vi.fn(async (key: string) => {
      if (key === deletionKey) throw new Error("keychain unavailable");
      retained.delete(key);
    });
    const setSecureItem = vi.fn(async () => undefined);
    const onRecordsCleared = vi.fn(async () => undefined);

    await expect(
      finishTerminalDeletionDeviceCleanup({
        ownerClerkUserId: owner,
        deleteSecureItem,
        setSecureItem,
        onRecordsCleared,
      }),
    ).resolves.toEqual({
      ok: false,
      failedRecord: "account_deletion_marker",
    });

    expect(retained).toEqual(new Set([deletionKey]));
    expect(onRecordsCleared).not.toHaveBeenCalled();
  });

  it("retries idempotently and finishes only after a transient cleanup failure clears", async () => {
    const deletionKey = accountDeletionKey(owner);
    let rejectDeletionMarker = true;
    const deleteSecureItem = vi.fn(async (key: string) => {
      if (key === deletionKey && rejectDeletionMarker) {
        throw new Error("keychain unavailable");
      }
    });
    const setSecureItem = vi.fn(async () => undefined);
    const onRecordsCleared = vi.fn(async () => undefined);
    const input = {
      ownerClerkUserId: owner,
      deleteSecureItem,
      setSecureItem,
      onRecordsCleared,
    };

    await expect(finishTerminalDeletionDeviceCleanup(input)).resolves.toEqual({
      ok: false,
      failedRecord: "account_deletion_marker",
    });
    expect(onRecordsCleared).not.toHaveBeenCalled();

    rejectDeletionMarker = false;
    await expect(finishTerminalDeletionDeviceCleanup(input)).resolves.toEqual({
      ok: true,
    });
    expect(onRecordsCleared).toHaveBeenCalledOnce();
  });

  it("keeps a post-cleanup sign-out failure retryable after both records are gone", async () => {
    const deleteSecureItem = vi.fn(async () => undefined);
    const setSecureItem = vi.fn(async () => undefined);
    const onRecordsCleared = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("sign-out unavailable"))
      .mockResolvedValueOnce(undefined);
    const input = {
      ownerClerkUserId: owner,
      deleteSecureItem,
      setSecureItem,
      onRecordsCleared,
    };

    await expect(finishTerminalDeletionDeviceCleanup(input)).rejects.toThrow(
      /sign-out unavailable/i,
    );
    expect(deleteSecureItem).toHaveBeenCalledTimes(2);

    await expect(finishTerminalDeletionDeviceCleanup(input)).resolves.toEqual({
      ok: true,
    });
    expect(deleteSecureItem).toHaveBeenCalledTimes(4);
    expect(onRecordsCleared).toHaveBeenCalledTimes(2);
  });
});
