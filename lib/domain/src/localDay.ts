import type { Clock } from "./clock";

/**
 * The user-local calendar day for `instant`, as "YYYY-MM-DD", in the given IANA
 * time zone. Pure: the instant is supplied, never read from a clock.
 *
 * Assumes a validated IANA `timeZone` (validation is P1-5's job at the write
 * boundary). An unknown zone throws RangeError from Intl.
 */
export function localDayKey(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: "year" | "month" | "day"): string => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`missing ${type} in formatted date`);
    return part.value;
  };
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The user's current local day — localDayKey composed with an injected clock. */
export function todayKey(clock: Clock, timeZone: string): string {
  return localDayKey(clock.now(), timeZone);
}
