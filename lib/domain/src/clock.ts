/**
 * The current instant, injected so time-dependent rules stay deterministic in
 * tests. Rules take a Clock instead of calling `new Date()` themselves.
 */
export interface Clock {
  now(): Date;
}

/** The real system clock — the production default. */
export const systemClock: Clock = {
  now: () => new Date(),
};
