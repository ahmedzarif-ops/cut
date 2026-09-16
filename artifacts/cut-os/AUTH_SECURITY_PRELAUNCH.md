# Authentication security prelaunch requirement

## New-device and email second-factor continuation

The Clerk development tenant has Client Trust enabled, so a valid password can
still require an email code when the user signs in from a new device. CUT now
handles both Clerk's `needs_client_trust` and `needs_second_factor` statuses when
the tenant offers an email-code second factor. The flow sends and verifies the
code through Clerk's MFA namespace, supports resend and restart, and fails
closed for every unsupported factor or unknown status.

No privileged Clerk key is embedded in the mobile app. Production release still
requires exact-build evidence that password sign-in, a new-device email code,
resend, an invalid or expired code, restart, and final session activation work
against the production tenant. Do not disable Client Trust merely to bypass
that verification.

## App Review fixed-code access window

CUT has no social/OAuth sign-in path and must not register a guessed
`cut-os://` Clerk callback. The production instance still requires Native API
and the iOS application registration for `com.zarifahmed.cut`.

Clerk documents two separate facts: Client Trust can require `email_code` on a
new device, and production test mode makes reserved `+clerk_test` addresses use
the fixed verification code `424242` without delivering an email. Clerk labels
production test mode **highly discouraged** and does not explicitly guarantee
the combined Client Trust/test-mode behavior on one documentation page. CUT
therefore treats the combination as an exact-build fact to prove, not an
assumption or a mobile-app bypass.

For an `app_review` evidence target, the controlled release record must prove
that production test mode is enabled only for the active review window, Client
Trust remains enabled, all five synthetic review accounts use reserved test
addresses, `424242` completes the Client Trust email-code flow from a new
physical device, and the fixed-code instruction is present in App Review Notes.
For `public_release`, the record must instead prove that production test mode is
disabled while Client Trust remains enabled. Never ship a Clerk Testing Token,
secret-key session endpoint, hardcoded account, or client-side authentication
bypass.

Official provider references:

- https://clerk.com/docs/guides/secure/client-trust
- https://clerk.com/docs/guides/development/testing/test-emails-and-phones
- https://clerk.com/docs/guides/development/deployment/production

## Password recovery and account-enumeration protection

### Selected App Store architecture

The iOS and Android recovery route now uses Clerk's documented custom
email-code password-reset sequence through CUT's verified same-origin proxy:

- implementation: `app/(auth)/forgot-password.tsx`;
- proxy binding: `app/_layout.tsx` passes the validated proxy URL to
  `ClerkProvider`;
- bounded provider operations: `lib/auth-flow.ts`; and
- regression boundary: `lib/__tests__/password-recovery-native.test.ts` plus
  `lib/__tests__/auth-flow.test.ts`.

There is deliberately no `forgot-password.native.tsx` override. Expo native
resolution therefore uses the common JavaScript screen instead of Clerk's beta
native `AuthView`, whose direct Frontend API host failed TLS while CUT's proxy
remained healthy. This is the selected
`clerk_supported_server_or_proxy_recovery` architecture. It uses Clerk's
official `useSignIn` reset-password methods and cannot transfer into sign-up or
bypass CUT's separate adult/Terms sign-up route.

Official provider references:

- https://clerk.com/docs/guides/development/custom-flows/authentication/forgot-password
- https://clerk.com/docs/guides/secure/user-enumeration-protection

**Provider-support verification — August 10, 2026; reviewer: Codex
release-readiness audit.** Clerk's current official custom-flow guide includes
the Expo `useSignIn` implementation and the same `sendCode`, `verifyCode`, and
`submitPassword` sequence CUT uses, including the option to sign out other
sessions. Clerk's security guide states that Strict user-enumeration protection
hides whether accounts exist. This verifies the selected provider-supported
architecture only. Owner approval, independent security review,
production-tenant behavior, and exact signed-device evidence remain pending.

The public Expo web route uses Clerk's prebuilt web `<SignIn />`, sets
`transferable={false}`, and explicitly pins `signUpUrl="/sign-up"`. Live testing
of CUT's locked Clerk SDK showed that `withSignUp={false}` alone does not remove
the component's footer sign-up link. The explicit URL keeps that link on CUT's
separately tested adult-confirmation and Terms-assent route instead of Clerk's
hosted sign-up page. Release QA must verify this destination in the exact web
build; do not infer it from `withSignUp` or `transferable`.

### Protections implemented in code

- The native recovery route calls only Clerk's supported client SDK operations;
  it contains no CUT reset endpoint, raw provider-error rendering, sign-up
  transfer, or recovery-event logging.
- The request step shows the same generic notice regardless of whether Clerk
  accepted the identifier. Code and password failures are bounded user-action
  errors without provider response bodies.
- Native and Expo web Clerk Frontend API traffic is routed through CUT's
  bounded Clerk proxy. The per-IP proxy limiter returns one generic 429
  envelope.
- A proxy throttle records only the fixed
  `clerk_frontend_api_rate_limited` security event. The request logger collapses
  every dynamic Clerk path to `/api/__clerk`, so sign-in attempt IDs, email
  identifiers, reset codes, passwords, headers, bodies, and provider errors are
  not written by CUT's abuse signal.
- Proxy timeouts, upstream failures, and oversized responses return the same
  bounded `Authentication service unavailable` envelope without relaying a
  partial Clerk response.

These app and web-edge controls preserve safe CUT-owned logging, but they do not
replace Clerk's provider-side protections. A client-side delay is not a
security boundary and must never be represented as fixing account enumeration.

### Dashboard-only release requirement

**Public launch remains blocked** until the production Clerk instance is
configured at **Attack protection → User enumeration protection → Strict**.
This is a provider setting; application code and unit tests cannot enable or
prove it. Also enable the Native API and register the production iOS app before
building the exact TestFlight candidate.

Clerk documents that Strict protection hides whether identifiers match an
account and that its rate limits return HTTP 429 with `Retry-After`. The public
documentation does not make an exact password-recovery timing-parity guarantee,
so production-tenant verification is still required rather than inferred.

Record sanitized exact-build evidence for all of the following:

- Strict enumeration protection is enabled in the production tenant;
- known and unknown controlled identifiers receive the same visible recovery
  progression and generic public copy;
- externally observable response envelopes and aggregate timing distributions
  pass the approved parity protocol;
- provider rate limits do not reveal account existence and recovery remains
  usable after the documented retry window;
- delivery/provider failures remain generic and recoverable; and
- the proxy abuse signal contains only the fixed event name and no raw reset
  codes, passwords, email identifiers, Clerk resource IDs, or provider errors.

The executable, credential-safe procedure and evidence schema are defined in
`AUTH_SECURITY_PRODUCTION_QA_PROTOCOL.md`. That protocol is intentionally
fail-closed and still requires independent security-reviewer approval before
the exact TestFlight run.

Source inspection, TypeScript, unit tests, and an unsigned simulator are
insufficient. The exact signed TestFlight candidate must pass the proxy-backed
custom recovery flow on a physical iPhone, including the Get help entry point,
known/unknown identifier parity, resend/rate-limit behavior, provider failure,
invalid/expired code, new-password submission, session synchronization back to
Expo, and confirmation that no sign-up transfer appears.

Do not store test identifiers, reset codes, passwords, response bodies, raw
per-identifier timings, provider credentials, or unsanitized log exports in the
repository.
