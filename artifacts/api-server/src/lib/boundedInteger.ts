export interface BoundedIntegerOptions {
  minimum: number;
  maximum: number;
  defaultValue: number;
}

export const API_RATE_LIMIT_MAXIMUM = 10_000;
export const CLERK_RATE_LIMIT_MAXIMUM = 1_000;

/**
 * Parses a canonical base-10 integer inside an explicit safety range. An
 * absent value receives the trusted default; malformed overrides fail closed.
 */
export function parseBoundedInteger(
  value: string | undefined,
  { minimum, maximum, defaultValue }: BoundedIntegerOptions,
): number | null {
  if (value === undefined) return defaultValue;
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}
