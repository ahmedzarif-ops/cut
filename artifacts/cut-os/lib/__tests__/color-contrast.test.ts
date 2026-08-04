import { describe, expect, it } from "vitest";

import colors from "../../constants/colors";
import { contrastRatio } from "../color-contrast";

describe("CUT OS semantic color contrast", () => {
  it("meets WCAG AA normal-text contrast on action and status surfaces", () => {
    for (const palette of [colors.dark, colors.light]) {
      expect(
        contrastRatio(palette.primary, palette.primaryForeground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(palette.destructive, palette.destructiveForeground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(palette.success, palette.successForeground),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("meets WCAG AA for destructive text on app and card surfaces", () => {
    for (const palette of [colors.dark, colors.light]) {
      expect(
        contrastRatio(palette.destructiveText, palette.background),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(palette.destructiveText, palette.card),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("calculates the known black-on-white ratio", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });
});
