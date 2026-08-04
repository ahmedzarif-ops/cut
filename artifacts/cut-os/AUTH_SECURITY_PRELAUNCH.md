# Authentication security prelaunch requirement

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
