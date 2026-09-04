# Product rules

All **deterministic product rules** live in `lib/domain` (`@workspace/domain`):
pure, I/O-free functions with an injected clock/timezone. Examples today:
`localDayKey`/`todayKey` (user-local calendar day for daily rollups) and
`estimateOneRepMax`. The first live Today rule is `selectNextAction`, which
operates only after the server has established current adult eligibility, then
advances from onboarding to the daily weigh-in and first balanced meal, followed
by a neutral review of today’s logged meals after a successful log. Nutrition
scaling, summing, and the general balanced-meal score also live here. Weight
conversion stays shared so the database remains metric while the client honors
the user's display units.

## Daily weigh-in invariant

- One row per `users.id` + user-local `recorded_on` day.
- The server derives the day from the validated IANA timezone; the client does
  not choose the canonical day.
- A repeated save updates the existing row and returns the same ID.
- All history queries scope by the authenticated internal user ID.
- Weight is stored in kilograms; pounds are presentation only.
- Today's Next Action is recalculated from authoritative server state after a
  successful save.

## Balanced-meal invariant

- The client submits `mealTemplateId`, `servings`, a generated
  `clientRequestId`, and the `catalogVersion` and `dayKey` it reviewed. It never
  supplies canonical nutrition.
- The server derives the authoritative local day from the authenticated user's
  validated IANA timezone. A new request whose echoed day or catalog version is
  stale receives `412` before insertion; changed estimates are never submitted
  automatically.
- Existing idempotency keys are resolved before current-day/current-catalog
  checks. An identical retry after midnight or a catalog release returns its
  original snapshot; a reused key with a different day, catalog version,
  template, or serving amount returns `409`.
- Per-serving nutrition is snapshotted. Catalog edits cannot rewrite history.
- `(user_id, client_request_id)` is unique. The native app persists that exact
  owner-scoped request in SecureStore before sending and uses the captured
  Clerk session token for any recovery replay. Normal selection, editing, and
  deletion controls remain disabled until an uncertain create is reconciled.
- Serving edits and deletes are explicit endpoints and always scope by both
  entry ID and the authenticated internal user ID.
- Delete is retry-safe and consumes the original request UUID in a user-owned
  opaque tombstone. A late create replay receives `412` instead of recreating a
  meal that another request or device already removed; the tombstone contains
  no template, serving, or nutrition values and cascades with account deletion.
- Calories, protein, carbohydrates, fat, and fiber totals are calculated from
  saved snapshots, not values supplied by the mobile preview.
- The first catalog ranking is general and transparent. It must not be called
  allergy-safe or personalized until authoritative preferences/targets, hard
  exclusions, disclosures, and safety tests exist.
- Every ingredient/allergen list and nutrition value is an estimate presented
  for user review; it is not a medical or allergen-safety guarantee.
- A production catalog deployment must drain old API replicas and run one
  catalog version at a time. Mixed-version write replicas are not an approved
  deployment mode for the current handshake.

## Account-deletion invariant

- The durable identity-hash tombstone is checked before normal JIT user
  provisioning. A still-authenticated pending/completed identity receives `410`
  from normal APIs; a Clerk-invalidated session may receive `401`. Neither can
  recreate an active internal account.
- `GET /me/account-deletion` and `DELETE /me` authenticate the external Clerk
  identity without provisioning a `users` row.
- Deletion is staged in PostgreSQL before the server calls Clerk. `204` means
  Clerk deletion is terminal and the internal user row plus cascade-linked
  profile, weight, and meal rows have been removed.
- Clerk or final-database failure leaves a durable pending request. An
  idempotent request and a bounded worker retry it; neither a device marker nor
  a client response is deletion authority.
- Completed requests remove the raw Clerk ID. The identity hash, status,
  timestamps, and minimal attempt metadata remain, subject to a pre-launch
  retention policy.
- The SecureStore marker is versioned and owner-scoped. A marker for person A
  must never initiate deletion for person B on a shared device.
- Terminal deletion clears both that deletion marker and the same owner's
  pending meal-create intent before sign-out, in addition to clearing shared
  query data.
- Private screens remain gated until local and server deletion status is known,
  and shared query state is cleared before a different Clerk principal renders.

## Adult-eligibility invariant

- The owner-approved product policy is adults 18 and older, versioned as
  `adult-18-v1`. `ADR_003_ADULT_ELIGIBILITY.md` is the decision record.
