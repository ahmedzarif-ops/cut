import { describe, expect, it } from "vitest";

import {
  kilogramsToPounds,
  poundsToKilograms,
  roundWeight,
} from "./weightUnits";

describe("weight unit conversion", () => {
  it("round-trips pounds and kilograms", () => {
    expect(poundsToKilograms(kilogramsToPounds(95.25))).toBeCloseTo(95.25, 8);
  });

  it("formats a stable one-decimal display value", () => {
    expect(roundWeight(kilogramsToPounds(95.25))).toBe(210);
  });
});
