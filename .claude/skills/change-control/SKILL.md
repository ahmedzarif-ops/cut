---
name: change-control
description: The change-control rulebook for this company's repo — how every change is classified (decision tiers, ceo-twin autonomy, the standing autonomy grant), which specialist gate blocks it (compliance/legal/design/security/anti-slop/clean-code + an independent adversarial review), the ship bar it must pass (tests green, config validator clean, build clean, mobile viewport), and why each rule exists. Read this BEFORE making, approving, deploying, or reverting any change — a feature, copy edit, skill/agent, deploy, pricing, outreach, or config change — and whenever asking "do I need approval for this", "which gates apply", "can I just ship it", "is this a two-way or one-way door", "who blocks this", or "why is this rule here". Also the map of what needs the owner versus what the ceo-twin decides. Not for triage/debugging (use debugging-playbook), incident history (use failure-archaeology), or system design (use company-operating-system).
---

# Change Control

How changes are classified, gated, reviewed, and shipped in this repo. Every rule below is a
non-negotiable with its rationale. Company facts are never hardcoded here — they live in
`company.yml` and the knowledge base under `kb_dir` (default `kb/`); this skill points at them.

Siblings (do not duplicate their job here):
- `debugging-playbook` — triage and debugging when something is broken.
- `failure-archaeology` — the full incident history and postmortems.
- `company-operating-system` — what the system's design promises; consult before structural change.

## 1. Classify the change first (decision tiers)

Agents propose; the owner disposes. Four rights levels escalate the further a change reaches:
`analyze` → `recommend` → `prepare_plan` → `owner_approval`. The **owner-approval set** — changes
that always require the owner's explicit go regardless of who proposed them — is:

- pricing / packaging changes
- paid-media spend above the threshold in your config (`company.yml` → offer/integrations; set one
  and enforce it — an agent must never open the spend tap on its own)
