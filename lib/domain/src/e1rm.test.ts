import { describe, it, expect } from "vitest";
import { estimateOneRepMax } from "./e1rm";

describe("estimateOneRepMax", () => {
  it("returns the lifted weight at 1 rep for both formulas", () => {
    expect(estimateOneRepMax(100, 1, "epley")).toBe(100);
    expect(estimateOneRepMax(100, 1, "brzycki")).toBe(100);
  });

  it("computes Epley (the default)", () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
  });

  it("computes Brzycki, distinct from Epley away from 10 reps", () => {
    // Brzycki: 100 * 36 / (37 - 5) = 112.5 (Epley at 5 reps would be ~116.67).
    expect(estimateOneRepMax(100, 5, "brzycki")).toBe(112.5);
  });

  it("throws on non-positive or non-integer reps", () => {
    expect(() => estimateOneRepMax(100, 0)).toThrow(RangeError);
    expect(() => estimateOneRepMax(100, 2.5)).toThrow(RangeError);
  });

  it("throws for Brzycki at reps >= 37 (outside the formula domain)", () => {
    expect(() => estimateOneRepMax(100, 37, "brzycki")).toThrow(RangeError);
  });
});
