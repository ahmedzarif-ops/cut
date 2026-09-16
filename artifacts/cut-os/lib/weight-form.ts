/** Detect a stale reviewed Today snapshot without depending on a client class. */
export function isWeightEntryPreconditionFailed(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 412
  );
}

export function shouldResetReviewedWeightDay(input: {
  priorAuthoritativeDayKey: string | null;
  currentAuthoritativeDayKey: string | null;
  reviewedDayKey: string | null;
}): boolean {
  if (!input.currentAuthoritativeDayKey) return false;
  return Boolean(
    (input.priorAuthoritativeDayKey &&
      input.priorAuthoritativeDayKey !== input.currentAuthoritativeDayKey) ||
      (input.reviewedDayKey &&
        input.reviewedDayKey !== input.currentAuthoritativeDayKey),
  );
}
