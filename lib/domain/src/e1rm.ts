export type E1rmFormula = "epley" | "brzycki";

/**
 * Estimated one-rep max (kg) from a submaximal set. Pure.
 * Epley:   w * (1 + reps/30)
 * Brzycki: w * 36 / (37 - reps)   (undefined at reps >= 37)
 * Both agree that a 1-rep set is itself the 1RM.
 */
export function estimateOneRepMax(
  weightKg: number,
  reps: number,
  formula: E1rmFormula = "epley",
): number {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError(
      `weightKg must be a non-negative finite number, got ${weightKg}`,
    );
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new RangeError(`reps must be a positive integer, got ${reps}`);
  }
  if (reps === 1) return weightKg;
  if (formula === "epley") return weightKg * (1 + reps / 30);
  if (reps >= 37) {
    throw new RangeError(`brzycki is undefined for reps >= 37, got ${reps}`);
  }
  return (weightKg * 36) / (37 - reps);
}
