// Cache ONLY valid zones — a bounded, fixed-per-process set (~hundreds). Invalid
// inputs are deliberately NOT cached: they are caller-controlled and unbounded,
// so caching them would let a client grow this Map without limit. Re-probing an
// invalid zone is cheap.
const validZones = new Set<string>();

/**
 * Whether `timeZone` is a real IANA zone the runtime understands.
 *
 * Uses `Intl.DateTimeFormat`, which throws `RangeError` on an unknown zone but
 * accepts every valid one — including `UTC`/`Etc/UTC` and aliases, which
 * `Intl.supportedValuesOf("timeZone")` omits on some runtimes (Node v25). This
 * is the write-boundary guard for `users.timezone`, the key behind all future
 * user-local daily rollups.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (validZones.has(timeZone)) return true;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
    return false;
  }
  validZones.add(timeZone);
  return true;
}
