export const DEFAULT_ACCOUNT_DELETION_RETRY_INTERVAL_MS = 60_000;
export const MIN_ACCOUNT_DELETION_RETRY_INTERVAL_MS = 1_000;
export const MAX_ACCOUNT_DELETION_RETRY_INTERVAL_MS = 5 * 60_000;

export function isValidAccountDeletionRetryInterval(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= MIN_ACCOUNT_DELETION_RETRY_INTERVAL_MS &&
    value <= MAX_ACCOUNT_DELETION_RETRY_INTERVAL_MS
  );
}

/**
 * Resolve the optional environment override without accepting whitespace,
 * fractions, unsafe integers, or values outside the timer's operating bound.
 * An omitted value uses the documented one-minute default.
 */
export function parseAccountDeletionRetryInterval(
  value: string | undefined,
): number | null {
  if (value === undefined) {
    return DEFAULT_ACCOUNT_DELETION_RETRY_INTERVAL_MS;
  }
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) return null;

  const parsed = Number(value);
  return isValidAccountDeletionRetryInterval(parsed) ? parsed : null;
}