- launching a new paid channel
- vendor / contract commitments
- refunds, billing, or subscription changes
- **any public claim about outcomes or customer performance** (see `company.yml` →
  `legal.regulated_claims` for your jurisdiction's rules)
- major positioning changes
- **production deployment**
- access to sensitive customer or financial data
- hiring, policy changes, new market commitments
- anything with material cash, legal, or reputational risk
- acting on any analysis / model / score / experiment result (measurement is decision-support only —
  a score never wires itself to an irreversible action)

Why: one owner runs a company of agents. The owner-approval set is the only thing keeping autonomous
agents from making one-way-door decisions in the owner's name. Keep the canonical list in one place
(your config / decision-rights file) and let it win over this document on any conflict.

### ceo-twin tiers and the standing autonomy grant

The `ceo-twin` skill classifies every decision into three tiers:

| Tier | What | Who decides |
| --- | --- | --- |
| A | Reversible, low-stakes | Twin auto-does it |
| B | Medium, two-way door | Twin decides as the owner under the **standing autonomy grant** — no holds, prominent FYI + easy revert |
| C | One-way doors: the owner-approval set, plus anything that touches a live customer, trips a specialist gate, or is sent from the owner's name/email | Escalate to the owner as an INLINE tap-to-pick (2–4 options, starred recommendation) |

The standing autonomy grant lets the Twin run *preview/staging* deployments and acceptances as the
owner by default (the production promote stays in the owner's hands — see the deploy section); Tier B
is Twin-decided; anything genuinely needing the owner is an inline tap-to-pick answerable from a
phone. Why: the owner wants velocity without being the bottleneck.

Hard limits the grant does NOT relax: the Twin never executes (execution stays on the gated rails),
never crosses an owner-approval line on its own, and production deploys still require the owner's
hands. Every Twin decision is logged to `ops/decisions/ledger.jsonl` (created on first use) with the
reasoning attached.

Precedent worth encoding: a specific owner instruction ("show me before deploying X") SURVIVES a
later general grant. Never let a broad grant erase a narrow hold.

## 2. Pick the gates (the specialist roster)

Choose by exposure, not by habit. **Internal tooling and internal docs need NO specialist gates** —
gating everything jams the pipeline; gates exist for external / brand / legal / security exposure.
The canonical gate-by-exposure table lives in the `ship-a-feature` skill.

| Gate | Persona | Lane | Blocks when | Invoke |
| --- | --- | --- | --- | --- |
| Compliance | Gus | FTC / claims / compliance on external marketing copy | any FLAG (a compliance FLAG is a human gate — never ship past it) | `compliance-review` → `content-compliance-reviewer` |
| Legal | Lex | contracts, privacy, outreach law (anti-spam / consent), AI-imagery claims | flags material legal risk (flags, never binding advice) | `legal` → `legal-aid` |
| Design | Iris | brand / visual / WCAG-AA; also the final `polish` pass | polish score below 85 on customer-facing assets | `creative-director` / `polish` |
| Security | Cyrus | auth, payments, PII, row-level access, LLM-injection, deps | Critical/High findings are deploy-blocking | `security` → `security-engineer` |
| Anti-slop | Vera | AI-slop / distinctiveness on content and design | block findings must be folded | `slop-check` → `ai-slop-critic` |
| Clean code | Knox | clean code / maintainability, every code diff, reviewed as if a stranger wrote it | cleanliness below 60 (owner can override) | `clean-code-review` → `clean-code-critic` |
| Adversarial | independent | independent adversarial correctness review, FINAL pre-deploy step for big client-facing builds | blocking findings folded before deploy | your independent reviewer (a different model than the one that wrote the diff) |

Why the clean-code and adversarial gates exist at all: self-review is too lenient. The clean-code
gate reviews assuming a stranger wrote the diff; the adversarial gate reviews with a genuinely
different model. The class of bug it catches: a route-wiring change that had *silently not applied*,
and an over-broad data-access policy that allowed a delete it shouldn't — both passed the internal
loop clean and were caught only by the independent pass, folded pre-deploy. That is why the
adversarial pass is mandatory before deploying any big client-facing build (skip for internal
tooling/docs).

Standing rule: involve the relevant specialist at EVERY stage — brainstorm input, spec/plan review,
build — not just at the end.

## 3. Build rules (the mechanics of a safe change)

- **Commit-per-task on the main branch**, conventional commits, no feature branch by default. Why: a
  solo-owner org with agent sessions; small reviewable commits ARE the audit trail, and reverts are
  the primary undo mechanism (every Tier-B ledger entry records a claw-back).
- **Zero-dep tested helpers + drift guards.** Logic lives in small, dependency-free scripts with a
  paired test. Why: config files (registries, decision classes, indexes) drift silently without an
  asserting test.
- **Scripted-patch whole-file verify + folds-delete-the-duplicate.** After ANY scripted find-replace,
  grep-verify the OLD string is gone from the WHOLE file and the NEW one is present — a scripted
  patch fails silently on a non-match. A fold adds the shared include AND deletes the page-local
  duplicate in the same pass (a half-fold leaves two owners per behavior). Full treatment: the
  `debugging-playbook` traps.
- **Skill/agent authoring (hard rule):** every new or edited skill/agent goes through the official
  `skill-creator` guidelines and is validated with its `quick_validate.py`. Why: hand-rolled skills
  accumulate bloated frontmatter and weak triggering.
- **Automation runs on your own account/subscription, never an uncapped metered key.** Recurring or
  scheduled agent runs authenticate through your subscription auth, not a raw metered API key. Why:
  metered API is an uncapped bill; the org's economics assume subscription. (Wire this to your own
  automation harness; note plainly where a metered path is genuinely the only one that works.)
- **Model tier:** default every gate/review/subagent to a strong reasoning model at high effort; pin
  the hardest verify/judge to the strongest tier; keep a cheaper model only for the simple content
  lane. Every `.claude/agents/*.md` carries an explicit `model:` pin. The security gate is pinned to
  a model that won't refuse defensive review.
- **Query the code knowledge graph before grep** for where/what/how code questions when one is wired
  up — it is materially cheaper than grepping the tree; blind grep/glob is the fallback.

## 4. External-facing content rules

- **Use the owner's public-facing name, not any internal nickname.** Grep any external asset for an
  internal nickname before it goes out. (Set the public name in `company.yml` → `owner.name`; if your
  org uses a separate internal handle, keep it out of every customer-facing surface.)
- **No fabricated proof.** Never ship fabricated testimonials, reviews, results, or customer counts,
  and never replace removed fabricated proof with new fabricated proof. AI images of
  ICP-representative people ARE allowed, but never framed as real customers/results.
- Public claims about outcomes / rankings / lead volume are in the owner-approval set — Tier C
  regardless of size. Ground every claim per `company.yml` → `legal.regulated_claims`.

## 5. The ship bar (must be green before any deploy is even proposed)

Run from the repo root, seeing each command's own exit code (never pipe to `tail` — that swallows
the failure):

