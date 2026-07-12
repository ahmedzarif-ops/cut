# P1-1 (error normalization) + P1-5 (timezone validation)

**Date:** 2026-07-12
**Audit findings:** P1-1 (`error-handling`), P1-5 (`data-integrity`), both P1
**Branch:** `claude/p1-3-domain-seam` (continues the P1 batch after P1-3)
**Decisions:** delegated to Claude's recommendation ("go with what you reco").

Built together because they share one piece of infrastructure: a typed
`HttpError` + a catch-all error middleware. P1-5's timezone check becomes the
first service invariant that flows through it, and `lib/domain`'s first real
consumer.

## Decisions (recommended, chosen)

- **Empty-body `PATCH /me` → 200 no-op** (returns the current user), not 400.
  PATCH with no fields means "change nothing"; that should succeed idempotently
  rather than force clients to special-case it. (Current behavior: a 500 from
  Drizzle's empty `.set()` — the P1-1 bug.)
- **Global error middleware now**, not just the targeted fix. A market-bound API
  must not leak stack traces or hang on an uncaught throw. Express 5 forwards
  async rejections to a 4-arg error handler automatically.
- **Timezone validated in the service, throwing `HttpError(400)`** (mapped to
  400 by the middleware) — keeps routes thin and enforces the invariant where
  the write happens.

## Deviation from the audit (deliberate)

The audit suggested validating timezone against
`Intl.supportedValuesOf("timeZone")` (a cached Set). On this runtime (Node
v25) that set **excludes `"UTC"` and `"Etc/UTC"`** (verified: 418 zones, no
UTC), so it would wrongly 400 a client resetting to `"UTC"` — the column
default. Instead use the robust industry pattern: `isValidTimeZone` via a
`try/catch` around `new Intl.DateTimeFormat(undefined, { timeZone })`, which
accepts every real zone (UTC, Etc/UTC, aliases, case-insensitive) and throws
only on garbage. Same intent (reject invalid IANA zones), correct on UTC.

The client-side default (onboarding seeding timezone from
`Intl.DateTimeFormat().resolvedOptions().timeZone`) is a separate cut-os change
that needs simulator/Expo-Go verification — deferred, noted in HANDOFF.

## Files

- Create `lib/domain/src/timeZone.ts` — `isValidTimeZone(tz: string): boolean`
  (memoized try/catch). Test `timeZone.test.ts`. Export from `index.ts`.
- Create `artifacts/api-server/src/lib/httpError.ts` — `class HttpError extends
  Error { statusCode: number }`.
- Create `artifacts/api-server/src/middlewares/errorHandler.ts` — 4-arg handler:
  `HttpError` → `res.status(err.statusCode).json({ error: err.message })`;
  anything else → log + `500 { error: "Internal Server Error" }` (no leak).
  Test `errorHandler.test.ts` (unit).
- Modify `artifacts/api-server/src/app.ts` — `app.use(errorHandler)` last.
- Modify `artifacts/api-server/src/test/helpers.ts` — same, so tests exercise
  the real error path.
- Modify `artifacts/api-server/src/services/userService.ts` — `updateUser`:
  validate `patch.timezone` (throw `HttpError(400, "Invalid timezone")` when
  present and invalid); empty patch → return `getUserById(userId)` (no-op).
  Imports `isValidTimeZone` from `@workspace/domain` (first real domain
  consumer; resolves the previously-declared-but-unused dep).
- Modify `artifacts/api-server/src/routes/me.test.ts` — integration tests.

## Tasks (TDD)

1. **isValidTimeZone** (lib/domain): test accepts `UTC`, `America/Chicago`,
   `Asia/Dhaka`; rejects `""`, `Not/AZone`. Implement memoized try/catch.
   Barrel export. Commit.
2. **HttpError + errorHandler**: unit test — `HttpError(400,"x")` → `{status:400,
   body:{error:"x"}}`; a plain `Error("secret")` → `{status:500,
   body:{error:"Internal Server Error"}}` (message not leaked). Register in
   app.ts + helpers.ts. Commit.
3. **updateUser + routes**: integration tests — `PATCH /me {}` → 200 returns
   current user unchanged; `PATCH /me {timezone:"Not/AZone"}` → 400;
   `PATCH /me {timezone:"Asia/Dhaka"}` → 200 + persisted. Existing PATCH tests
   (`America/Chicago` → 200; `{timezone:""}` → 400 via zod; `{units:"stone"}` →
   400) must stay green. Implement. Full gate: `pnpm run typecheck && pnpm run
   test`. Commit.

## Verification gate

`pnpm run typecheck && pnpm run test` → green; api-server test count grows by
~4 (1 errorHandler unit + 3 PATCH integration) plus 1 lib/domain
(isValidTimeZone).
