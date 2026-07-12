# P1-3 — Domain + Services seam

**Date:** 2026-07-12
**Audit finding:** P1-3 (`domain-boundaries`, severity P1)
**Branch:** `claude/p1-3-domain-seam` (stacked on `claude/phase-0-audit-fixes`)
**Status:** Approved design, pre-implementation

## Problem

`routes/me.ts` and `middlewares/requireAuth.ts` run `db.insert/select/update`
inline inside Express handlers — business logic living in the transport layer.
There is no `lib/domain` package and no `services/` layer.

Phase 1 immediately builds the next-action engine, macro completion, streaks,
and e1RM. With no domain package or services seam, that code can only land in
route handlers and React Native screens — precisely what build-spec **§29**
forbids (reusable domain services, thin screens, no duplicated rule logic).
**§24** additionally requires pure-logic tests with injected time. Retrofitting
after Phase 1 means rewriting every engine, so the seam must exist first.

This is a structural fix: it ships nothing user-facing. It makes Phase 1
buildable without a foundation that would later have to be ripped out.

## Goals

1. A pure, I/O-free `lib/domain` workspace package with an injected clock /
   timezone, wired into typecheck and vitest.
2. An `api-server/src/services/` layer; routes call services, services do I/O.
3. Refactor the existing user/profile DB logic out of routes and middleware
   into a `userService` exemplar — **no behavior change**, done under the
   existing green test suite.
4. A `PRODUCT_RULES.md` stub establishing `lib/domain` as the single home for
   deterministic rules.

## Non-goals (YAGNI)

- No Phase 1 feature logic (next-action, streaks, macro completion) — only the
  seam and two seed rules that prove the pattern.
- No adjacent audit items (P1-1 error middleware, P1-5 timezone validation) —
  they follow P1-3 per the audit ordering.
- No contrived `lib/domain` call inside `userService`: user provisioning has no
  pure rule to compute. The first genuine domain consumer arrives in Phase 2
  (streaks / Today aggregates via `localDayKey`). The package is wired and
  available now; it is not force-fit into the exemplar.

## Design decisions (chosen with the user)

- **Domain seed:** both `localDayKey` + `Clock` **and** `estimateOneRepMax`.
  `localDayKey` proves the injected-timezone case and is foundational for
  Phase 2 daily rollups; `e1RM` proves the pure-formula case.
- **Services DB access:** the global `db` proxy from `@workspace/db`. Services
  import `db`; tests inject PGlite through the existing `setDb` seam. This
  matches the current routes/middleware, adds no boilerplate, and reuses the
  seam already proven by the 16 integration tests. (Explicit `db`-parameter DI
  was considered and rejected as redundant ceremony.)

## Architecture

```
route handler (transport: auth, parse, status codes, zod response)
      │  calls
      ▼
service  (I/O orchestration: db reads/writes)  ──calls──▶  @workspace/db (db proxy)
      │  calls (Phase 2+)
      ▼
@workspace/domain  (pure, I/O-free rules; injected Clock / timezone)
```

`lib/domain` never imports `db`, express, or any I/O. Services are the only
layer that touches both `db` and `lib/domain`. Routes never touch `db`.

### New package `@workspace/domain` (`lib/domain/`)

Mirrors `@workspace/api-zod`: `exports: { ".": "./src/index.ts" }`, composite
tsconfig extending `tsconfig.base.json`, **zero runtime dependencies** (pure
math + built-in `Intl`). Adds a `test: "vitest run"` script and a `vitest`
(catalog) devDep so root `pnpm test` (`pnpm -r --if-present run test`) runs its
tests. `tsconfig.json` excludes `src/**/*.test.ts` from the `tsc --build`
composite emit so the library's declaration output stays clean.

```
lib/domain/
  package.json      — @workspace/domain, exports ./src/index.ts, test script, vitest devDep
  tsconfig.json     — composite, emitDeclarationOnly, extends base, excludes *.test.ts
  src/
    clock.ts        — interface Clock { now(): Date }; export const systemClock
    localDay.ts     — localDayKey(instant: Date, timeZone: string): string  // "YYYY-MM-DD"
    e1rm.ts         — estimateOneRepMax(weightKg, reps, formula?): number
    index.ts        — barrel re-exporting the above
    localDay.test.ts
    e1rm.test.ts
```

**`clock.ts`** — the injected-time seam. `interface Clock { now(): Date }` and
`systemClock: Clock = { now: () => new Date() }`. Domain functions that need
"now" receive a `Clock`; they never call `new Date()` directly. Tests pass a
fixed-time fake.

