# CUT OS — QA Report

> Spec §2: a control counts as implemented only after the interaction was
> exercised in the running iOS simulator; hardware behavior on a real iPhone.
> This report does not claim PASS for anything that was not actually run.

## Codex continuation — August 3, 2026

| Gate item                       | Result           | Evidence                                                                                                        |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| TypeScript gate                 | PASS             | Root `pnpm run typecheck` passed across libraries, API, mobile, mockup sandbox, and scripts.                    |
| Automated tests                 | PASS             | 97 tests: domain 16, database 4, mobile 10, API 67.                                                             |
| Generated API contract          | PASS             | Orval regenerates React Query client and zod 4 validators from `openapi.yaml`; mutator parsing no longer hangs. |
| Production-style iOS export     | PASS             | Expo/Metro bundled 1,716 modules and emitted the iOS Hermes bundle plus assets.                                 |
| Database migration              | PASS             | Blank PGlite database builds `users`, `profiles`, and `weight_entries`; adoption-safe baseline reapply passes.  |
| Today state                     | PASS (automated) | User-local day and deterministic Next Action fixtures.                                                          |
| Daily weigh-in create/update    | PASS (automated) | API/service tests save and replace today's weight.                                                              |
| Double-tap duplicate protection | PASS (automated) | Repeated same-day writes return the same ID and one row.                                                        |
| Cross-user weight isolation     | PASS (automated) | User B's history remains empty after User A logs weight.                                                        |
| Metric/imperial conversion      | PASS (automated) | Shared domain conversion round-trip and display rounding tests.                                                 |
| Native Today UI typecheck       | PASS             | Generated hooks, weight editor, retry/error/loading states compile.                                             |
| Native simulator tap-through    | BLOCKED          | Full Xcode/Simulator is not installed on this Mac; a configured Clerk development build is also required.       |
| Real iPhone interaction         | BLOCKED          | Device, development build, and owner authentication required.                                                   |

### Required next native script

1. Sign in and complete onboarding.
2. Confirm Today shows **Log your morning weigh-in**.
3. Enter a weight in the selected unit and double-tap Log.
4. Confirm one saved entry, **WEIGH-IN COMPLETE**, and Next changes to **Build your first balanced meal**.
5. Kill/relaunch and confirm the saved weight and new Next Action remain.
6. Update the same day's weight and confirm it replaces rather than duplicates.
7. Sign out and confirm protected data is inaccessible.

## Status summary (Phase 0)

Phase 0 scope: mobile artifact, TypeScript architecture, database +
migrations, auth proof, test setup. The full acceptance matrix (spec §25
A–T) targets Phases 1–8 features and cannot be executed yet; only the
Phase 0 gate items are reportable.

| Gate item                            | Result                   | Environment                    | Evidence                                                                                                                                                                 |
| ------------------------------------ | ------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native preview boots                 | NOT RE-VERIFIED IN AUDIT | Replit iOS simulator           | Original build notes in `.agents/memory/` describe verified sign-in → `/today` round-trips, but no QA record was committed. Must be re-run and recorded before Phase 1.  |
| Auth identity proof                  | PASS (automated)         | vitest + PGlite                | `artifacts/api-server/src/routes/me.test.ts`: unauthenticated requests 401; authenticated requests resolve a stable internal user id; Clerk id never leaks in responses. |
| DB read/write for authenticated user | PASS (automated)         | vitest + PGlite                | Same suite: JIT provisioning (idempotent under concurrent first requests), PATCH /me persistence, profile PUT/GET lifecycle.                                             |
| Cross-user access blocked            | PASS (automated)         | vitest + PGlite                | "cross-user isolation" suite: user B cannot read user A's profile; B's writes never touch A's rows; all scoping is by server-resolved identity.                          |
| Migrations                           | PASS (automated)         | vitest + PGlite                | Test DB is built exclusively from `lib/db/migrations`; drift between schema and migrations fails the suite.                                                              |
| Typecheck/build gate                 | PASS                     | local (darwin), Node 24 target | `pnpm run typecheck` green across all packages (was red at Phase 0 HEAD — see PHASE_0_CLAUDE_AUDIT.md P0-1).                                                             |
| Test setup                           | PASS                     | vitest                         | 24 tests across api-server (14) and cut-os (10). Run: `pnpm run test`.                                                                                                   |

## Simulator / real-device items

| Item                                                        | Result                                                                                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Simulator tap-through of auth + onboarding + today          | BLOCKED — SIMULATOR REQUIRED (not executable in this audit environment; re-run in Replit iOS simulator and record here) |
| Expo Go on physical iPhone (haptics, keyboard, persistence) | BLOCKED — REAL DEVICE REQUIRED                                                                                          |

### Five-minute Expo Go script (spec §26)

1. Cold-launch CUT OS in Expo Go; confirm no red screen.
2. Sign in with a test account; confirm `/today` loads your plan.
3. Kill and relaunch; confirm you stay signed in and data persists.
4. Tap **Edit plan**; confirm every field shows your saved values
   (regression check for the Phase 0 data-loss fix), change nothing, save,
   re-open, confirm values are unchanged.
5. Sign out; confirm protected screens are unreachable; sign back in.

## Known limitations

- Email on the internal user record depends on an `email` claim in the Clerk
  session token; default session tokens may not include it (audit finding
  P1-2 in PHASE_0_CLAUDE_AUDIT.md).
- No simulator/device QA was performed as part of this audit run; automated
  coverage above is the verified evidence.
