# CUT OS — Phase 0 Architecture Audit

**Auditor:** Claude (principal mobile & systems architect review)
**Date:** 2026-07-12
**Scope:** Replit Agent's Phase 0 ("Foundation") output, audited against the
build spec and the Public GTM / $1M change order in `attached_assets/`.
**Baseline audited:** the `main` snapshot delivered as `cut-main.zip`
(baseline commit on this branch). **Fixes:** all confirmed P0 issues are
fixed on branch `claude/phase-0-audit-fixes` with tests.

## Methodology

- Full manual read of every source file in the repo, followed by baseline
  commands: `pnpm install`, `pnpm run typecheck`, `pnpm run build`,
  per-package builds, test discovery.
- A 69-agent audit: 10 dimension-specific finder agents (66 raw findings) →
  merge/dedup (29 findings) → two independent adversarial verifiers per
  finding (one fact lens re-reading the cited code, one severity lens
  attacking the judgment). 26 findings survived; 3 were refuted (see
  Appendix A — two refutations are themselves useful architecture facts).
- Severity: **P0** fix before Phase 1 (broken gates, data loss, foundation
  lock-in) · **P1** fix before feature expansion · **P2** deferrable.

## Verdict by requested audit dimension

| Dimension | Verdict |
| --- | --- |
| Truly native RN+Expo artifact? | **Yes.** Genuine Expo SDK 54 / RN 0.81 app (New Architecture on), expo-router, native keyboard/safe-area handling. `scripts/build.js` + `server/serve.js` produce and serve an Expo-updates-protocol bundle (iOS/Android JS + manifests) for Expo Go — not a web build. `react-native-web` exists only for Expo's dev preview; `mockup-sandbox` is Replit design tooling with zero mockups, not the product. Caveat: the pipeline is Expo-Go-only — see P1-11. |
| Client/server separation | Sound shape: OpenAPI contract → generated client + server Zod validators; server resolves identity; client caches via TanStack Query. Gaps: no server error normalization (P1-1), non-atomic two-step onboarding save (P1-4). |
| PostgreSQL source of truth | Correct direction (server-owned canonical data, metric storage). Was undermined by **no migrations** (P0-4, fixed) and enum-by-comment columns (P2-3). |
| Auth architecture for public multi-user | Clerk with JIT-provisioned internal uuid identity — the right foundation; decision was undocumented (P0-3, fixed). Hot-path upsert (P1-2), spoofable host → publishable-key resolution (P1-8), sign-up flow error handling (P2-4). |
| Cross-user isolation | **No isolation defect found.** All queries scope by server-resolved `req.userId`; no client-supplied user id trusted anywhere; Clerk id never leaks in responses. Now proven by integration tests (two-user suite). |
| TypeScript architecture & domain boundaries | Workspace + codegen pipeline is good. No home for domain logic (P1-3), zod v3/v4 dialect split (P1-9), codegen drift unenforced (P1-10), server compiles less strict than the app (P2-1). |
| Deterministic product-rule placement | **Nothing exists yet — and nothing is in the wrong place yet.** The risk is structural: without a `lib/domain` seam before Phase 1, rules will land in route handlers and screens (P1-3). |
| Data duplication / multiple sources of truth | `users.onboardingComplete` flag vs profile-row existence (P1-4); units/timezone dead columns (P2-2). No derived-value duplication yet. |
| RevenueCat entitlement readiness | Correctly absent in Phase 0. Internal `users.id` is the right future `appUserID`. Blockers: no native-build lane (P1-11), no entitlement seam for Phase 1 screens to gate through (P2-8). |
| Expo Go vs development-build boundaries | Clean today (no dev-build-only modules in use), but 8 declared native deps are unused (P2-10) and the entire build/QA pipeline assumes Expo Go (P1-11). |
| App Store scaling risks | Per-request DB writes (P1-2), pg pool defaults + no graceful shutdown (P1-6), no trust proxy/rate limiting (P1-7), missing account deletion for App Store 5.1.1(v) (P2-7). |
| Privacy-sensitive fitness data | Clean today: no analytics SDKs, no health values in URLs, log serializers minimal. Needs the §6 allowlist seam before any event emission (P2-8) and a logger redaction backstop (P2-9). |
| Testing architecture | **Was entirely absent** (P0-2, fixed: vitest + PGlite + supertest integration suite exercising the real Clerk `getAuth` path, plus pure-logic unit tests; wired into the build gate). |
| Expensive-later tech debt | Documentation gates (P0-3, fixed), Expo-Go-only distribution (P1-11), zod dialect split (P1-9), enum triplication (P2-3). |

