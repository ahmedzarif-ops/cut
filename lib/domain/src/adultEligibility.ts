import { systemClock, type Clock } from "./clock";

export const ADULT_ELIGIBILITY_POLICY_VERSION = "adult-18-v1";
export const ADULT_ELIGIBILITY_MINIMUM_AGE = 18;

export type AdultEligibilityEvaluation =
  | { status: "eligible" }
  | { status: "ineligible" }
  | { status: "invalid"; reason: "invalid_date" | "future_date" };

const CANONICAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function utcDate(year: number, month: number, day: number): Date {
  const value = new Date(0);
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCFullYear(year, month - 1, day);
  return value;
}

function parseCanonicalDate(
  value: string,
): { year: number; month: number; day: number; instant: Date } | null {
  const match = CANONICAL_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const instant = utcDate(year, month, day);
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, instant };
}

/**
 * Evaluate the approved 18+ policy using only the server's injected UTC date.
 *
 * The submitted birth date is deliberately transient: this pure rule returns
 * only a decision and never includes the date in its result. A February 29
 * birthday reaches the threshold on March 1 in a non-leap threshold year.
 */
export function evaluateAdultEligibility(
  dateOfBirth: string,
  clock: Clock = systemClock,
): AdultEligibilityEvaluation {
  const birthDate = parseCanonicalDate(dateOfBirth);
  if (!birthDate) return { status: "invalid", reason: "invalid_date" };

  const now = clock.now();
  const today = utcDate(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
  );
  if (birthDate.instant.getTime() > today.getTime()) {
    return { status: "invalid", reason: "future_date" };
  }

  const thresholdYear = birthDate.year + ADULT_ELIGIBILITY_MINIMUM_AGE;
  const movesLeapBirthdayToMarch =
    birthDate.month === 2 && birthDate.day === 29 && !isLeapYear(thresholdYear);
  const thresholdMonth = movesLeapBirthdayToMarch ? 3 : birthDate.month;
  const thresholdDay = movesLeapBirthdayToMarch ? 1 : birthDate.day;
  const eligibleOn = utcDate(thresholdYear, thresholdMonth, thresholdDay);

  return today.getTime() >= eligibleOn.getTime()
    ? { status: "eligible" }
    : { status: "ineligible" };
}
