# ADR 003 — Adult eligibility

**Status:** Accepted engineering design; owner-approved product policy

**Date:** August 3, 2026

**Policy version:** `adult-18-v1`

## Context

CUT OS provides cut, weight, nutrition, and training guidance. The owner has
approved an adults-only policy: a person must be at least 18 years old before
the app exposes private profile collection, guidance, logging, or purchases.
The former optional birth-year profile field was not an age gate and must not be
used to qualify an account.

The App Store age rating is separate. It supports storefront disclosure and
parental controls; it does not establish the authenticated account's age and is
not authorization for CUT OS private APIs.

## Decision

### Evidence and calculation

- The eligibility request contains a full calendar date of birth in strict
  `YYYY-MM-DD` form, the current policy version, and an explicit adult
  attestation. The request is a self-declaration, not identity or document
  verification.
- The server is the only eligibility authority. It validates the date and
  decides against the current **UTC calendar date** from an injected clock.
- A person is eligible when their 18th calendar birthday has arrived. For a
  February 29 birth in a non-leap 18th year, `adult-18-v1` uses March 1. This
  conservative rule is deterministic and tested, but its suitability across
  launch jurisdictions still requires qualified legal review.
- A future date, impossible date, malformed value, or missing value is invalid;
  it never produces an eligible decision.

### Data minimization

- Full date of birth is transient request data. It may exist only in client
  form memory, transport memory, and server request memory long enough to make
  the decision.
- Raw date of birth is never written to PostgreSQL, SecureStore, AsyncStorage,
  TanStack Query, analytics, crash reports, application logs, URLs, Clerk
  metadata, or API responses.
- Request-body logging is prohibited. Errors must not echo the submitted date.
- The server stores only these user-linked fields:
  - status: `unverified`, `eligible`, or `ineligible`;
  - policy version: `adult-18-v1` for a completed decision;
  - decision timestamp.
- Legacy optional birth year is not evidence, is not promoted into an
  eligibility result, and does not grandfather an account. The migration drops
  the legacy profile column and clears the local user email copy. Email is
  restored from the Clerk claim only after an eligible decision; unverified and
  ineligible rows retain no local email.

### State and authorization

- New and migrated accounts begin `unverified`. Every existing account must
  complete the current policy check before private product access resumes.
- `eligible` means only that a self-declared date satisfied `adult-18-v1`; UI,
  logs, policies, and review notes must not call the account "age verified."
- An `eligible` decision is current only when its policy version equals the
  active server policy. A missing decision fails closed as `unverified`; a stale
  eligible version is exposed to the client as `review_required` and receives
  the same `428` private-API block. `review_required` is not a stored database
  status. The permanent `ineligible` rule below remains `403` unless a future
  approved policy and migration explicitly replace it.
- The first valid server decision is monotonic for that Clerk identity under
  v1. An `ineligible` identity cannot correct or resubmit DOB in the app. The
  restricted screen offers Settings/account deletion and sign out. If the person
  later becomes 18, they must delete that identity/account and create a new
  account; this support-sensitive behavior requires explicit legal/support
  review before public launch.
- Normal private APIs return `428 Precondition Required` for `unverified` or a
  stale policy decision and `403 Forbidden` for `ineligible`.
- Adult authorization applies to profile read/write, Today/Next Action, weight,
  meals, nutrition/training guidance, and any future trial, paywall, purchase,
  or entitlement activation.
- The server allowlist remains available so a restricted account is not
  trapped: eligibility status and (only while unverified) submission,
  account-deletion status, and account deletion. The native restricted Settings
  surface and sign out remain reachable. Public health checks remain public.
  Public Terms, Privacy, and Support links must be added to that restricted
  surface before launch; they are not private-API authorization.
- Onboarding completion never substitutes for eligibility. Private guidance
  requires a current `eligible` decision even if a legacy account already has
  `onboardingComplete = true`.

### Native behavior

- After authentication, the app resolves authoritative server eligibility
  before mounting or querying private product screens. Unknown, offline, and
  malformed responses fail closed without rendering cached health data.
- `unverified` sees the adult-eligibility flow. `ineligible` sees an adults-only
  stop screen with only the allowlisted account/legal/support actions. Neither
  state sees guidance or a purchase path.
- A clear adults-18-and-older notice and local precheck may appear before Clerk
  sign-up to reduce unnecessary minor account creation. It is defense in depth,
  not authorization, and any DOB entered there follows the same no-storage and
  no-logging rule.
- Query state and any in-memory date field are cleared on decision, sign-out,
  account switch, unmount, and terminal deletion.

## Consequences

- CUT OS stores substantially less age data than a design that retains date of
  birth, but it cannot automatically recalculate an ineligible account on a
  future birthday. Under v1, the identity remains ineligible; later adult access
  requires deletion and creation of a new identity/account.
- Self-declaration can be falsified. Whether this assurance level is sufficient
  in each launch jurisdiction is a legal/product launch decision, not an
  engineering claim.
- A future policy change uses a new policy version and causes stale eligible
  accounts to fail closed for recheck rather than silently applying new rules.
  Changing permanent ineligibility requires a separately approved policy and
  migration.
- The App Store questionnaire and higher-age override must describe the shipped
  binary truthfully but do not replace this server-side control.

## Release gates outside this ADR

- Qualified counsel must approve Terms/EULA and Privacy Policy wording,
  notice-at-collection, retention, underage-account handling, launch
  jurisdictions, sufficiency of self-declared age assurance, and permanent
  per-identity ineligibility/new-account behavior. Support must approve the
  corresponding help and escalation process.
- The App Store owner must answer the then-current questionnaire truthfully and,
  once the Terms/EULA minimum is 18, apply the required higher-age override to
  18+ (or the applicable regional equivalent).
- Native bypass, offline, shared-device, deletion, and account-switch scenarios
  must pass on the release build.
- Qualified nutrition/health and legal review of product content and claims
  remains required. Adults-only distribution does not remove that obligation.

## References

- [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- [Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
