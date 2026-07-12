# P1-2 (hot-path write) + P1-6 (pool hygiene) + P1-7 (trust proxy / rate limit / headers)

**Date:** 2026-07-12
**Audit findings:** P1-2 (`scaling`), P1-6 (`resilience`), P1-7 (`security`), all P1
**Branch:** `p1-2-6-7-server-hardening` (off `main` @ `4dd4516`)
**Decisions:** two forks answered by Zarif (helmet in-scope; IP-before-auth
limiting). Email-refresh deferred by Claude's recommendation, accepted.

Three server-hardening items batched because they all touch the request
lifecycle at the edges — how a request is authenticated (P1-2), how the process
holds its DB connections and dies (P1-6), and what sits in front of the router
(P1-7). None changes product behavior; all reduce cost, crash surface, and
abuse surface before Phase 1 feature work and real users land.

## Decisions (chosen)

- **P1-7 includes `helmet`** (Zarif). The audit title flags "no security
  headers"; a minimal helmet on `/api` (HSTS, noSniff, frameguard, no-referrer;
  CSP off for a JSON API) is cheap standard hardening. One new dep.
- **Rate limiting is IP-keyed and runs BEFORE `requireAuth`** (Zarif), plus a
  stricter IP limiter on the unauthenticated `/api/__clerk` proxy. This protects
  the expensive Clerk-verify path from unauthenticated floods — the real attack
  surface — rather than the audit's literal "key by `req.userId ?? req.ip`"
  (which runs after auth and leaves that path exposed).
- **Email refresh is out of scope** (Claude reco, accepted). Email is captured
  at user creation exactly as today and not refreshed per request (it never
  was). A signed Clerk `user.updated` webhook is its own feature (endpoint +
  signature verification); noted as a follow-up, not built here.
- **In-memory rate-limit store**, per-instance — the audit's acknowledged
  stopgap on autoscale. A shared store (Redis) is a later item; noted in code.

## P1-2 · `requireAuth` writes the users row on every request

Today `provisionUser` (`userService.ts:21-28`) runs
`INSERT … ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = now()
RETURNING *` on **every** authenticated request — a row write (WAL, dead tuple,
row lock) on every GET — and `GET /me` (`me.ts:22`) then re-`SELECT`s the same
row via `getUserById`.

**Fix — select-first, insert-on-miss, reuse the row:**

1. `SELECT` by `clerk_user_id`. Returning user (the overwhelming common case) →
   **one read, zero writes**, return it.
2. Miss → `INSERT … ON CONFLICT (clerk_user_id) DO NOTHING RETURNING *`.
3. Insert returned nothing (lost a concurrent-insert race between the SELECT and
   INSERT) → re-`SELECT` and return.

- The per-request `SET updated_at = now()` is gone. `updatedAt` keeps its schema
  `$onUpdate(() => new Date())` (fires on real `.update()` calls), so it now
  means "last settings/profile change," not "last seen."
- `requireAuth` attaches the full row to `req.user`; `GET /me` returns
  `req.user` directly — **zero DB calls** on that route (was 1 write in the
  middleware + 1 read in the handler).
- Add `getUserByClerkId(clerkUserId)` to userService (SELECT by
  `users.clerkUserId`). Extend the Express `Request` type with `user?: User`
  alongside the existing `userId`/`clerkUserId`.
- Email behavior unchanged: `INSERT` carries the email on first access; a
  returning user's email is not touched (as before). No regression.

*Rejected:* `ON CONFLICT DO UPDATE` with a no-op set (still a write); a
read-through cache (premature — the unique-index SELECT is already cheap).

## P1-6 · pg Pool defaults, no error handler, no graceful shutdown

Today `createDefaultDb` (`lib/db/src/index.ts:18`) is
`new Pool({ connectionString })` — no `max`/timeouts, no `pool.on("error")` (an
idle-client error becomes an unhandled `'error'` event → process crash) — and
`index.ts:18` calls `app.listen` without capturing the server, so nothing calls
`server.close()`/`pool.end()` when the platform sends SIGTERM (autoscale
severs in-flight requests).

**Fix — budget + error handler (in `lib/db`):**

- `new Pool({ connectionString, max, idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000 })` where `max = Number(process.env.PG_POOL_MAX
  ?? 5)`.
- `pool.on("error", (err) => console.error(...))` attached inside
  `createDefaultDb` so a handler is **always** present before the pool can emit
  `'error'`. `lib/db` has no logger dep, so the default handler uses
  `console.error` (no health values — CLAUDE.md privacy rule holds). api-server
  may layer pino via the existing `getPool()` accessor.

**Fix — graceful shutdown (in `api-server`):**

- Capture the `Server` returned by `app.listen`.
- Extract a pure, testable factory in a new
  `api-server/src/lib/shutdown.ts`:
  `createShutdownHandler({ server, closePool, logger, timeoutMs, exit })` →
  returns an async `(signal) => void` that: logs, `server.close(cb)` (stop
  accepting, drain in-flight), then `await closePool()`, then `exit(0)`; and
  arms a `setTimeout(timeoutMs).unref()` that calls `exit(1)` if draining hangs.
- `index.ts` wires `process.on("SIGTERM"|"SIGINT", handler)` with
  `closePool: () => getPool()?.end()`, `logger`, `exit: process.exit`,
  `timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000)`.

Injected `exit`/`closePool`/timer let a unit test drive both the happy path and
the hard-timeout path with fakes + fake timers — never signaling the real
process.

## P1-7 · No trust proxy, no rate limiting, no security headers

Today nothing sets `trust proxy` (so `req.ip` is the Replit edge, mis-keying any
limiter), nothing throttles `/api/*` or the unauthenticated `/api/__clerk`
proxy, and no security headers are set.

