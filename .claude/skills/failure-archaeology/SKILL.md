---
name: failure-archaeology
description: The settled-battles chronicle for your repo — every major investigation, dead end, rejected direction, and revert recorded as symptom → root cause → evidence → status, so no session re-fights a closed fight. Read this BEFORE re-opening any past decision or re-trying a previously failed approach — whenever you're tempted to re-add something the owner already killed, re-install a third-party tool that was already reviewed and rejected, re-open a naming/branding call that was already settled, or resurrect an approach a prior investigation proved unworkable. Also use when asking "didn't we already try this", "why is X not used", "was this rejected before", or "what happened with Y". History and post-mortems only — for live gates and approvals use change-control; for active bug triage use debugging-playbook; for current design decisions use build-patterns.
---

# Failure Archaeology

The chronicle of settled battles: investigations concluded, directions rejected, decisions reversed. Each entry is symptom → root cause → evidence → status. If a proposed action matches an entry here, cite the entry instead of re-investigating — re-fighting a settled battle burns tokens and risks re-shipping a known failure.

**Status vocabulary:** `settled` = closed, do not re-open without a new owner decision. `settled-unless(condition)` = closed until the named condition changes.

## When NOT to use this skill

- **Live change gates / approvals / tiering** → `change-control`
- **Something is broken right now** → `debugging-playbook`
- **Current system design questions** → `build-patterns` (or your project's architecture/design record)
- This skill never authorizes anything; it only records what was already decided.

## How to use an entry

1. Match the proposed action against the chronicle in `references/chronicle.md`.
2. If matched, read the full entry, cite its evidence (session id / decision-ledger id / memory file) to the user, and do not re-litigate.
3. Only a new explicit owner decision (or the entry's named `unless` condition) re-opens a settled battle — route that through `change-control`.

## The chronicle (full entries in `references/chronicle.md`)

Keep a one-line index table at the top of `references/chronicle.md` — a row per settled battle, most-likely-to-be-re-fought first — backed by a full `symptom → root cause → evidence → status` entry below it. On a fresh install the chronicle ships with a few clearly-labelled illustrative entries showing the format; delete or replace them with your own real battles as they settle. Common battle classes worth recording:

- **Honesty walls** — proof/claims the owner ruled out (e.g. fabricated testimonials, unsourced stats). Once ruled out, never re-introduce.
- **Third-party tool rejections** — tools that passed or failed a security review and were adopted pattern-only or barred outright.
- **Naming / branding reversals** — names proposed, cleared, or barred; the settled name and the ones that are dead.
- **Vendor / integration dead ends** — a provider or auth path that proved unworkable at a level a vendor-swap can't fix.
- **Packaging / pricing hard lines** — structural product decisions the owner locked.
- **Unwinnable technical approaches** — an implementation that lost a review battle; the surviving approach and why not to "simplify" back.
- **Recurring self-inflicted failure families** — process traps (see your CLAUDE.md `## Lessons`); cite them instead of re-deriving.

## Provenance and maintenance

Compile every entry from ground truth only — your session handoffs, your decision ledger, your durable memory files, and your CLAUDE.md `## Lessons`. Never infer an entry; every one cites a session id, ledger id, or memory file. Ground the entries in real recorded decisions — never invent a battle that didn't happen.

**To append a new battle:** add one index row here AND a full `symptom → root cause → evidence → status` entry in `references/chronicle.md`, citing at least one durable source. Date-stamp it. Never delete an entry — supersede it with a dated note, mirroring an append-only decision ledger's convention.

**Re-verification pattern:** every entry should be checkable against a durable source. Keep a one-liner per entry that re-confirms it — e.g. grep the decision-ledger id out of your ledger file, grep a keyword out of the cited session handoff, or read the cited memory file. If an entry can't be re-verified against ground truth, flag it rather than trusting it.
