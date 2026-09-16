import { SubscriptionAdapterError } from "./subscription-adapter";
import {
  resolveServerSubscription,
  type ServerSubscriptionSnapshot,
} from "./subscription";

export type SubscriptionActionResult =
  "cancelled" | "entitled" | "pending" | "not_entitled";

export const POST_PURCHASE_CONFIRMATION_DELAYS_MS = [
  1_000, 2_000, 4_000, 8_000,
] as const;

export interface ProviderPrincipalToken {
  readonly owner: string;
  readonly generation: number;
}

/**
 * Synchronous principal guard for provider-owned async work. Activating B
 * invalidates every token captured for A before a late response can update
 * React state or the shared query cache.
 */
export class ProviderPrincipalGuard {
  private owner: string | null = null;
  private generation = 0;

  activate(owner: string): ProviderPrincipalToken {
    this.owner = owner;
    this.generation += 1;
    return { owner, generation: this.generation };
  }

  isCurrent(token: ProviderPrincipalToken): boolean {
    return this.owner === token.owner && this.generation === token.generation;
  }

  deactivate(token: ProviderPrincipalToken): void {
    if (!this.isCurrent(token)) return;
    this.owner = null;
    this.generation += 1;
  }
}

export async function confirmServerSubscriptionRefresh<
  TStatus extends ServerSubscriptionSnapshot,
>({
  owner,
  token,
  guard,
  refresh,
  commit,
}: {
  owner: string;
  token: ProviderPrincipalToken | null;
  guard: ProviderPrincipalGuard;
  refresh: () => Promise<TStatus>;
  commit: (owner: string, status: TStatus) => void;
}): Promise<TStatus> {
  if (!token || token.owner !== owner || !guard.isCurrent(token)) {
    throw new SubscriptionAdapterError("principal_changed");
  }

  const status = await refresh();

  // A response captured for principal A must never write after B becomes the
  // current principal, even though the query client is shared app-wide.
  if (!guard.isCurrent(token)) {
    throw new SubscriptionAdapterError("principal_changed");
  }
  if (resolveServerSubscription(status, false).state !== "ready") {
    throw new SubscriptionAdapterError("unavailable");
  }

  commit(owner, status);
  return status;
}

function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Reconciles a completed StoreKit action with the server-authoritative
 * RevenueCat entitlement. RevenueCat webhooks can arrive shortly after the
 * device receives an active entitlement, so that specific state gets a small,
 * bounded retry window. Local store state never grants access by itself.
 *
 * A restore with no local Pro entitlement performs exactly one server check:
 * this still recovers a server-confirmed entitlement without making a user who
 * owns nothing wait through the propagation window.
 */
export async function confirmSubscriptionAfterStoreAction<
  TStatus extends ServerSubscriptionSnapshot,
>({
  localHasProEntitlement,
  confirm,
  wait = waitFor,
  retryDelaysMs = POST_PURCHASE_CONFIRMATION_DELAYS_MS,
}: {
  localHasProEntitlement: boolean;
  confirm: () => Promise<TStatus>;
  wait?: (milliseconds: number) => Promise<void>;
  retryDelaysMs?: readonly number[];
}): Promise<TStatus | null> {
  let lastStatus: TStatus | null = null;
  const delays = localHasProEntitlement ? [0, ...retryDelaysMs] : [0];

  for (const delay of delays) {
    if (delay > 0) await wait(delay);

    try {
      const status = await confirm();
      lastStatus = status;
      if (status.entitled || !localHasProEntitlement) return status;
    } catch (error) {
      if (
        error instanceof SubscriptionAdapterError &&
        error.code === "principal_changed"
      ) {
        throw error;
      }
      if (!localHasProEntitlement) return null;
    }
  }

  return lastStatus;
}

export function resolveAccessRecheck(
  serverEntitled: boolean,
): "entitled" | "pending" {
  return serverEntitled ? "entitled" : "pending";
}

export function resolvePurchaseVerification(
  serverEntitled: boolean | null,
): SubscriptionActionResult {
  return serverEntitled === true ? "entitled" : "pending";
}

export function resolveRestoreVerification({
  localHasProEntitlement,
  serverEntitled,
}: {
  localHasProEntitlement: boolean;
  /** Null means the immediate server confirmation was unavailable. */
  serverEntitled: boolean | null;
}): SubscriptionActionResult {
  if (serverEntitled === true) return "entitled";
  if (serverEntitled === null || localHasProEntitlement) return "pending";
  return "not_entitled";
}

export interface SubscriptionInteractionLock {
  current: boolean;
}

export interface SignOutFeedback {
  setBusy(value: boolean): void;
  setError(value: string | null): void;
}

/** Shared paywall interaction used by the visible Sign out control. */
export async function runSubscriptionSignOut(
  lock: SubscriptionInteractionLock,
  signOut: () => void | Promise<void>,
): Promise<"signed_out" | "ignored"> {
  if (lock.current) return "ignored";
  lock.current = true;
  try {
    await signOut();
    return "signed_out";
  } finally {
    lock.current = false;
  }
}

/**
 * Drives a visible Sign out interaction without allowing duplicate requests or
 * leaving a rejected auth promise unhandled by a press callback.
 */
export async function runSignOutWithFeedback(
  lock: SubscriptionInteractionLock,
  signOut: () => void | Promise<void>,
  feedback: SignOutFeedback,
  failureMessage: string,
): Promise<"signed_out" | "failed" | "ignored"> {
  if (lock.current) return "ignored";

  feedback.setError(null);
  feedback.setBusy(true);
  try {
    await runSubscriptionSignOut(lock, signOut);
    return "signed_out";
  } catch {
    feedback.setError(failureMessage);
    return "failed";
  } finally {
    feedback.setBusy(false);
  }
}
