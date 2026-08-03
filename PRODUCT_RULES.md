# Product rules

All **deterministic product rules** live in `lib/domain` (`@workspace/domain`):
pure, I/O-free functions with an injected clock/timezone. Examples today:
`localDayKey`/`todayKey` (user-local calendar day for daily rollups) and
`estimateOneRepMax`.

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

- **JIT user provisioning is select-first, never a per-request write.**
  `provisionUser` (`userService.ts`) selects on `clerk_user_id` first; it only
  inserts on a miss, with `onConflictDoNothing` + a re-select to cover the
  race where a concurrent request wins the insert. A returning user costs one
  read and zero writes. `updated_at` on `users` therefore means "last
  settings/profile change," not "last seen" — don't repurpose it as a
  last-login timestamp. `requireAuth` attaches the resolved row as `req.user`;
  `GET /me` returns it directly and must not re-select.
- **Onboarding completion is atomic and means "a profile exists."**
  `upsertProfile` (`userService.ts`) writes the profile row and flips
  `users.onboardingComplete` true in ONE transaction, so the flag and
  profile-existence can never disagree — a partial failure rolls both back.
  The flag is therefore not a client-settable bit: `PATCH /me` may CONFIRM
  `onboardingComplete: true` only when a profile already exists (else `400`) and
  rejects `false` outright — un-onboarding is not a settings operation, and
  refusing it also removes any check-then-act window against a concurrent
  profile write (P1-4). The only way the flag turns on is `PUT /me/profile`,
  which sets it atomically; don't reintroduce a client- or route-level path that
  sets it independently of the profile write.
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
  address. The rate-limit store is in-memory and **per-instance — a
  stopgap**: correct under one autoscale instance, but limits reset per
  instance and aren't shared, so a shared (Redis) store is required before
  this is correct across multiple instances.
- **`helmet` is mounted on `/api` with CSP disabled** — this is a JSON API,
  not an HTML surface, so a content-security-policy is meaningless; helmet's
  other defaults (`nosniff`, HSTS, `X-Frame-Options`, no-referrer) still
  apply.
- **Clerk host resolution is allowlist-only.** `x-forwarded-host` is
  client-writable, so `getClerkProxyHost` only ever returns a hostname
  present in the shared allowlist (`lib/allowedHosts.ts`, built from the
  same env vars as the CORS allowlist: `REPLIT_DEV_DOMAIN`,
  `REPLIT_EXPO_DEV_DOMAIN`, `CORS_ALLOWED_ORIGINS`) — a spoofed header value
  never reaches `publishableKeyFromHost` or the `Clerk-Proxy-Url` header. An
  unknown or missing host falls back to `CLERK_PUBLISHABLE_KEY` (bypassing
  `publishableKeyFromHost`, which throws on an empty host with a live key)
  and the proxy sends no `Clerk-Proxy-Url` at all. Consequence: every
  public domain the app serves — including the production `.replit.app`
  domain — must be listed in `CORS_ALLOWED_ORIGINS` (or the Replit env
  vars) or multi-domain Clerk flows fall back to the single env key.

**Deferred (not built here):**
- Email refresh via a Clerk `user.updated` webhook or a Clerk token
  template — today `email` is captured only at first provisioning
  (`requireAuth` reads it off the initial session claims) and never
  refreshed on subsequent logins, so a user who changes their email in Clerk
  keeps the stale value in `users.email` until this lands.
- A shared (Redis) rate-limit store, to make `API_RATE_LIMIT`/
  `CLERK_RATE_LIMIT` correct across more than one autoscale instance.
