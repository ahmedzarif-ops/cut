# Onboarding self-redirect recovery — September 7, 2026

## Observed failure

Owner recording `ScreenRecording_09-07-2026 14-30-03_1.MP4` shows
“Securing your account…” at about 00:07, followed by a blank dark app surface
at sampled times 00:10, 00:15, 00:20, 00:25, 00:30 and 00:32.
This is not evidence of a font-loading failure or a confirmed native crash.

## Reproduced code defect

Baseline `1dcc3025d6bd5a90ea9138a8d7ecfcb5870530da` classifies
`/onboarding` as a core route. For `onboardingComplete=false`, its subscription
boundary renders a Redirect to `/onboarding` instead of mounting AppStack.
Executing the baseline policy with its original path classification produced:

| Path | Decision |
| --- | --- |
| `/today` | `redirect_onboarding` |
| `/onboarding` | `redirect_onboarding` |

This self-redirect prevents the onboarding form from mounting.

## Local correction

- Explicitly classify onboarding as its own route.
- Allow that route for incomplete and complete profiles (profile editing).
- Preserve core onboarding requirements and all authentication, age, deletion,
  and paid-feature checks.
- Add regression coverage for startup-to-onboarding-to-dashboard decisions,
  grouped route paths, profile editing, free, paid and loading subscriptions.

## Verification so far

- App suite: 40 files, 472 tests passed.
- TypeScript: passed.
- `git diff --check`: passed.
- Native iOS Release compilation with production public settings: succeeded.
- Unsigned simulator launch encountered Clerk keychain error OSStatus -34018;
  it did NOT validate signed-in onboarding or dashboard behavior.

- Rebuilt using Xcode-managed simulator signing; Release build succeeded and
  the app launched to the real production "Welcome back" sign-in form.
- The selected iPhone 17 Pro simulator has no active production session.
  Owner sign-in is required to validate onboarding and the dashboard.

Signed-in native verification is still pending. Do not describe the phone issue
as resolved solely from the policy tests or successful compilation. No new
TestFlight upload or production deployment is evidenced by this document.
