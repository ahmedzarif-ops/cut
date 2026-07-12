const memo = new Map<string, boolean>();

/**
 * Whether `timeZone` is a real IANA zone the runtime understands.
 *
 * Uses `Intl.DateTimeFormat`, which throws `RangeError` on an unknown zone but
 * accepts every valid one — including `UTC`/`Etc/UTC` and aliases, which
 * `Intl.supportedValuesOf("timeZone")` omits on some runtimes (Node v25). This
 * is the write-boundary guard for `users.timezone`, the key behind all future
 * user-local daily rollups. Results are memoized (the zone set is fixed per
 * process).
 */
export function isValidTimeZone(timeZone: string): boolean {
  const cached = memo.get(timeZone);
  if (cached !== undefined) return cached;
  let valid: boolean;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    valid = true;
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
    valid = false;
  }
  memo.set(timeZone, valid);
  return valid;
}
