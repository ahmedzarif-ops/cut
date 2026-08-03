export type NextActionKind =
  "complete_onboarding" | "weigh_in" | "first_meal" | "review_meals";

export interface NextAction {
  kind: NextActionKind;
  title: string;
  detail: string;
}

export interface NextActionInput {
  onboardingComplete: boolean;
  hasWeightToday: boolean;
  hasMealToday: boolean;
}

/**
 * The first deterministic Today rule. It is intentionally small: the queue
 * will grow as food, training, closeout, and weekly-review states land.
 */
export function selectNextAction(input: NextActionInput): NextAction {
  if (!input.onboardingComplete) {
    return {
      kind: "complete_onboarding",
      title: "Build your cut plan",
      detail: "Set your goal and baseline so CUT OS can guide the day.",
    };
  }

  if (!input.hasWeightToday) {
    return {
      kind: "weigh_in",
      title: "Log your morning weigh-in",
      detail:
        "Use the same conditions each day. CUT OS follows the trend, not one number.",
    };
  }

  if (!input.hasMealToday) {
    return {
      kind: "first_meal",
      title: "Build your first balanced meal",
      detail:
        "Start with a protein anchor, then add produce and a measured carb or fat.",
    };
  }

  return {
    kind: "review_meals",
    title: "Review today’s meals",
    detail:
      "See what you’ve logged. Add another meal only when it fits your needs.",
  };
}
