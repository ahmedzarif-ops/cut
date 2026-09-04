import { describe, expect, it } from "vitest";

import { resolveMealScreenState } from "../meal-screen-state";

const baseState = {
  hasPendingIntent: false,
  mealsLoading: false,
  mealsError: false,
  catalogLoading: false,
  catalogError: false,
  optionCount: 3,
  hasLoggedMeals: true,
};

describe("meal screen state", () => {
  it.each([
    ["loading", { catalogLoading: true }],
    ["error", { catalogError: true }],
    ["empty", { optionCount: 0 }],
  ] as const)(
    "keeps logged meals visible when the option catalog is %s",
    (catalogState, override) => {
      expect(resolveMealScreenState({ ...baseState, ...override })).toEqual({
        blockingState: null,
        catalogState,
        showLoggedMeals: true,
      });
    },
  );

  it("blocks on the authoritative logged-meal query when no recovery is pending", () => {
    expect(
      resolveMealScreenState({ ...baseState, mealsLoading: true }),
    ).toMatchObject({ blockingState: "loading", showLoggedMeals: false });
    expect(
      resolveMealScreenState({ ...baseState, mealsError: true }),
    ).toMatchObject({ blockingState: "error", showLoggedMeals: false });
  });

  it("does not hide pending safe meal recovery behind query failures", () => {
    expect(
      resolveMealScreenState({
        ...baseState,
        hasPendingIntent: true,
        mealsError: true,
        catalogError: true,
      }),
    ).toMatchObject({ blockingState: null, catalogState: "error" });
  });
});