---

## P0 — fixed on this branch

### P0-1 · Build/typecheck gate red at HEAD

- **Evidence:** At baseline, `pnpm run typecheck` fails in
  `artifacts/mockup-sandbox` (TS2322 in `calendar.tsx`/`spinner.tsx`) because
  two `@types/react` copies coexist: the catalog floated `^19.2.0` while the
  Expo stack pins `19.1.17` (React itself is pinned `19.1.0`). Root
  `package.json` runs typecheck before build, so the entire build gate was
  red as delivered. Verified by running it; independently re-verified by two
  adversarial agents against the lockfile (381 stale 19.2.x references).
- **Why it matters:** a red gate makes CI/deploy gating meaningless, and any
  floating `@types/react` re-breaks it every time a transitive dep bumps.
- **Fix (landed):** catalog pins `@types/react: ~19.1.10` /
  `@types/react-dom: ~19.1.7` with a comment binding them to the React pin;
  lockfile regenerated; full workspace typecheck green.
- **Test:** the gate itself (`pnpm run typecheck`), now also running the test
  suites (`build` = typecheck && test && package builds).

### P0-2 · Zero test infrastructure (Phase 0 gate item)

- **Evidence:** no test runner, config, or test file existed in any package;
  spec §24 (domain + API integration tests, frozen time), §27 Phase 0 gate
  ("test setup"), and change order §5 (explicit authorization tests) all
  unmet.
- **Why it matters:** Phase 0's own gate claims (auth proof, DB read/write,
  isolation) were unverifiable; Phase 1 rule logic has nowhere to be tested.
- **Fix (landed):** vitest infrastructure:
  - `artifacts/api-server`: 16 integration tests running the **real** router
    and **real** `@clerk/express` `getAuth` (requests carry a
    `Symbol.for("@clerk/express.auth")`-branded auth object — no module
    mocks) against PGlite (WASM Postgres) **constructed from the committed
    migrations**. Covers: healthz; 401 gate on all routes; JIT provisioning
    (defaults, idempotency under 5 concurrent first requests, no Clerk-id
    leakage); PATCH /me happy/invalid paths; profile 404 → create → read →
    full-replace semantics → validation; and a two-user cross-user-isolation
    suite (change order §5).
  - `artifacts/cut-os`: 10 unit tests for the pure profile↔form mapping.
  - Root `test` script; `build` gate now runs it.
- **Enabler:** `lib/db` refactored to lazy init + `setDb()` injection seam
  (importing it no longer throws without `DATABASE_URL`).

### P0-3 · Phase 0 documentation gates absent

- **Evidence:** `ARCHITECTURE.md` did not exist despite spec §5.4 line 270
  ("Record the final auth decision and reason in ARCHITECTURE.md") and §27
  listing it as a Phase 0 deliverable; `QA_REPORT.md` (spec §2) absent;
  `README.md` was 5 bytes; `replit.md` an unfilled template. The
  Clerk-vs-Replit-Auth decision lived only in `.agents/memory/` notes.
- **Why it matters:** gate claims were unverifiable; every future session
  rebuilds context from scratch; several fixes in this audit had no
  documented home.
- **Fix (landed):** real `ARCHITECTURE.md` (auth decision + honest note that
  the original rationale was never recorded; identity rules; PUT-replace
  contract; source-of-truth rules; future rule-placement and RevenueCat
  boundaries), evidence-only `QA_REPORT.md` (simulator/device items marked
  BLOCKED, not PASS; five-minute Expo Go script included), real `README.md`,
  filled `replit.md`.

### P0-4 · No migrations; `push-force` footgun; deploy path pushed schema

- **Evidence:** `lib/db` had only `drizzle-kit push` and
  `push-force` (`--force` = auto-approved destructive changes) scripts; no
  `migrations/` directory or journal; `scripts/post-merge.sh` ran
  `pnpm --filter db push` on merge. Spec §5.3 mandates migrations; §27 lists
  them in the Phase 0 gate.
- **Why it matters:** no schema history, no reproducible environments, and a
  one-command path to silent data loss in production for a health-data app.