**`localDay.ts`** — `localDayKey(instant: Date, timeZone: string): string`
returns the user-local calendar day as `"YYYY-MM-DD"` for the given IANA zone,
via `Intl.DateTimeFormat` (`en-CA` / `formatToParts`). Pure: the instant is
passed in, not read from the clock. Assumes a validated IANA `timeZone`
(validation is P1-5's job at the write boundary); an invalid zone throws
`RangeError` from `Intl`, which is documented on the function.

**`e1rm.ts`** — `estimateOneRepMax(weightKg, reps, formula: "epley" |
"brzycki" = "epley"): number`. Epley `w*(1+reps/30)`, Brzycki `w*36/(37-reps)`.
`reps === 1` returns `weightKg` exactly (both formulas agree). Guards
`reps < 1` (throws) and `reps >= 37` for Brzycki (formula domain).

### Services layer (`api-server/src/services/userService.ts`)

Uses the global `db` proxy. Pure moves of existing logic — signatures return
the Drizzle row types.

```
provisionUser({ clerkUserId, email }): Promise<User>
      ← the onConflictDoUpdate upsert currently in requireAuth.ts
getUserById(userId): Promise<User | undefined>          ← me.ts GET /me
updateUser(userId, patch): Promise<User | undefined>    ← me.ts PATCH /me
getProfile(userId): Promise<Profile | undefined>        ← me.ts GET /me/profile
upsertProfile(userId, input): Promise<Profile>          ← me.ts PUT /me/profile
      (incl. the full-replace null-defaulting of optional columns)
```

`requireAuth.ts` and `me.ts` become thin: they keep auth extraction, zod
request parsing, HTTP status codes, and zod response parsing, and delegate all
DB work to `userService`.

### Wiring

- `pnpm-workspace.yaml`: no change — the `lib/*` glob already covers
  `lib/domain`.
- Root `tsconfig.json`: add `{ "path": "./lib/domain" }` to `references`.
- `api-server/package.json`: add `"@workspace/domain": "workspace:*"`.
- `api-server/tsconfig.json`: add `{ "path": "../../lib/domain" }` to
  `references`.
- Run `pnpm install` to link the new package.

### `PRODUCT_RULES.md` (cut-main root, alongside `ARCHITECTURE.md`)

Short stub. Establishes the invariant: **all deterministic product rules live
in `lib/domain` — pure, I/O-free, with an injected clock/timezone. Services
orchestrate I/O and call domain. Routes and screens stay thin and never embed
rule logic.** This is the pointer future sessions (and Replit Agent) reference
so rules never leak back into handlers.

## Testing (TDD)

- **`lib/domain`** (write tests first, red → green):
  - `localDayKey`: `2026-07-12T02:00:00Z` → `"2026-07-11"` in
    `America/Los_Angeles` but `"2026-07-12"` in `Asia/Dhaka`; a midday instant
    is stable across a range of zones; a DST-boundary instant is correct.
  - `estimateOneRepMax`: `reps === 1` returns the input weight; Epley 100kg×10
    ≈ 133.3; Brzycki 100kg×5 = 112.5 (choose a rep count where the two formulas
    diverge — they coincide at exactly 10 reps, both = 4/3); `reps < 1` throws;
    Brzycki `reps >= 37` throws (formula domain).
- **`userService`**: the refactor must keep the existing 16 api-server
  integration tests green (they drive the routes end-to-end). Add 1–2 direct
  unit tests for the provisioning idempotency path (same `clerkUserId` twice →
  one row, second call returns the existing row).

## Verification gate

```
pnpm install
pnpm run typecheck   # composite build now includes lib/domain
pnpm run test        # 26 existing (16 api-server + 10 cut-os, still green) +
                     # ~5 new lib/domain tests + ~2 userService unit tests
```

## Risks / notes

- Including `.test.ts` under a composite lib could pull `vitest` types into the
  `tsc --build` emit; excluding test files from `lib/domain/tsconfig.json`
  avoids this. Confirm `tsc --build` stays green after wiring.
- `localDayKey` correctness hinges on the runtime having full ICU timezone
  data. Node v25 ships full ICU by default; note it so a stripped runtime is
  caught early.
- This branch is stacked on `claude/phase-0-audit-fixes` because P1-3 depends
  on the `setDb` seam, vitest infra, and migrations that live only there.
  Rebase onto `main` once PR #1 merges.
