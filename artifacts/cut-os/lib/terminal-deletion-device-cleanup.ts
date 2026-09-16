import {
  accountDeletionKey,
  type AccountDeletionServerStatus,
} from "./account-deletion";
import { pendingMealCreateKey } from "./meal-create-intent";

export type TerminalDeletionCleanupResult =
  | { ok: true }
  | {
      ok: false;
      failedRecord: "pending_meal_recovery" | "account_deletion_marker";
    };

export const MINIMIZED_TERMINAL_DELETION_MEAL_MARKER =
  "cut_os.terminal_deletion_cleanup_required.v1";

export interface TerminalDeletionDeviceCleanupInput {
  ownerClerkUserId: string;
  deleteSecureItem: (key: string) => Promise<void>;
  setSecureItem: (key: string, value: string) => Promise<void>;
  onRecordsCleared: () => Promise<void>;
}

/** Keep a just-confirmed 204 terminal result scoped to the exact principal. */
export function isTerminalDeletionServerCompleted(
  serverStatus: AccountDeletionServerStatus,
  locallyConfirmedOwnerClerkUserId: string | null,
  activeOwnerClerkUserId: string | null | undefined,
): boolean {
  return (
    serverStatus === "completed" ||
    (typeof activeOwnerClerkUserId === "string" &&
      locallyConfirmedOwnerClerkUserId === activeOwnerClerkUserId)
  );
}

/**
 * Remove every owner-scoped device record before terminal sign-out. The meal
 * recovery record is removed first because it contains more account/nutrition
 * context than the minimal deletion marker. If that deletion fails, a
 * best-effort overwrite strips the record down to a non-sensitive cleanup
 * sentinel. A failed removal stops the flow; `onRecordsCleared` (which signs
 * out) is never called until both removals succeed. Re-running the function is
 * safe because SecureStore deletion is idempotent for a missing key.
 */
export async function finishTerminalDeletionDeviceCleanup(
  input: TerminalDeletionDeviceCleanupInput,
): Promise<TerminalDeletionCleanupResult> {
  const pendingMealKey = pendingMealCreateKey(input.ownerClerkUserId);
  try {
    await input.deleteSecureItem(pendingMealKey);
  } catch {
    try {
      await input.setSecureItem(
        pendingMealKey,
        MINIMIZED_TERMINAL_DELETION_MEAL_MARKER,
      );
    } catch {
      // Deletion still fails closed. The retry screen must remain available
      // even when SecureStore cannot overwrite the old value either.
    }
    return { ok: false, failedRecord: "pending_meal_recovery" };
  }

  try {
    await input.deleteSecureItem(accountDeletionKey(input.ownerClerkUserId));
  } catch {
    return { ok: false, failedRecord: "account_deletion_marker" };
  }

  await input.onRecordsCleared();
  return { ok: true };
}
