import { describe, expect, it } from "vitest";

import {
  MAX_MEAL_SERVINGS,
  MIN_MEAL_SERVINGS,
  clampMealServings,
  formatMealServings,
  isMealCreatePreconditionFailed,
  scaleMealNutrition,
} from "../meal-form";

describe("clampMealServings", () => {
  it("clamps values to the API range", () => {
    expect(clampMealServings(0)).toBe(MIN_MEAL_SERVINGS);
    expect(clampMealServings(8)).toBe(MAX_MEAL_SERVINGS);
  });

  it("snaps values to quarter-serving increments", () => {
    expect(clampMealServings(1.12)).toBe(1);
    expect(clampMealServings(1.13)).toBe(1.25);
  });

  it("falls back safely for a non-finite value", () => {
    expect(clampMealServings(Number.NaN)).toBe(1);
  });
});

describe("isMealCreatePreconditionFailed", () => {
  it("recognizes stale preconditions without misclassifying conflicts", () => {
    expect(isMealCreatePreconditionFailed({ status: 412 })).toBe(true);
    expect(isMealCreatePreconditionFailed({ status: 409 })).toBe(false);
    expect(isMealCreatePreconditionFailed({ status: 503 })).toBe(false);
    expect(isMealCreatePreconditionFailed(new Error("offline"))).toBe(false);
    expect(isMealCreatePreconditionFailed(null)).toBe(false);
  });
});

describe("scaleMealNutrition", () => {
  const nutrition = {
    caloriesKcal: 620,
    proteinG: 82,
    carbsG: 35,
    fatG: 18,
    fiberG: 7,
  };

  it("scales every nutrition value for the selected serving", () => {
    expect(scaleMealNutrition(nutrition, 1.5)).toEqual({
      caloriesKcal: 930,
      proteinG: 123,
      carbsG: 52.5,
      fatG: 27,
      fiberG: 10.5,
    });
  });

  it("rounds calories to whole numbers and macros to one decimal", () => {
    expect(scaleMealNutrition(nutrition, 0.25)).toEqual({
      caloriesKcal: 155,
      proteinG: 20.5,
      carbsG: 8.8,
      fatG: 4.5,
      fiberG: 1.8,
    });
  });
});

describe("formatMealServings", () => {
  it("uses compact, readable serving labels", () => {
    expect(formatMealServings(1)).toBe("1×");
    expect(formatMealServings(1.25)).toBe("1.25×");
    expect(formatMealServings(1.5)).toBe("1.5×");
  });
});
