# CUT OS — Architecture

> Spec references: `attached_assets/Pasted--CUT-OS-REPLIT-NATIVE-MOBILE-BUILD-SPEC-*.txt` (build spec)
> and `attached_assets/Pasted--CUT-OS-PUBLIC-GTM-1M-YEAR-1-REVENUE-CHANGE-ORDER-*.txt` (public GTM change order).
> This document records what is actually built — not aspirations. See
> `WORK_STATUS.md` for the latest verification checkpoint.

## System overview

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│ artifacts/cut-os            │  HTTPS │ artifacts/api-server         │
│ React Native + Expo SDK 54  │──────▶ │ Express 5 (TypeScript, esm)  │
│ expo-router, TanStack Query │  /api  │ Clerk auth, Drizzle ORM      │
│ Clerk Expo (@clerk/expo)    │        │        │                     │
└─────────────────────────────┘        └────────┼─────────────────────┘
                                                ▼
                                       PostgreSQL (Replit-provisioned)
                                       lib/db — Drizzle schema + migrations
```

- **Mobile client** (`artifacts/cut-os`): a genuine native React Native app
  (Expo SDK 54, RN 0.81, New Architecture enabled). It is configured for the
  Replit iOS simulator and Expo Go; current native verification status is in
  `QA_REPORT.md`. Development may explicitly run `build:preview` to produce the
  legacy Expo-updates-protocol preview bundle (iOS + Android JS bundles and
  manifests). The Replit production artifact instead validates and runs the
  source-controlled, zero-JavaScript launch/legal server without building or
  serving Expo preview assets. Native release bundles are built through EAS;
  `react-native-web` exists only for Expo's development preview.
- **API server** (`artifacts/api-server`): Express 5, bundled with esbuild to
  a single ESM file. Exposed through the Replit workspace proxy under `/api`.
- **Database**: PostgreSQL via Drizzle ORM. `lib/db` owns the schema and the
  committed migrations (`lib/db/migrations`). The database is the source of
  truth for domain data. The client caches server responses via TanStack Query
  and stores only Clerk session material plus two versioned, owner-scoped
  SecureStore records: an account-deletion recovery marker and a pending
  meal-create intent used to resolve an uncertain write safely after app exit.

## Auth decision (spec §5.4)

**Chosen: Clerk** (`@clerk/express` + `@clerk/expo`), not Replit Auth.

The original build did not record its reasoning (this file did not exist —
a Phase 0 gate miss found in audit). What the code shows: Clerk is the
Replit-supported managed-auth fallback the spec names for the case where
Replit Auth doesn't fit the native artifact (spec §5.4), and the
implementation matches that fallback path end to end (Expo token cache,
bearer tokens, server-side session verification, Frontend-API proxy).
Email/password + email-code verification are enabled. No passwords are
hand-rolled. If Replit Auth was actually evaluated and rejected for another
reason, record it here.

Flow:

1. The Expo app authenticates with Clerk (`@clerk/expo`) and stores session
   material in the Clerk token cache (SecureStore-backed).
2. Every generated API call attaches `Authorization: Bearer <session JWT>`
   via the auth-token getter registered in `app/(app)/_layout.tsx`
   (see `.agents/memory/clerk-expo-token-getter.md` for the defensive
   timeout/catch rationale).
3. `clerkMiddleware` on the server verifies the JWT. Special deletion and adult
   eligibility routes authenticate the Clerk identity without normal private
   access or automatic user provisioning. Eligibility status lookup does not
   create a row; the decision route may create one minimal `users` row.
4. `requireAuth` (`src/middlewares/requireAuth.ts`) checks the durable deletion
   tombstone first, returns `410` for a pending/completed identity, and performs
   a lookup-only resolution of the internal user. A missing row returns `428`;
   normal private endpoints never JIT-provision an unverified user.
5. The eligibility status/submission route remains available after auth. A full
   DOB is accepted only as transient request data; the server applies the
   injected-clock UTC `adult-18-v1` rule and persists only
   `unverified`/`eligible`/`ineligible`, policy version, and decision timestamp.
   Raw DOB is never stored, logged, cached, returned, or written to Clerk.
   The public status projection uses `review_required` for an eligible row whose
   stored policy version is stale; it is not a database status.
6. The first valid decision is monotonic for the Clerk identity under v1. An
   ineligible person may open restricted Settings, sign out, or delete the
   account, but cannot correct/retry DOB. Later adult access requires deleting
   that identity/account and creating a new account.
7. Adult authorization runs after authentication/deletion guards and before
   private handlers. It returns `428` for an unverified/stale eligible policy
   decision and `403` for ineligible. Eligibility status/submission and account
   deletion status/deletion are the restricted server allowlist; native
   restricted Settings and sign-out remain reachable. Terms/Privacy/Support
   controls are implemented in normal and restricted paths; owner-approved
   public destinations and native verification remain pre-launch requirements.
8. The native layout resolves deletion and eligibility state before private
   screens or queries mount. Offline/unknown state fails closed and cannot show
   cached health data. A pre-signup notice/local precheck, if present, is only
   data-minimization defense in depth.
9. In production, the Clerk Frontend API is reached through a same-origin
   proxy mounted at `/api/__clerk` (`clerkProxyMiddleware.ts`) so custom
   domains work without CNAME setup. The release validator and runtime require
   its exact HTTPS URL whenever a live Clerk publishable key is embedded.

**Identity rule:** every user-owned domain table references `users.id`
(internal uuid), never the raw Clerk id — dev and prod Clerk instances issue
different ids for the same person. No client-supplied user id is ever trusted;
domain queries scope by `req.userId` resolved server-side. The sole coordination
exception is `account_deletion_requests`: it temporarily stores the raw Clerk ID
while deletion is pending, nulls it at completion, and retains a SHA-256
identity tombstone under a retention policy that must be approved before launch.

## Data flow and source-of-truth rules

- OpenAPI (`lib/api-spec/openapi.yaml`) is the API contract source of truth.
  Orval generates both the typed react-query client (`lib/api-client-react`)
  and the server-side Zod validators (`lib/api-zod`). Regenerate with
  `pnpm --filter @workspace/api-spec run codegen`.
- The server validates all inputs with generated Zod schemas and parses its own
  responses through them before sending. Thin route/service checks enforce
  integer-only fields and strict meal-object keys that the current generator
  does not emit from OpenAPI automatically.
- OpenAPI declares bearer authentication globally and explicitly exempts only
  the public health check. The native transport refuses to attach authorization
  until a relative API path resolves to the configured matching HTTPS origin.
- `ADR_003_ADULT_ELIGIBILITY.md` defines the adults-only authorization boundary.
  The server, not navigation or `onboardingComplete`, owns the decision. A full
  DOB is consumed in memory and excluded from responses; every legacy account
  begins the active policy as `unverified` regardless of birth year or prior
  onboarding state. The migration drops the legacy profile birth-year column
  and clears local user email; only a later eligible decision repopulates email
  from the Clerk claim.
- `PUT /api/me/profile` is a **full replace**: omitted optional fields reset
  to null/defaults. The client therefore always seeds the edit form from the
  existing profile (`artifacts/cut-os/lib/profile-form.ts` — unit tested).
- Display units (`users.units`) are a presentation concern; storage is always
  metric (kg/cm).
- Curated meal nutrition and the canonical calendar day are server-owned. Each
  daily request carries a validated request-scoped device IANA timezone; this
  lets two devices use different local days without racing on one mutable
  account setting. Responses are `no-store` and vary by that header. The client
  echoes the `dayKey` and `catalogVersion` it reviewed alongside a stable
  template ID, servings, and an idempotency UUID. The server rejects a new
  stale-day or stale-catalog request with `412`; it never accepts calories or
  macros from the client. An identical request UUID is resolved before the
  current-day/version checks so an uncertain retry can still return its
  original historical snapshot after midnight or a catalog release.

## Database schema

- `users` — internal identity: `clerk_user_id` (unique), `email`, `timezone`
  (IANA account preference synchronized for continuity; request-scoped device
  context is authoritative for daily keys), `units`,
  `onboarding_complete`, `deletion_status` (`active` or `pending`), adult
  eligibility status (`unverified`, `eligible`, or `ineligible`), eligibility
  policy version, and eligibility decision timestamp. New and migrated rows
  default to `unverified`; policy-version mismatch also fails closed.
- `profiles` — one row per user (unique FK, cascade delete). Paid v1 accepts and
  returns only display name, goal, and start/goal weight. Older sex, height,
  target-date, activity, and training-experience columns remain neutral for
  schema compatibility, but the API rejects those inputs and migration
  `0010_minimize_v1_profile.sql` clears legacy user-supplied values. The adult-
  eligibility migration deletes the legacy birth-year column rather than
  promote it into evidence. The transient full DOB is not a database column.
- `weight_entries` — one canonical weigh-in per internal user and user-local
  calendar day. The `(user_id, recorded_on)` unique index makes repeated taps
  an update, not a duplicate. The write must echo the Today `dayKey`; a stale
  midnight/travel retry is rejected before writing. Physical values are stored
  in kilograms and converted only for display.
- `meal_entries` — user-owned logged meals with the server-validated local day,
  catalog version, a per-user client-request idempotency key, template copy,
  serving amount, and per-serving nutrition snapshot. Historical totals
  therefore do not drift if the versioned catalog changes. The user foreign
  key cascades on deletion; all entry reads and mutations also scope by the
  authenticated internal user.
- `meal_entry_deletion_tombstones` — a user-owned set of consumed meal request
  UUIDs. It stores no template, serving, or nutrition values. A scoped DELETE
  inserts the key and removes the meal in one transaction, making deletion
  repeatable and preventing a delayed create retry from resurrecting the row.
  The user foreign key cascades on account deletion.
- `account_deletion_requests` — durable deletion coordination independent of
  `users`, keyed by a SHA-256 external-identity hash. It stores the raw Clerk ID
  only while pending plus status, timestamps, attempt count, and a sanitized
  error code. Completion nulls the raw ID while the tombstone survives the user
  cascade to prevent JIT reprovisioning. Database checks enforce the lowercase
  64-character hash and the pending/completed cross-field lifecycle; a composite
  index prioritizes never-attempted and oldest retry work.

Meal nutrition columns have both nonnegative and finite-value checks, so direct
database writes cannot persist PostgreSQL `NaN` or infinity values that JSON
validation would never represent.

**Migrations** live in `lib/db/migrations` (generated by `drizzle-kit
generate`, applied with `drizzle-kit migrate`). `drizzle-kit push` remains
available for rapid development only; production schema changes must go
through generated migrations. The api-server test suite rebuilds its test
database from the committed migrations, so schema/migration drift fails CI.

## Where future logic must live (spec §28)

Deterministic product rules live in `lib/domain`. The active Next Action rule is
available only after current adult eligibility, then onboarding → daily
weigh-in → first balanced meal → neutral review of today’s logged meals. The
same package owns the UTC `adult-18-v1` date rule (including March 1 for a
February 29 birth in a non-leap 18th year), versioned 35-food and 18-meal
launch catalogs, nutrition scaling/summing, and transparent general ranking.
PostgreSQL mirrors the reviewed catalog for runtime queries under ADR 006 while
the domain source remains its audited input. Future daily status, streak,
adaptive-review, and personalized fits-today rules follow the same boundary:

- Pure rule logic belongs in a dedicated workspace package (e.g.
  `lib/domain`) with unit tests using injected/frozen time — not inline in
  route handlers or screens (spec §29 forbids duplicating rule logic across
  client and server without shared tested code).
- The server remains the owner of authorization, canonical values, duplicate
  protection, and source-of-truth calculations (spec §5.5).

## Balanced-meal decision

`ADR_001_BALANCED_MEALS.md` records the launch design. Templates live in the
versioned domain catalog while logged rows retain immutable copy and nutrition
snapshots. The first ranking considers protein, fiber, and a practical calorie
range only. It is explicitly not allergy-safe or medically personalized;
ingredients, template-listed common allergens, and estimated-nutrition copy are shown
before logging. Dietary exclusions and individualized targets require separate
profile, privacy, and safety work before they can affect ranking.

New creates use a catalog/day handshake: the app sends the version and local
day it reviewed, while the server verifies both before insertion. Before any
network send, the app writes the exact request UUID, owner, template, version,
day, and servings to SecureStore. Recovery uses the captured Clerk session
token, blocks normal meal controls, and replays only that same request until the
server confirms it or rejects its precondition. Production catalog rollouts
must drain old API replicas and use one server catalog version at a time; the
current protocol is not approved for mixed-version writers.

## Account-deletion decision

`ADR_002_ACCOUNT_DELETION.md` records the durable state-machine design. Special
status/delete routes authenticate the Clerk identity without normal JIT
provisioning. The server tombstones first, calls Clerk with its server
credential, then removes the internal user so profile, weight, and meal rows
cascade. It returns `204` only after external and local deletion are terminal.
Pending work is retried by a bounded background worker. Normal APIs return
`410` when an authenticated request reaches a pending/completed tombstone; a
Clerk-invalidated session may instead be rejected as `401` before that guard.
Staging is monotonic, so a concurrent finalizer cannot regress `completed` to
`pending` or restore a raw Clerk ID. Only a verified Clerk API `404` counts as
already absent, and every retry verifies the pending raw ID hashes to its own
tombstone before calling Clerk.

SecureStore is a versioned, owner-scoped UX recovery aid rather than deletion
authority. Authenticated screens remain gated while local/server deletion state
is checked, and shared TanStack Query state is cleared before a different Clerk
principal renders. Normal-endpoint `410` responses synchronously gate the owning
principal and remove private cached queries/mutations; deletion status refreshes
on mount, foreground focus, and every 60 seconds while active. Terminal
deletion clears both the deletion marker and any pending meal-create intent for
that owner before sign-out. The
automated engineering foundation is verified; real-Clerk, native-device,
retention, and production-monitoring verification remain open.

## Notification design

Not built. Planned per spec §12.4: `expo-notifications` local
scheduled reminders where the Expo Go / dev-build workflow supports them,
with preferences persisted server-side (`reminder_preferences` table, later
phase).

## Future HealthKit adapter boundary

Per spec §30: health-data ingestion goes behind a `HealthDataProvider`
interface in the future domain package; the current provider is manual
tracking only. Nothing currently hard-wires a vendor.

## Purchases / entitlements (change order §4)

RevenueCat's `CUT_OS_PRO` entitlement is the subscription source of truth.
The native app uses `react-native-purchases` only after deletion and adult
authorization succeed, and identifies customers exclusively with the internal
`users.id` UUID. Custom-ID account switches call `logIn` directly; CUT never
creates an anonymous intermediary with RevenueCat `logOut`. Expo Go cannot make
real purchases and reports that limitation instead of simulating success.

The server independently checks RevenueCat REST API v2 active entitlements for
every paid operation. It compares the configured RevenueCat `entl...` resource
ID and exposes the stable app-facing key `CUT_OS_PRO`; client state alone never
unlocks API access. Provider failure returns a retryable `503`, inactive access
returns `402`, and short status caching cannot outlive a finite entitlement
expiration. A forced post-purchase/restore refresh is isolated from older
reads. RevenueCat customer deletion is ordered before Clerk/local deletion,
uses a database lease across server replicas, and persists queued-provider
state so a `202` deletion is polled with noncreating GETs rather than repeated.
Automated verification is implemented; Apple Sandbox, TestFlight, and final
production-service acceptance remain open.

## Test architecture

- `artifacts/api-server`: vitest + supertest integration tests. Real Express
  router and real `@clerk/express` `getAuth` (requests carry a branded fake
  `req.auth`, no module mocks) against PGlite (WASM Postgres) built from the
  committed migrations. Covers the auth gate, JIT provisioning idempotency,
  account updates, profile lifecycle + full-replace contract, meal logging,
  deletion coordination/cascades/provider-error boundaries/races/retries,
  RevenueCat v2 parsing/cache/refresh/deletion, paid-route enforcement, and
  cross-user isolation (change order §5). The adult-eligibility suite must cover
  migrated/unverified state, `428`/`403` enforcement on every private route,
  allowlisted deletion/settings behavior, transient-DOB absence, and atomic
  onboarding. Current counts are recorded only after the merged suite runs;
  final native verification is tracked in `QA_REPORT.md`.
- `artifacts/cut-os`: vitest unit tests for pure logic in `lib/`, including
  profile↔form mapping, the meal serving editor, durable/cross-principal meal
  recovery, account-deletion marker/gate/transport ownership helpers, and the
  eligibility route/cache decision helpers, RevenueCat principal isolation,
  pricing-copy rules, and purchase/restore verification state.
  Screens and native cache transitions are
  exercised through simulator QA (spec §2), not vitest.
- Run everything: `pnpm run test` (root). Typecheck: `pnpm run typecheck`.
