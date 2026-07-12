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