**Fix:**

- `app.set("trust proxy", 1)` — trust the single Replit edge hop so `req.ip`
  is the real client IP for keying. (`1`, not `true` — express-rate-limit v7
  rejects a permissive `true`.)
- New `api-server/src/middlewares/rateLimit.ts` with two factories over
  `express-rate-limit` (both IP-keyed, standard headers, JSON 429
  `{ error: "Too many requests" }`):
  - `createClerkLimiter()` — strict, env `CLERK_RATE_LIMIT` (default 30) per
    minute per IP; mounted on `CLERK_PROXY_PATH` (`/api/__clerk`).
  - `createApiLimiter()` — general, env `API_RATE_LIMIT` (default 100) per
    minute per IP; mounted on `/api`, running before every route's
    `requireAuth`.
- `helmet` on `/api`, mounted **after** the Clerk proxy so proxied FAPI bytes
  are untouched: `helmet({ contentSecurityPolicy: false, hsts: true,
  noSniff: true, frameguard: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" } })`.

**Final middleware order in `app.ts`:**

```
app.set("trust proxy", 1)
1. pinoHttp
2. clerkLimiter   on /api/__clerk   (strict, IP-keyed)
3. clerkProxyMiddleware  on /api/__clerk
4. cors
5. helmet         on /api
6. express.json / urlencoded
7. clerkMiddleware
8. apiLimiter     on /api           (IP-keyed, before requireAuth)
9. router         on /api
10. errorHandler  (last)
```

**Testability without breaking existing tests:** the 17 `me.test.ts` integration
tests use the harness's own app (`helpers.ts:89`), which does **not** mount the
limiters/helmet — so they keep passing (and rapid test requests never hit a
limit). The limiter factories and helmet get their own focused tests on minimal
throwaway apps.

## Files

- Modify `lib/db/src/index.ts` — pool budget + `pool.on("error")` in
  `createDefaultDb`.
- Modify `artifacts/api-server/src/services/userService.ts` — `provisionUser`
  select-first/insert-on-miss/race-reselect; add `getUserByClerkId`.
- Modify `artifacts/api-server/src/middlewares/requireAuth.ts` — attach
  `req.user`; extend the `Request` type with `user?: User`.
- Modify `artifacts/api-server/src/routes/me.ts` — `GET /me` returns `req.user`
  (no re-select).
- Create `artifacts/api-server/src/lib/shutdown.ts` — `createShutdownHandler`.
  Test `shutdown.test.ts` (unit, fakes + fake timers).
- Modify `artifacts/api-server/src/index.ts` — capture `Server`; wire
  SIGTERM/SIGINT → handler.
- Create `artifacts/api-server/src/middlewares/rateLimit.ts` —
  `createClerkLimiter`, `createApiLimiter`. Test `rateLimit.test.ts` (429 on
  N+1; trust-proxy keying via `x-forwarded-for`).
- Modify `artifacts/api-server/src/app.ts` — trust proxy, limiters, helmet in
  the order above. Test `security-headers.test.ts` (helmet headers present on a
  minimal app that mounts the same helmet config).
- Modify `artifacts/api-server/src/routes/me.test.ts` — assert `GET /me` still
  works with `req.user` reuse; a returning user does not bump `updated_at`.
- Add deps to `artifacts/api-server/package.json` — `express-rate-limit`,
  `helmet` (both ship their own types; Express-5-compatible).
- Update `PRODUCT_RULES.md` — pool/shutdown + rate-limit-stopgap +
  email-refresh-deferred invariants.

## Tasks (TDD)

1. **P1-2 provisionUser** (userService): tests — returning user issues no write
   (assert `updated_at` unchanged across two requests); first access inserts;
   race path re-selects (simulate by pre-inserting then calling). Implement
   select-first. Add `getUserByClerkId`. Commit.
2. **P1-2 req.user reuse** (requireAuth + me route): test — `GET /me` returns the
   provisioned user and performs no second read (behavioral: still 200 + correct
   body; `updated_at` stable). Attach `req.user`; `GET /me` uses it. Commit.
3. **P1-6 pool** (lib/db): budget config + `pool.on("error")` in
   `createDefaultDb`. (No live-pool integration test — verified by typecheck +
   that existing tests, which inject PGlite via `setDb`, stay green.) Commit.
4. **P1-6 shutdown** (api-server): unit tests — happy path (`server.close` cb →
   `closePool` awaited → `exit(0)`); hang path (fake timers → `exit(1)` after
   `timeoutMs`). Implement `createShutdownHandler`; wire signals in `index.ts`.
   Commit.
5. **P1-7 limiters** (rateLimit.ts): tests on a minimal app — N requests pass,
   N+1 → 429; `x-forwarded-for` drives the key under `trust proxy`. Implement
   both factories. Commit.
6. **P1-7 app wiring + helmet**: add trust proxy, mount limiters + helmet in the
   documented order; `security-headers.test.ts` asserts helmet headers.
   Confirm existing 44 stay green. Add deps, `pnpm install`. Commit.

## Verification gate

`pnpm run typecheck && pnpm run test` → green. Test count grows by ~8–10
(provisionUser select-first + no-write; GET /me reuse; shutdown happy + timeout;
api/clerk limiter 429 + keying; helmet headers), from 44 to ~52–54. Existing 44
must stay green.

## Out of scope / follow-ups

- Email refresh (Clerk `user.updated` webhook or token template) — separate
  feature.
- Shared (Redis) rate-limit store for correct limits across autoscale instances
  — later item.
- P1-8 (`x-forwarded-host` allowlist) stays a distinct finding; not touched
  here even though it shares the proxy file.
