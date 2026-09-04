export const SIGN_UP_TERMS_ASSENT_COPY =
  "I agree to the Terms of Use and acknowledge the Privacy Policy." as const;

interface SignUpSubmissionState {
  emailAddress: string;
  password: string;
  adultConfirmed: boolean;
  termsAssented: boolean;
  busy: boolean;
}

export function isSignUpSubmissionDisabled({
  emailAddress,
  password,
  adultConfirmed,
  termsAssented,
  busy,
}: SignUpSubmissionState): boolean {
  return (
    !emailAddress.trim() ||
    !password ||
    !adultConfirmed ||
    !termsAssented ||
    busy
  );
}
