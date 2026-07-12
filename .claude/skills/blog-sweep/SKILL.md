---
name: blog-sweep
description: The recurring anti-slop backstop for the autonomous blog machine. Re-runs Vera (anti-AI-slop) and Gus (compliance) over every LIVE post, auto-refreshes the single worst failing post ONCE via the surgical blog-updater editor, re-gates it, then either re-publishes the fixed version or holds it for owner review. Detect, fix-once, then hold — its worst case is a post held for review, never slop staying live. Use whenever the user wants to sweep, re-check, or clean up already-published blog posts for AI slop or compliance drift, or to run the scheduled hygiene pass — even if they don't say "skill". Triggers include "run the blog sweep", "monthly slop sweep", "re-check the live posts for slop", "check the blog for AI slop", "blog hygiene sweep", "clean up the published posts".
---
<!-- learning-loop: required -->

# Blog Sweep (recurring anti-slop backstop)

The durability backstop for the autonomous blog machine. The publish path gates NEW
posts at the door; this sweep keeps ALREADY-LIVE posts honest over time as slop
standards rise and stats go stale. It is the scheduled, hands-off sibling of the
human-run surgical `blog-updater`, run on the same "fix once, then hold" discipline.

**Core principle: protect the domain first.** This sweep can only ever make the live
site cleaner. Its worst case is a post sitting `held` in the owner queue, never a slop
post staying live. It re-gates with the same brains as the writer (Vera + Gus), fixes
at most ONE post per run (no mass edits — Google reads those as scaled-content abuse),
and takes nothing live or down that has not passed the same gate the writer clears.

## When it runs
- On a recurring cadence (monthly is a sane default), via whatever scheduled-run
  mechanism you wire up (see "Scheduling" below).
- On demand: "run the blog sweep" / "re-check the live posts for slop".

## What it reuses (one brain, no forks)
- **Vera** the anti-AI-slop critic: `/slop-check <post-text> content` (agent type
  `ai-slop-critic`). Same rubric the writer uses. Detect-and-recommend only.
- **Gus** the compliance reviewer: dispatch `content-compliance-reviewer` on the post
  draft. Same claims/advertising gate the writer uses; ground it in `company.yml` →
  `legal.regulated_claims` / `legal.jurisdiction` (see the `compliance-review` skill).
- **blog-updater** the surgical-edit agent: the only editor of post content here, so
  the surgical-edit discipline and ranking safety live in one place. Surgical edits
  only, never a rewrite of the angle/headline/keyword (that risks the existing
  ranking). It already enforces the no-churn cooldown and the pre-deploy quality gate.
- **Your blog content store** — the module that owns your published set. It must expose
  the live set (all published posts), the existing held queue (rows already held — do
  not re-touch them), and a way to record a sweep result for the dashboard. If your
  blog has no such module yet, wire one to your own store before running the sweep.
- The machine gate criterion (locked): a post PASSES when `SLOP_SCORE >= 80` AND zero
  Vera block findings AND zero Gus block findings. Any deterministic mechanical tell
  (em dash, en dash, emoji, a banned phrase from `company.yml` → `brand.banned_phrases`,
  or any tell in `ops/scripts/slop-tells.mjs`) is an automatic fail regardless of score.

## The sweep, in order

### 0. Ground yourself
Read, every run, before touching anything:
- The `blog-engine` skill's `SKILL.md` and its brand-voice reference (method + voice
  authority). Ground brand judgment there and in `company.yml` → `brand.*`; never
  invent what the brand would or wouldn't say.
- The `blog-engine` learnings log (published registry, what-works, what was already
  refreshed and when).
- The `blog-updater` agent definition (the surgical-fix discipline and STOP conditions
  you inherit).
- The live set: enumerate every currently-live post from your blog content store. A
  common architecture is a **code-defined floor** (posts declared in your blog content
  module) UNIONed with a **DB-published set** (rows published at runtime), with the DB
  row winning on slug collision. Whatever your shape, resolve the merged live set from
  one source of truth, and read the held queue so you never re-touch a held row.

### 1. Re-gate every live post (read-only)
For each live post, in code-first then judgment order:
1. Run the deterministic tells: `slopTells(blockText, { mode: "content" })` from
   `ops/scripts/slop-tells.mjs` over the post's flattened body text. Any
   `severity: "block"` tell = mechanical fail.
2. Run `/slop-check <post-text> content` (Vera) and capture `SLOP_SCORE` + block findings.
3. Dispatch `content-compliance-reviewer` (Gus) and capture block findings.
A post FAILS the sweep if: any mechanical block tell, OR `SLOP_SCORE < 80`, OR any Vera
block finding, OR any Gus block finding. Record each post's result.

### 2. Pick ONE post to fix (worst-first, no churn — mass edits read as scaled-content abuse to Google)
- From the failing set, pick the SINGLE worst offender (lowest `SLOP_SCORE`, ties broken
  by most block findings, then oldest `dateModified`).