- The client submits a full DOB only for the current decision. The server
  validates strict `YYYY-MM-DD` input and compares the 18th calendar birthday
  to the server's injected **UTC** date. A February 29 birth reaches 18 on March
  1 in a non-leap 18th year under this policy.
- Raw DOB is transient. It must never be stored, logged, cached, included in a
  URL or response, attached to Clerk, or sent to analytics/crash reporting.
- The user record stores only `unverified`, `eligible`, or `ineligible`, the
  decision's policy version, and decision timestamp. `eligible` means a
  self-declared DOB passed the rule; it is not identity or document verification.
- A valid server decision is monotonic for the Clerk identity under v1.
  `ineligible` cannot correct or retry DOB in app. The restricted screen offers
  Settings/account deletion and sign out; later adult access requires deleting
  that identity/account and creating a new account. Legal and Support must
  approve this behavior and its user-facing instructions before launch.
- A new user or existing user migrated from the pre-policy system fails closed
  as `unverified`; a stale eligible policy version is exposed as
  `review_required` and receives the same `428` block. A permanent ineligible
  identity remains `403` unless a future approved policy/migration changes it.
  Legacy optional birth year is deleted, not promoted into eligibility evidence.
- The server is the authorization authority. Normal private APIs return `428`
  for unverified/stale policy state and `403` for ineligible state. This covers
  profiles, Today/Next Action, weights, meals, nutrition/training guidance, and
  all future paywall, trial, purchase, and entitlement activation paths.
- The server allowlist remains usable: eligibility status and unverified
  submission, deletion status, and account deletion. Restricted Settings and
  sign out remain reachable in the native app. Public Terms, Privacy, and
  Support links are still a pre-launch restricted-screen requirement. A signup
  notice/local precheck may reduce minor account creation but never substitutes
  for the server gate.
- The native app resolves eligibility before mounting/querying private screens,
  fails closed offline, hides private cached data, and clears transient DOB and
  account-scoped state on decision, sign-out, principal change, and deletion.

## Remaining public-launch safety gates

- Terms/Privacy wording, notice and retention, underage-account handling,
  launch jurisdictions, and the sufficiency of this self-declared assurance
  require qualified legal/privacy review. The App Store rating/questionnaire is
  a separate storefront control and must match, not replace, server enforcement.
- Every public meal template needs a reproducible recipe with ingredient
  quantities and yield, nutrition source/methodology, allergen substantiation,
  qualified reviewer, and review date. Estimated copy and a package-label
  reminder do not replace that review.

The seam, top to bottom:

- **`lib/domain`** — pure rules. No `db`, no `express`, no `new Date()` inside a
  rule (time enters via an injected `Clock`). Unit-tested with fixed inputs.
- **`api-server/src/services`** — I/O orchestration. Reads/writes via the
  `@workspace/db` `db` proxy and calls `lib/domain`. `userService` is the
  exemplar.
- **routes / RN screens** — thin. Auth, request/response validation, status
  codes, navigation. They call services; they never embed rule logic and never
  touch `db` directly.

When you add a rule (next-action, streaks, macro completion, e1RM progression),
it goes in `lib/domain` with tests — never inline in a route or screen (build
spec §29). The first Phase 2 consumer of `localDayKey` will be the streak /
Today-aggregate service.

## Server hardening invariants

These keep the API server correct and stable under load; don't undo them
while touching auth, `db`, or the Express app.

- **Normal private access is lookup-only; eligibility owns first provisioning.**
  `requireAuth` first performs a durable deletion-tombstone lookup, then selects
  on `clerk_user_id`. A missing row receives `428`; it is never created by a
  normal private request. The special adult-eligibility status route also never
  creates a row. Only the decision transaction may insert one minimal row, using
  `onConflictDoNothing` plus a row lock/re-select so concurrent decisions have a
  single monotonic winner. A returning private request costs a tombstone lookup
  plus user lookup and zero writes. `updated_at` means "last settings/profile,
  eligibility/email, or deletion-state change," not "last seen." `requireAuth`
  attaches the resolved eligible row as `req.user`; `GET /me` returns it directly.
- **Onboarding completion is atomic and requires current adult eligibility plus
  a profile.** `upsertProfile` (`userService.ts`) may write the profile row and
  flip `users.onboardingComplete` true in ONE transaction only for a user whose
  stored status is `eligible` under the active `adult-18-v1` policy. The flag,
  profile existence, and eligibility precondition cannot disagree — a partial
  failure rolls the profile/onboarding write back.
  The flag is therefore not a client-settable bit: `PATCH /me` may CONFIRM
  `onboardingComplete: true` only when a profile already exists (else `400`) and
  rejects `false` outright — un-onboarding is not a settings operation, and
  refusing it also removes any check-then-act window against a concurrent
  profile write (P1-4). The only way the flag turns on is an adult-authorized
  `PUT /me/profile`, which sets it atomically; don't reintroduce a client- or
  route-level path that sets it independently of the profile write or bypasses
  the active eligibility-policy check. A legacy true flag never bypasses adult
  authorization.