```bash
# 1. Tests green — all drift guards + helpers. Assert the runner's own pass line.
<your test command, e.g. npm test>
# 2. Config validator — must report 0 warnings.
<your config-validate command>
# 3. Build — must be clean.
<your build command, e.g. next build>
```

Plus, for anything with a UI surface:
- **Responsive verify at a real mobile viewport** — load the page in a real browser at phone width
  (~430px, the owner's review device). Why: a clean build and green functional tests do NOT catch a
  broken mobile layout; this applies to HTML deliverables handed to the owner too, not just app UI.
  Respect `prefers-reduced-motion` on animated surfaces.
- **Design `polish` pass** (blocking below 85) on customer-facing assets.

## 6. Deploy (owner-gated, then verify)

1. Big client-facing build? Run the **independent adversarial review** on the diff/branch first
   (section 2).
2. **Nothing ships to production without the owner.** A production deploy is in the owner-approval
   set. Preview/staging deploys are the Twin's vehicle; the production promote is a one-liner handed
   to the owner (often an inline tap).
3. Deploy the committed tree, never a dirty working tree — a production deploy ships the working
   directory, so an uncommitted, un-gated file can go live. Assert the content surfaces are clean
   (`git status --porcelain <surface>` empty) before promoting.
4. AFTER the deploy, run the **`deploy-and-verify`** skill — the encoded smoke battery: 200s per
   surface; correct `noindex` headers on internal / gated / pitch pages (the "forgot the noindex"
   leak is the incident class it exists for); sitemap presence/absence; self-canonical; no
   Review/Rating structured data where it doesn't belong; redirect codes. That skill never deploys —
   it only verifies.
5. Meaningful codebase change landed? Refresh your engineering architecture page (the owner's
   source-of-truth map), regenerate its graph data, bump the footer date, and redeploy on the owner's
   go — at minimum every ~5 handoff sessions.

## 7. Self-learning (how this rulebook grows)

Hard rule: when the owner corrects you or you catch your own mistake, append a one-line rule to
`CLAUDE.md` → `## Lessons` before continuing. Never delete a lesson. If the lesson is
change-control-shaped, also fold it into this skill on the next edit (via `skill-creator`, per
section 3).

## When NOT to use this skill

- Something is broken and you're diagnosing → `debugging-playbook`.
- You want the story of a past failure in depth → `failure-archaeology`.
- You're deciding how a system should be structured → `company-operating-system` and
  `build-patterns`.
- Pure read-only analysis with no change proposed — no gates needed; just do the work.

## Provenance and maintenance

The canonical sources win over this document on any conflict. Re-verify the volatile facts on read:
the decision-rights / owner-approval list and any spend threshold (in your config), the model-tier
policy, and the gate roster (the `ship-a-feature` skill's exposure table). When any of those change,
update the config first and let this skill point at it — never hardcode the value here.