- HARD no-churn: skip any post refreshed in the last 14 days unless it has a mechanical
  block tell or a Gus block finding (a genuine correctness/compliance problem overrides
  the cooldown). One post per run. Never loop.
- If nothing fails, STOP fixing (still record the run in Step 5): report "all live posts
  pass". This is the common, healthy outcome.

### 3. Auto-fix ONCE (blog-updater surgical edit)
Dispatch `blog-updater` on the chosen post with the exact Vera + Gus findings to address.
It makes surgical edits only (swap a stale/unsourced stat with a verified, cited one;
remove a banned phrase; fix a mechanical tell; tighten a generic paragraph), bumps
`dateModified` only if it made a real change, and never alters the angle, headline, slug,
or primary keyword.

### 4. Re-gate the fix
Re-run Step 1's three checks on the revised post. Then branch:
- **Now PASSES** and it is a **code-defined floor post** (lives in your blog content
  module): blog-updater has already written the surgical edit into that module. Hand back
  the diff plus the exact owner-gated deploy command; do NOT deploy. (Code-defined content
  ships only via an owner-gated redeploy, per the writer/updater discipline.)
- **Now PASSES** and it is a **DB-published post**: re-submit the refreshed post through
  your blog publish path (the same authenticated endpoint the writer uses, carrying your
  blog-publish auth token). That path re-applies all four code checks and overwrites the
  live row in place (preserving its original publish/created timestamps), so a passing
  refresh goes live with no manual step. Mark the submission as a one-time revision so the
  endpoint knows this is a sweep refresh, not a new post.
- **Still FAILS** after the one fix: HOLD. Do not loop, do not ship.
  - DB-published row: re-submitting through the publish path re-gates and lands the
    refreshed row as `held` automatically. Automatic "retire" is NOT in v1. To retire a
    row (no longer worth ranking) or to unhold one, the owner runs a manual write against
    your database (for example, set `status='retired'` with a held-reason and updated
    timestamp on that slug). Taking live content down or back up is a manual owner action
    by design; the sweep proposes, the owner disposes.
  - Code-defined floor post: it cannot be "held" in the DB (it is code). Report it for an
    owner decision (correct-and-redeploy, or remove it from the published set at next
    deploy). Never silently leave a slop post live; never mass-edit to force it.

### 5. Surface results on the dashboard
Record the run to your blog content store: the run timestamp, checked count, refreshed
count (0 or 1), held count, a per-post list of `{ slug, score, outcome }` where `outcome`
is `"pass"` or `"fail"`, and the next scheduled sweep date. Your status page's "last
sweep" section reads this. The held queue plus this sweep summary is the owner's whole
view of machine hygiene.

### 6. Close the loop (learnings)
Append a dated entry to the `blog-engine` learnings log: which posts were re-gated, the
one fixed (what changed, sources), any held/retired (reason), and any recurring slop
pattern worth promoting to the brand-voice reference (HUMAN review only, never silently
edit the brand-voice file). Commit the learnings.

## Guardrails (these override "fix it")
- **One post per run.** Never loop to fix more than one. Mass edits read as
  scaled-content abuse to Google. The backstop is patient; cadence beats volume.
- **Fix once, then hold.** Exactly one revision attempt per post per run. If it still
  fails, hold and report. Never a second auto-fix in the same run.
- **No fake freshness.** Only bump `dateModified` on a genuine improvement. A date bump
  with no real change is the manipulation Google penalizes.
- **No takedown without owner gate.** The sweep refreshes a slipping DB post by
  re-submitting it through the re-gating publish path. It never flips a row to retired or
  unholds one on its own; retire/unhold is a MANUAL owner action in v1. Code-defined
  changes ship only via an owner-gated redeploy. The sweep itself never deploys code.
- **Stay in lane.** Vera owns slop/distinctiveness; Gus owns claims/compliance;
  blog-updater owns the surgical edit. The sweep orchestrates them; it does not rewrite
  copy itself.
- **Hard exclusions.** Any owner-handled proof surfaces — testimonial components, a
  results quote the owner curates by hand — are off-limits: both critics stay silent and
  the sweep never touches them.

## Scheduling (wire to your own scheduler; ship it INERT until the owner turns it on)
Run the sweep on a recurring cadence via whatever scheduler you own — a CI cron workflow,
a hosted scheduled agent, or an OS timer. A monthly fire (e.g. the 1st of each month) is a
sane default. Prefer a mechanism that gives a fresh headless run per fire with encrypted
secrets and can check out your private repo. Ship the schedule INERT and enable it only at
an owner-gated turn-on; document the turn-on steps and token rotation in your own runbook.

Each run needs your blog-publish auth token (stored as an encrypted secret, matching the
value your production publish path expects) to call the publish endpoint. It re-gates every
live post with Vera and Gus, auto-fixes-once the single worst failing post via blog-updater,
re-gates, then re-publishes via the endpoint or lets it land `held`; one post per run,
14-day no-churn, never deploys code. The cadence rhythm is the schedule; the HARD limits
live in code at the publish path, so an over-firing schedule cannot over-publish or
mass-edit — the safety is enforced at the door, not by the timer.
