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
  `QA_REPORT.md`. `scripts/build.js` + `server/serve.js` produce and
  serve an Expo-updates-protocol bundle (iOS + Android JS bundles + manifests),
  not a web build. `react-native-web` exists only for Expo's web dev preview.
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
3. `clerkMiddleware` on the server verifies the JWT; `requireAuth`
   (`src/middlewares/requireAuth.ts`) first checks the durable deletion
   tombstone and returns `410` for a pending/completed identity. Only an active
   identity is resolved to the **internal user id**: the server provisions a
   `users` row keyed by unique `clerk_user_id` on the first request and attaches
   `req.userId` (internal uuid).
4. In production, the Clerk Frontend API is reached through a same-origin
   proxy mounted at `/api/__clerk` (`clerkProxyMiddleware.ts`) so custom
   domains work without CNAME setup.

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
- `PUT /api/me/profile` is a **full replace**: omitted optional fields reset
  to null/defaults. The client therefore always seeds the edit form from the
  existing profile (`artifacts/cut-os/lib/profile-form.ts` — unit tested).
- Display units (`users.units`) are a presentation concern; storage is always
  metric (kg/cm).
- Curated meal nutrition and the canonical calendar day are server-owned. The
  client echoes the `dayKey` and `catalogVersion` it reviewed alongside a
  stable template ID, servings, and an idempotency UUID. The server rejects a
  new stale-day or stale-catalog request with `412`; it never accepts calories
  or macros from the client. An identical request UUID is resolved before the
  current-day/version checks so an uncertain retry can still return its
  original historical snapshot after midnight or a catalog release.

## Database schema

- `users` — internal identity: `clerk_user_id` (unique), `email`, `timezone`
  (IANA, drives future user-local daily rollups), `units`,
  `onboarding_complete`, and `deletion_status` (`active` or `pending`).
- `profiles` — one row per user (unique FK, cascade delete): goal, sex,
  birth year, height, start/goal weight, target date, activity level,
  training experience.
- `weight_entries` — one canonical weigh-in per internal user and user-local
  calendar day. The `(user_id, recorded_on)` unique index makes repeated taps
  an update, not a duplicate. Physical values are stored in kilograms and
  converted only for display.
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
onboarding → daily weigh-in → first balanced meal → neutral review of today’s
logged meals. The same package owns the versioned six-meal launch catalog, nutrition
scaling/summing, and transparent general ranking. Future daily status, streak,
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

Not built. The committed direction: RevenueCat entitlements
(`CUT_OS_PRO`) as the subscription source of truth, `react-native-purchases`
in an **EAS development build** (Expo Go only ever shows mock paywall UI).
The internal `users.id` uuid is the stable candidate for the RevenueCat
`appUserID`. The backend may mirror entitlement state for queries but must
not create an independent subscription truth.

## Test architecture

- `artifacts/api-server`: vitest + supertest integration tests. Real Express
  router and real `@clerk/express` `getAuth` (requests carry a branded fake
  `req.auth`, no module mocks) against PGlite (WASM Postgres) built from the
  committed migrations. Covers the auth gate, JIT provisioning idempotency,
  account updates, profile lifecycle + full-replace contract, meal logging,
  deletion coordination/cascades/provider-error boundaries/races/retries, and
  cross-user isolation (change order §5). Final deletion verification is
  tracked in `QA_REPORT.md`.
- `artifacts/cut-os`: vitest unit tests for pure logic in `lib/`, including
  profile↔form mapping, the meal serving editor, durable/cross-principal meal
  recovery, and account-deletion marker/gate/transport ownership helpers.
  Screens and native cache transitions are
  exercised through simulator QA (spec §2), not vitest.
- Run everything: `pnpm run test` (root). Typecheck: `pnpm run typecheck`.
