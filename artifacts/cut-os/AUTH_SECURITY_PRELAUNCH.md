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

## Password-reset account-enumeration timing

**Release gate:** Public launch must remain blocked until a supported recovery
option is selected and production-tenant verification evidence is recorded.

The mobile password-reset screen intentionally shows the same generic message
for an unknown email, a delivery failure, and a successful request. However,
the current direct Clerk client flow can still take measurably different time:
an accepted identifier performs the additional email-code delivery operation.

This is a prelaunch security and privacy limitation. A client-side delay is not
a security boundary and must not be represented as fixing account enumeration.
Before public launch, either use a Clerk-supported hosted or prebuilt recovery
path with verified enumeration controls, or obtain a Clerk-supported
server/proxy architecture for this use case. Do not build against an
undocumented password-reset initiation endpoint.

Validate the chosen recovery path against the production Clerk tenant. It must:

- always return the same generic public response;
- enforce and verify rate limits without exposing whether an account exists;
- normalize the externally observable response envelope for accepted and
  rejected identifiers;
- log abuse signals without recording raw reset codes or passwords; and
- be covered by tests for response and timing parity, rate limits, and provider
  failures.

Until the release gate is satisfied, keep the client response generic and do
not expose provider error details or account-existence outcomes in UI, logs, or
analytics.
