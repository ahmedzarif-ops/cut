import { describe, expect, it } from "vitest";

import { selectNextAction } from "./nextAction";

describe("selectNextAction", () => {
  it("starts with onboarding when the plan is incomplete", () => {
    expect(
      selectNextAction({
        onboardingComplete: false,
        hasWeightToday: false,
        hasMealToday: false,
      }),
    ).toEqual({
      kind: "complete_onboarding",
      title: "Set up your profile",
      detail:
        "Add your profile details to finish setup and start your daily check-in.",
    });
  });

  it("asks for today's weigh-in after onboarding", () => {
    const action = selectNextAction({
      onboardingComplete: true,
      hasWeightToday: false,
      hasMealToday: false,
    });

    expect(action.kind).toBe("weigh_in");
    expect(`${action.title} ${action.detail}`.toLowerCase()).not.toContain(
      "trend",
    );
  });

  it("advances immediately after the weigh-in exists", () => {
    expect(
      selectNextAction({
        onboardingComplete: true,
        hasWeightToday: true,
        hasMealToday: false,
      }),
    ).toEqual({
      kind: "first_meal",
      title: "Build your first balanced meal",
      detail:
        "Choose a fixed recipe and review its ingredients, portions, and estimates before logging.",
    });
  });

  it("keeps onboarding and weigh-in ahead of an existing meal", () => {
    expect(
      selectNextAction({
        onboardingComplete: false,
        hasWeightToday: false,
        hasMealToday: true,
      }).kind,
    ).toBe("complete_onboarding");
    expect(
      selectNextAction({
        onboardingComplete: true,
        hasWeightToday: false,
        hasMealToday: true,
      }).kind,
    ).toBe("weigh_in");
  });

  it("switches to a neutral review after one meal is logged today", () => {
    const action = selectNextAction({
      onboardingComplete: true,
      hasWeightToday: true,
      hasMealToday: true,
    });

    expect(action).toEqual({
      kind: "review_meals",
      title: "Review today’s meals",
      detail:
        "See what you’ve logged, add another meal, or review today’s totals.",
    });
    expect(`${action.title} ${action.detail}`.toLowerCase()).not.toContain(
      "next meal",
    );
  });
});
