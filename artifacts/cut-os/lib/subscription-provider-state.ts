export type SubscriptionActionResult =
  "cancelled" | "entitled" | "pending" | "not_entitled";

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