- **The pg pool has a budget and an error handler.** `poolConfig()`
  (`lib/db`) caps pool size via `PG_POOL_MAX` (default 5) — conservative for
  a single autoscale instance against a pooled endpoint — and the pool
  registers an `'error'` listener so a dropped idle connection logs and gets
  evicted instead of crashing the process as an unhandled error. Point
  `DATABASE_URL` at the provider's pooled endpoint (e.g. PgBouncer/Neon
  pooler) in production, not a direct connection. On shutdown, `createShutdownHandler`
  drains in-flight requests (`server.close`), then closes the pool, then
  exits; `SIGTERM`/`SIGINT` both trigger it. A hard timeout
  (`SHUTDOWN_TIMEOUT_MS`, default 10s) forces a non-zero exit if draining
  hangs, so the platform's kill grace period isn't wasted.
- **`/api` is IP-rate-limited; `/api/__clerk` more strictly so.**
  `createApiLimiter` (`API_RATE_LIMIT`, default 100/min) is mounted ahead of
  `clerkMiddleware` and every route, so an unauthenticated flood is throttled
  before it can consume Clerk JWT-verification work or reach `requireAuth`. `createClerkLimiter` (`CLERK_RATE_LIMIT`, default
  30/min) guards the unauthenticated Clerk FAPI proxy specifically.
  `app.set("trust proxy", 1)` is required for both — it's what makes `req.ip`
  the real client IP behind the single edge proxy hop, not the proxy's own
  address. The Clerk proxy strips incoming `Forwarded`, `X-Real-IP`, and
  `X-Forwarded-For` claims, then forwards only that single Express-derived IP
  when the runtime trust-proxy setting is exactly the audited one-hop value.
  The rate-limit store is in-memory and **per-instance**: limits reset per
  process and are not globally enforced. Production startup requires the
  operator to set `API_MAX_INSTANCES` to the platform's real maximum and only
  accepts `1`; a missing/invalid value fails as `API_MAX_INSTANCES`, while any
  larger topology fails as `SHARED_RATE_LIMIT_STORE`. This is a launch-only
  single-instance control. Increasing the platform maximum requires a real
  shared-store integration and tests first; naming a store in an environment
  variable does not bypass this gate.
- **`helmet` is mounted on `/api` with CSP disabled** — this is a JSON API,
  not an HTML surface, so a content-security-policy is meaningless; helmet's
  other defaults (`nosniff`, HSTS, `X-Frame-Options`, no-referrer) still
  apply.
- **Clerk host resolution is allowlist-only.** `x-forwarded-host` is
  client-writable, so `getClerkProxyHost` only ever returns a hostname
  present in the shared allowlist (`lib/allowedHosts.ts`) — a spoofed header
  value never reaches `publishableKeyFromHost` or the `Clerk-Proxy-Url`
  header. Production requires `CORS_ALLOWED_ORIGINS` to contain exactly one
  canonical public `https://<host>` origin. Provider-injected
  `REPLIT_DEV_DOMAIN`, `REPLIT_EXPO_DEV_DOMAIN`, and `REPLIT_DOMAINS` values
  cannot expand that trust boundary; they remain development conveniences
  only. An unknown or missing host falls back to `CLERK_PUBLISHABLE_KEY`
  (bypassing `publishableKeyFromHost`, which throws on an empty host with a
  live key), and the proxy sends no `Clerk-Proxy-Url` at all.

**Deferred (not built here):**

- Ongoing email refresh via a Clerk `user.updated` webhook or approved token
  template. The adult-eligibility migration clears every local email. A
  successful eligible decision may restore/update it from the Clerk session
  claim; unverified/ineligible rows retain null, and ordinary later logins do
  not refresh it.
- A shared rate-limit store, to make `API_RATE_LIMIT`/`CLERK_RATE_LIMIT`
  correct before increasing `API_MAX_INSTANCES` above one.
- An approved retention/cleanup policy for completed identity tombstones and
  database backups, plus a documented deletion-completion expectation.
- Production monitoring and alerts for pending deletion age, retry counts, and
  worker failures, with an owner-approved manual reconciliation procedure.