- **Fix (landed):** initial migration `0000_init.sql` + journal generated;
  `generate`/`migrate` scripts added; `push-force` removed;
  `drizzle.config.ts` works offline for generation; **the baseline migration
  is adoption-safe** (IF NOT EXISTS + guarded FK) so the first `migrate` run
  against the existing push-created production DB is a no-op instead of a
  failure; `post-merge.sh` now applies migrations instead of pushing.
- **Tests:** migrations build a blank DB (schema assertions); double-apply
  succeeds (adoption-safety); the whole integration suite runs on a
  migration-built database, so schema/migration drift fails tests.

### P0-5 · "Edit plan" silently wiped saved profile data

- **Evidence (baseline):** `today.tsx` "Edit plan" routed to `/onboarding`,
  whose form state initialized to blanks and never fetched the existing
  profile; `PUT /api/me/profile` is a documented **full replace**
  (`me.ts`: "every optional field the client omits is reset to its
  null/default"). Opening Edit plan and tapping Save nulled displayName,
  birthYear, heightCm, startWeightKg, goalWeightKg, and targetDate.
- **Why it matters:** data loss through the normal UI in the only
  data-entry flow the product currently has.
- **Fix (landed):** onboarding now loads the profile first (404 = valid
  first-run; hard failure renders a retry view so a blank form can never be
  saved over an existing profile) and seeds the form via a pure
  `lib/profile-form.ts` module; `formStateToProfileInput` carries over
  `targetDate` (the one field the form doesn't collect). No visual changes.
- **Tests:** 10 unit tests including the exact regression round-trip
  (profile → form → PUT body preserves every value), plus a server-side test
  pinning the full-replace contract that makes prefill mandatory.
- **Verification note:** both adversarial verifiers independently confirmed
  the fixed flow end-to-end (this finding appears in the workflow's
  "refuted" bucket only because verifiers evaluated the post-fix tree).

---

## P1 — fix before feature expansion

### P1-1 · No Express error normalization; `PATCH /me {}` → 500

`app.ts` has no 4-arity error middleware and no JSON 404 fallback; handler
throws (response-schema drift, pg errors, malformed JSON) hit Express 5's
default HTML finalhandler — with stack traces outside
`NODE_ENV=production`. `UpdateMeBody` is all-optional, so a contract-valid
`{}` body reaches `db.update().set({})` and drizzle throws "No values to
set" → 500. **Fix:** terminal JSON 404 + error middleware (SyntaxError→400,
else 500 `{error}` via `req.log`); guard empty PATCH (400 or
`minProperties: 1` in the contract); normalize validation errors to
structured issues. Spec §5.2 makes this a server responsibility.

### P1-2 · `requireAuth` upserts the users row on every request

`requireAuth.ts:49-53` performs `INSERT … ON CONFLICT DO UPDATE SET
updated_at = now()` per authenticated request: a row write (WAL, dead tuple,
row lock) on every GET, same-row lock serialization when a screen fires
parallel queries, `updatedAt` degraded into last-seen, and `GET /me`
re-selects the row the middleware just fetched. Email is read from
`sessionClaims.email` — not in Clerk's default session token, and never
refreshed after first write. **Fix:** select-first, insert-on-miss (`ON
CONFLICT DO NOTHING` + re-select), drop the per-request timestamp write,
reuse the fetched row in `GET /me`; document/configure the Clerk token
template for email or sync via a `user.updated` webhook.

### P1-3 · No home for deterministic product rules

No `lib/domain` package; no `services/` layer; routes and middleware do
inline DB access. Phase 1 immediately builds next-action, macro completion,
streaks, e1RM — spec §29 forbids duplicating rule logic and requires
reusable domain services; §24 requires pure-logic tests with injected time.
**Fix (before Phase 1):** create `lib/domain` (pure, I/O-free, injected
clock/timezone) wired into vitest; add `api-server/src/services/`; refactor
profile upsert + JIT provisioning into a `userService` as the exemplar;
stub `PRODUCT_RULES.md` pointing at `lib/domain`.

### P1-4 · Onboarding completion is non-atomic with two sources of truth

`handleSave` runs two sequential mutations (PUT profile, then PATCH
`onboardingComplete: true`); a step-2 failure leaves a profile row with the
flag false, and the flag can be set true with no profile row. "Onboarded" is
simultaneously `users.onboardingComplete` and profile-existence. **Fix:**
set the flag inside the profile-upsert transaction server-side (or derive
onboarded = profile-exists and delete the flag); reject flag-only PATCH
without a profile; document the invariant.

### P1-5 · `users.timezone` accepts any non-empty string

Contract validates `minLength: 1` only, while the column is documented as
the IANA key for all future user-local daily rollups; garbage persists and
will throw `RangeError` inside future `Intl` calls at request time. **Fix:**
validate against `Intl.supportedValuesOf("timeZone")` (cached set) at the
write boundary; onboarding should default from
`Intl.DateTimeFormat().resolvedOptions().timeZone`; add 400/200 tests.

### P1-6 · pg Pool defaults, no error handler, no graceful shutdown

`new Pool({connectionString})` with no `max`/timeouts and no
`pool.on("error")` — an idle-client error is an unhandled `'error'` event
(process crash); autoscale SIGTERM severs in-flight requests;
`pool.end()` never called. **Fix:** attach the error handler and an explicit
budget (`max≈5`, `idleTimeoutMillis`, `connectionTimeoutMillis`) in
`createDefaultDb`; SIGTERM/SIGINT → `server.close()` → `pool.end()` with a
hard timeout; point `DATABASE_URL` at the provider's pooled endpoint.

### P1-7 · No `trust proxy`, no rate limiting, no security headers

Behind the Replit edge, `req.ip` is the proxy and any future limiter is
mis-keyed or spoofable; nothing throttles `/api/*` (whose auth middleware
currently writes per request) or the unauthenticated Clerk FAPI proxy.
**Fix:** `app.set("trust proxy", 1)`; `express-rate-limit` keyed by
`req.userId ?? req.ip`; stricter per-IP limit on `/api/__clerk`; note
per-instance limits are a stopgap on autoscale.

### P1-8 · Client-spoofable `x-forwarded-host` feeds Clerk key resolution

`getClerkProxyHost` takes the **leftmost** `x-forwarded-host` (the
client-supplied one if an upstream appends) and feeds it to
`publishableKeyFromHost` — whose own docs require an allowlist — and to the
`Clerk-Proxy-Url` header; browser-client handshake redirects can be
misdirected, and whether the edge strips the header is an unverifiable
deployment assumption. **Fix:** explicit allowed-hosts set (shared with the
CORS allowlist); unknown host → fall back to `CLERK_PUBLISHABLE_KEY`; guard
the empty-host case.

### P1-9 · Two zod dialects on one zod@3 install

`lib/db` imports `zod/v4` (drizzle-zod requirement) while orval-generated
`api-zod` targets classic v3 — schemas from the two can't compose, and the
split already forced `format: uuid` to be banned from the contract (IDs
cross unvalidated; institutionalized in `.agents/memory/`). **Fix:** bump
catalog to zod ^4 (keeps `zod/v4` + `zod/v3` subpaths so both consumers
compile), verify orval output, reintroduce `format: uuid`, retire the
workaround memory.

### P1-10 · Committed codegen output has no drift enforcement

Nothing verifies `lib/api-zod`/`lib/api-client-react` match `openapi.yaml`;
edit-and-forget leaves the server validating with stale schemas while
typecheck stays green. **Fix:** `codegen:check` (run codegen, fail on
`git diff --exit-code` over the generated dirs) chained into the build gate.

### P1-11 · No native-build lane (RevenueCat/TestFlight dead on arrival)

No `ios.bundleIdentifier`/`android.package`, no `eas.json`, no
`expo-dev-client`; all `EXPO_PUBLIC_*` config is injected from Replit env at
Metro bundle time (a non-Replit build gets `undefined` domain and a
non-null-asserted Clerk key); `build.js` regex-scrapes assets from the
minified bundle (brittle) and only produces the Expo Go lane. The change
order requires real purchases in an EAS development build. **Fix:** declare
the bundle identifier now (locked at first submission); commit `eas.json`
(dev/preview/prod profiles, `developmentClient: true`) + `expo-dev-client`;
move public config into `app.config.ts`/EAS per-profile env; keep the
Replit pipeline as the preview lane and document it as such.

---

## P2 — can defer (do before the phase that touches each area)

1. **TS strict umbrella:** base config hand-picks flags,
   `strictFunctionTypes: false`; server compiles weaker than the app.
   Replace with `"strict": true` + fix fallout (spec §29).
2. **Units/timezone dead columns:** nothing reads/writes `users.units` or
   `timezone`; Today hardcodes "kg"; §18's imperial deviation undocumented.
   Add `formatWeight/Height` helpers reading `me.units`, capture device
   timezone at onboarding, record the metric-storage decision.
3. **Enum triplication:** allowed values live in openapi.yaml, column
   comments, and hand-copied screen arrays; DB accepts any string. Use
   drizzle `text(…, {enum})` + CHECK constraints in a migration; derive
   client options from generated constants.
4. **Sign-up flow error handling:** `sendEmailCode` result ignored (UI
   claims a code was sent even on failure), `handleVerify` unguarded, resend
   fire-and-forget. Mirror the `{error}` pattern everywhere.
5. **Client config startup safety:** Clerk key non-null assertion crashes
   inside `ClerkProvider` (outside the ErrorBoundary) on a misbuilt binary;
   expo-router `origin` placeholder `https://replit.com/`. Render a
   diagnostic screen instead; fix or remove `origin`.
6. **Token race + retry policy:** getter registered in a child effect (first
   query can fire unauthenticated by design); `new QueryClient()` defaults
   retry 4xx 3×. Register the getter before mount; set a status-aware
   default retry predicate once.
7. **Account deletion + Clerk lifecycle webhook:** required by App Store
   5.1.1(v) and the change order; deleted Clerk users currently strand
   health rows. Track `DELETE /api/me` + svix-verified `user.deleted`
   webhook; create `APP_STORE_READINESS.md`; write the "every user-owned
   table cascades to users.id" rule into ARCHITECTURE.md.
8. **GTM seams:** before Phase 1 screens exist, add the `product_events`
   ingestion module with the §6 safe-property allowlist (tests proving
   prohibited health keys are stripped) and a stub
   `useEntitlements()`/`useFlag()` hook so features gate through a seam
   instead of assuming everything is free.
9. **Logger redaction backstop:** redact list covers auth headers only; add
   `req.body`/`res.body` and wildcard health keys with `remove: true` so a
   future stray `req.log.info({body})` can't leak weights.
10. **Eight unused native deps** (expo-blur, expo-glass-effect, expo-haptics,
    expo-image, expo-image-picker, expo-linear-gradient, expo-location,
    expo-symbols): never imported; expo-location/image-picker will drag
    purpose-strings into review via autolinking. Remove; re-add per phase.
11. **Dead weight in the gate:** mockup-sandbox (~50 shadcn files, zero
    mockups — already broke the gate once) and the placeholder `scripts`
    package. Document keep-or-delete; replace `hello.ts` with a real script
    or drop it. *(Correction to the raw finding: `dist/` trees are **not**
    checked in — they're gitignored local build output.)*

---

## Appendix A — findings refuted by adversarial verification

Recorded because both are useful facts:

1. **"Production deployment topology undefined" — refuted.** Per-artifact
   `.replit-artifact/artifact.toml` files fully define it: api-server
   `paths=["/api"]`, PORT 8080, healthcheck `/api/healthz`; cut-os
   `paths=["/"]`, PORT 22203; `.replit` `router="application"` composes them
   behind one origin — exactly the same-origin arrangement the Clerk proxy
   and CORS code assume. (Now summarized in ARCHITECTURE.md.)
2. **"drizzle `$onUpdate` doesn't fire on upserts" — refuted empirically.**
   In drizzle-orm 0.45.2, `onConflictDoUpdate` set clauses do include
   `$onUpdate` columns (verified by generating SQL). The manual
   `updatedAt: new Date()` in the two upsert call sites is redundant, not
   load-bearing.
3. **Edit-plan data loss** appears in the refuted bucket only because
   verifiers evaluated the tree after the fix landed — both confirmed the
   fix is complete (see P0-5).

## Suggested ordering for the P1 batch

1. P1-3 (domain/services seam) — before any Phase 1 feature code.
2. P1-1 + P1-5 (error middleware + timezone validation) — small, test-backed.
3. P1-2 + P1-6 + P1-7 (hot-path write, pool hygiene, trust proxy/limits) —
   one server-hardening pass.
4. P1-11 (bundle id + EAS lane) — two lines now, the rest before purchase QA.
5. P1-9 + P1-10 (zod 4 migration, codegen drift check) — one codegen pass.
6. P1-4 + P1-8 (atomic onboarding, host allowlist).
