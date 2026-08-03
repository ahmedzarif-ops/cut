import { describe, expect, it } from "vitest";

import { selectNextAction } from "./nextAction";

describe("selectNextAction", () => {
  it("starts with onboarding when the plan is incomplete", () => {
    expect(
      selectNextAction({ onboardingComplete: false, hasWeightToday: false })
        .kind,
    ).toBe("complete_onboarding");
  });

  it("asks for today's weigh-in after onboarding", () => {
    expect(
      selectNextAction({ onboardingComplete: true, hasWeightToday: false })
        .kind,
    ).toBe("weigh_in");
  });

  it("advances immediately after the weigh-in exists", () => {
    expect(
      selectNextAction({ onboardingComplete: true, hasWeightToday: true }).kind,
    ).toBe("first_meal");
  });
});
