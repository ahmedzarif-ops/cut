# CUT — lean master handoff (in-repo canonical)

> "Resume from handoff" reads this + the workspace master `../HANDOFF.md` (parent directory,
> Zarif's original protocol file — kept in sync, points here for kit-era detail).
> One START-HERE block only; history lives in [sessions/INDEX.md](sessions/INDEX.md).

## CURRENT START-HERE (S02 → S03)

- `main` @ green, **82 tests**, clean tree. **Two PRs are open and awaiting Zarif's merge tap**
  (the Twin never self-merges) — both reviewed (Knox/Cyrus/fresh-eyes all SHIP) and **mergeable in
  any order** (disjoint files):
  - **PR #7 — P1-9/10**: workspace → zod 4.4.3 + restored `format: uuid` + codegen drift gate.
  - **PR #8 — P1-4**: atomic onboarding (profile + flag in one transaction; server-owned flag).
- **First move next session: merge PR #7 + PR #8** (owner tap), then `git checkout main && git pull`.
  That clears the entire audit P1 list. After merge, main becomes zod 4 with **87 tests**.
- **Two owner decisions then wait** (both in the ledger, non-blocking): (1) **CI enforcement** for
  the codegen gate — it's a local-only tripwire today; enforcing needs GitHub Actions or a Replit
  pre-deploy step (usage-metered → cost gate). Twin rec: minimal GH Actions PR check. (2) **Replit
  simulator QA** (cost-gated; declined before — native app has never booted).
- Then the backlog: EXPO_PUBLIC_* → app.config/EAS env, `eas init`, Phase 1 app shell.

## RUNNING QUEUE

1. **Owner: merge PR #7 + PR #8** (Twin does not self-merge).
2. CI-enforcement decision for the codegen gate (ledger `codegen-gate-ci-enforcement-s02`, pending;
   cost-gated). Twin rec: minimal GitHub Actions PR check (codegen:check + typecheck + test).
3. Replit simulator QA (cost-gated; re-raise).
4. EXPO_PUBLIC_* → app.config.ts / EAS per-profile env (payback before RevenueCat purchase QA).
5. `eas init` (Zarif's Expo account) + first EAS dev build — cost-gated.
6. Client redundant-PATCH cleanup in `cut-os onboarding.tsx` (ledger `p1-4-client-redundant-patch-cleanup-s02`,
   backlog) — remove the now-dead `updateMe` PATCH; do when the app can be run.
7. Phase 1 app shell/tabs (unblocked; `lib/domain` seam exists, spec §29).
8. P2 audit items; shared Redis rate-limit store; Clerk `user.updated` email-refresh webhook.
9. GTM lane whenever Zarif wants (no code): first blog/social off `kb/message-spine.md` — gates Gus/Lex/Vera.
10. Prune stale remote branches (`p1-2-6-7-server-hardening`, `hardening-polish`, `p1-11-native-lane`,
    `p1-8-host-allowlist`) via GitHub UI.

## LOCKED DECISIONS (supersede, never silently reverse)

- Bundle id **com.zarifahmed.cut** (locks at first App Store submission).
- Cost rule: ask BEFORE any Replit/paid-API/usage-metered spend.
- Twin never self-merges its own PRs; owner taps merge.
- owner.is_technical=false → plain English + starred recommendations.
- **Ledger centralized on `main`** — feature-branch PRs stay pure code so they can't collide on
  `ledger.jsonl` at merge time (protects the owner from a merge conflict on their tap).
- **zod pinned `^4.4.3`; `zod-validation-error` `^4.0.0`** (lands when PR #7 merges).
- **`onboardingComplete` is server-owned** — set atomically inside `upsertProfile`; `PATCH /me`
  rejects `false` outright and `true`-without-profile (lands when PR #8 merges).
- helmet ^8.2.0 pin; apiLimiter before clerkMiddleware; storage metric-only; PUT profile = full
  replace; no health values in URLs/logs/analytics (GTM §6).
- ICP beachhead = repeat cutter (`kb/icp-research.md`); message spine = `kb/message-spine.md`.

## ACTIVE DECISIONS (CEO Twin ledger — do not silently re-litigate; reverse only by superseding)

- **`codegen-gate-ci-enforcement-s02`** (pending owner): how to enforce the codegen drift gate.
  Twin rec: minimal GitHub Actions PR check. Cost-gated (metered infra).
- **`p1-4-client-redundant-patch-cleanup-s02`** (pending/backlog): remove the redundant client PATCH
  when the native app is runnable.
- `p1-9-10-zod4-codegen-gate-s02` + `p1-4-atomic-onboarding-s02` logged **executing** — delivered as
  PR #7 / #8; resolve on owner merge.
- `product.scope` is a ratchet-**promoted** class (Tier-B → silent brief line). No new promotions this shift.

## PERSISTENT REFERENCE

- Repo: github.com/ahmedzarif-ops/cut (gh CLI as ahmedzarif-ops). pnpm 10, Node 25, no local Docker —
  api-server tests use PGlite from committed migrations.
- Commands: `pnpm run typecheck` · `pnpm run test` (82 on main; 87 after PR #8) · `pnpm run codegen`
  / `pnpm run codegen:check` (after PR #7) · db workflow via `@workspace/db` filters ·
  api-spec codegen REQUIRED after openapi.yaml edits. cut-os `build.js` = Replit-only.
  Note: `pnpm run build`'s final step fails locally on `mockup-sandbox` (Replit-only env) — pre-existing.
- Company OS: facts in `company.yml` + `kb/`; Twin brain `kb/owner-profile.md`; ledger
  `ops/decisions/ledger.jsonl`; briefs `ops/briefs/` (latest: `2026-07-12-ceo-twin-brief-s02.md`).
  Exa search free via mcporter (config committed).
- Workspace master handoff: `../HANDOFF.md` (parent dir) — Zarif's resume protocol reads it first.
- arch-page: none maintained yet (arch-map cadence N/A).

## SESSION INDEX

- **S02** — CEO Twin away-mode: delivered PR #7 (P1-9/10) & PR #8 (P1-4), both reviewed + mergeable, awaiting owner merge; ledger centralized on main — [sessions/S02.md](sessions/S02.md)
- **S01** — kit installed+interviewed; ICP+spine shipped; PRs #3–#6 merged (82 tests); P1-9/10+P1-4 parked next — [sessions/S01.md](sessions/S01.md)
