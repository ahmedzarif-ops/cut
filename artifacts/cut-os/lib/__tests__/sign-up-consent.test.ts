import { describe, expect, it } from "vitest";

import {
  isSignUpSubmissionDisabled,
  SIGN_UP_TERMS_ASSENT_COPY,
} from "../sign-up-consent";

const completeSubmission = {
  emailAddress: "adult@example.com",
  password: "strong-password",
  adultConfirmed: true,
  termsAssented: true,
  busy: false,
};

describe("sign-up consent", () => {
  it("uses separate, neutral Terms assent and Privacy acknowledgment copy", () => {
    expect(SIGN_UP_TERMS_ASSENT_COPY).toBe(
      "I agree to the Terms of Use and acknowledge the Privacy Policy.",
    );
  });

  it("enables submission only when age and Terms requirements are both met", () => {
    expect(isSignUpSubmissionDisabled(completeSubmission)).toBe(false);
    expect(
      isSignUpSubmissionDisabled({
        ...completeSubmission,
        adultConfirmed: false,
      }),
    ).toBe(true);
    expect(
      isSignUpSubmissionDisabled({
        ...completeSubmission,
        termsAssented: false,
      }),
    ).toBe(true);
    expect(
      isSignUpSubmissionDisabled({
        ...completeSubmission,
        adultConfirmed: false,
        termsAssented: false,
      }),
    ).toBe(true);
  });

  it.each([
    ["blank email", { emailAddress: "   " }],
    ["blank password", { password: "" }],
    ["busy request", { busy: true }],
  ])("preserves the existing %s submission guard", (_name, override) => {
    expect(
      isSignUpSubmissionDisabled({ ...completeSubmission, ...override }),
    ).toBe(true);
  });
});
