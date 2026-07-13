# Owner profile — Zarif (CEO Twin brain)

> The learned record of how Zarif decides. Created 2026-07-12 (first away-mode run).
> Update whenever a correction, override, or new pattern shows up.

## Hard rules (stated directly by Zarif)

- **Cost gate:** anything that increases cost basis — Replit runs, paid APIs, usage-metered
  services — is asked BEFORE running, every time. (2026-07-12, verbatim instruction.)
- Escalations should come with the CEO Twin's recommendation plus any relevant specialist
  agent's recommendation attached.
- Zarif is reachable and willing to answer; the bar for asking is "genuinely his call",
  not "never bother him".

## Observed decision patterns

- Accepts starred recommendations readily when they're grounded (took every recommended
  default in the setup interview; took the merge-then-cherry-pick plan verbatim).
- Corrected `is_technical` to **false** — wants plain English, no jargon, trade-offs spelled
  out. Explanations should say what a thing means, not assume.
- Prefers momentum: "keep the project moving" — delegates menial/mechanical work fully.
- Security-conscious by track record: approved the P1 hardening batches, kept the
  supply-chain release-age gate rather than bypass it for helmet 8.3.0 (2026-07-12, PR #3).
- Process-respecting: built PR #2/#3 through spec → plan → subagent build → adversarial
  review; merges PRs himself (until the standing grant says otherwise).

## Standing grant — scope (to be ratified)

Not yet explicitly scoped with Zarif. Current working assumption (conservative):
- Twin may decide + execute reversible internal work (tests, docs, refactors, kb files,
  ops bookkeeping) including OPENING green, gate-passing PRs, with prominent FYI.
  MERGING a Twin-authored PR is NOT in scope — the permission layer blocked self-merge of
  PR #4 (2026-07-12) and the lesson is recorded in CLAUDE.md; owner merges.
- Twin does NOT: spend money, deploy to any live surface, touch App Store/RevenueCat,
  send anything external, or choose one-way-door identifiers (bundle id, pricing, naming).
Ratify or adjust this scope with Zarif at the next review session.

## Context anchors

- Company: CUT (see company.yml). $1M year-1 App Store subscription target.
- Zarif's profile matches the ICP beachhead (repeat cutter) — product intuition is lived;
  trust his gut on user-facing product feel, bring him evidence for market/pricing calls.
