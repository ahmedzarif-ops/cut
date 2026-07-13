# CUT — lean master handoff (in-repo canonical)

> "Resume from handoff" reads this + the workspace master `../HANDOFF.md` (parent directory,
> Zarif's original protocol file — kept in sync, points here for kit-era detail).
> One START-HERE block only; history lives in [sessions/INDEX.md](sessions/INDEX.md).

## CURRENT START-HERE (S01 → S02)

- `main` @ green, **82 tests**, clean tree, no open PRs. All P1s done EXCEPT P1-9/10 and P1-4.
- **First move next session: P1-9/10** — zod ^4 catalog migration + `codegen:check` drift gate
  (audit §P1-9/§P1-10 in `PHASE_0_CLAUDE_AUDIT.md`). Owner already authorized ("keep going",
  2026-07-12); ledger kickoffs were rescinded only to restart fresh — re-append on start.
  Gotchas: `.agents/memory/orval-zod-codegen.md` (`format: uuid` ban — retiring it IS part of P1-9),
  `minimumReleaseAge` supply-chain gate on the zod bump, re-run api-spec codegen after contract edits.
- **Second: P1-4** atomic onboarding (flag inside profile-upsert transaction, reject flag-only PATCH).
  May run parallel to P1-9/10 ONLY with worktree isolation (shared-checkout agents collided in S01).
- Then re-raise the **Replit simulator QA** ask (cost-gated; carries the Cyrus edge-header check).

## RUNNING QUEUE

1. P1-9/10 — zod ^4 + codegen drift gate (parked, authorized)
2. P1-4 — atomic onboarding transaction (parked, authorized)
3. Replit simulator QA (owner-gated cost; declined 2026-07-12, re-raise)
4. EXPO_PUBLIC_* → app.config.ts / EAS per-profile env (payback before RevenueCat purchase QA)
5. eas init + EAS builds (owner account + cost)
6. P2 backlog per audit; shared Redis rate-limit store; Clerk user.updated email webhook
7. GTM lane (needs no code): first blog post / social off `kb/message-spine.md` — owner's call
8. Prune stale remote branch `p1-2-6-7-server-hardening` (GitHub UI, owner)

## LOCKED DECISIONS (supersede, never silently reverse)

- Bundle id **com.zarifahmed.cut** (locks at first App Store submission).
- Cost rule: ask BEFORE any Replit/paid-API/usage spend.
- Twin never self-merges its own PRs; owner taps merge.
- owner.is_technical=false → plain English + starred recommendations.
- helmet ^8.2.0 pin rationale; apiLimiter before clerkMiddleware; storage metric-only;
  PUT profile = full replace; no health values in URLs/logs/analytics (GTM §6).
- ICP beachhead = repeat cutter (`kb/icp-research.md`); message spine = `kb/message-spine.md`.

## ACTIVE DECISIONS (CEO Twin ledger)

- None pending — all escalations resolved 2026-07-12 (see `ops/decisions/ledger.jsonl`).
- No lane-widening/auto-promotions yet (ratchet needs 5 clean matches).

## PERSISTENT REFERENCE

- Repo: github.com/ahmedzarif-ops/cut (gh CLI as ahmedzarif-ops). pnpm 10, Node 25, no local Docker —
  api-server tests use PGlite from committed migrations.
- Commands: `pnpm run typecheck` · `pnpm run test` (82) · db workflow via `@workspace/db` filters ·
  api-spec codegen REQUIRED after openapi.yaml edits. cut-os `build.js` = Replit-only.
- Company OS: facts in `company.yml` + `kb/`; Twin brain `kb/owner-profile.md`; ledger
  `ops/decisions/ledger.jsonl`; briefs `ops/briefs/`. Exa search free via mcporter (config committed).
- Workspace master handoff: `../HANDOFF.md` (parent dir) — Zarif's resume protocol reads it first.
- arch-page: none maintained yet (arch-map cadence N/A).

## SESSION INDEX

- **S01** — kit installed+interviewed; ICP+spine shipped; PRs #3–#6 merged (82 tests); P1-9/10+P1-4 parked next — [sessions/S01.md](sessions/S01.md)
