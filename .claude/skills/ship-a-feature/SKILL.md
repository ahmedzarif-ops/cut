---
name: ship-a-feature
description: Run the company's full build loop end-to-end with conventions and gates baked in. Use to take any substantive build from idea to shipped — a website or code feature, a new skill or agent, a page, a deck, or a content engine. Reach for it whenever the user kicks off a substantive build, even if they never say "skill" or "loop". Triggers include "build a feature", "ship this", "let's build X", "run the build loop", "new skill/agent/page", "take this from idea to done". Orchestrates brainstorm, spec, plan, build, verify, report, handoff, then deploy — chaining the existing skills (it points to them, never replaces them) and inserting the gate roster plus conventions. Owner approval is never automated away.
---

# /ship-a-feature

## The operating loop
Work ships as: idea, then gated, tested, reviewed, shipped, with the owner approving the decisions that
matter. This skill is that loop, codified. An engineer follows it as the runnable build process; a partner
or buyer reads the same page as proof of the human-in-the-loop model that makes "AI runs the company" safe
to sell. It chains the skills you already have; it does not duplicate them.

## Right-size it first
- **Use the full loop** for any substantive build: a feature, a new skill/agent, a page, a deck, a content
  engine, an ops tool.
- **Skip it** for trivial mechanical edits (a typo, a one-line copy tweak) and for conversational answers.
  Scale the loop to the work; don't ceremony a typo.

## The loop — each phase: invoke, then overlay, then checkpoint

1. **Frame** — invoke `build-patterns` to pick the shape (skill vs specialist subagent vs team) and ask
   "is this also a product feature?". If the work is customer-facing, ground it in the ICP research doc at
   `company.yml` → `icp.research_doc` and the brand/message KBs under `company.yml` → `kb_dir`. If a needed
   fact is missing, run ICP research first — never invent customer facts.
2. **Brainstorm** — **run through the `grill` protocol**: the owner is
   interviewed one dependency-ordered question at a time with a starred recommendation per question (never a
   bulk list); facts come from the code graph / the KBs, only decisions go to the owner. Bring the relevant
   specialist in as input (see the gate roster). **HUMAN GATE: the owner approves the design before any
   build** — a wrong direction is cheapest to catch here, before code exists.
3. **Spec** — write the dated `docs/specs/YYYY-MM-DD-<topic>-design.md`. Run the specialist gate(s) on the
   design. **HUMAN GATE: the owner reviews the spec.**
4. **Plan** — write the dated `docs/plans/YYYY-MM-DD-<topic>.md`.
   For a large or one-way-door build, run the `grill` deep mode: seats/reviewers grill the draft plan
   (agent-to-agent), then an independent adversarial consensus pass (cap 3 rounds) BEFORE building.
5. **Build** — execute the plan task by task (inline is the default), dispatching parallelizable tasks to
   subagents when it helps.
   **Offloading the coding leg to a separate external executor is an OPTION, not a rule:** hand it out
   only when judgment says a cheaper executor loses nothing (well-bounded, well-specified, lower-stakes work);
   heavy or trust-critical builds stay on your primary model. Any offload carries a SELF-CONTAINED spec (the
   external executor sees none of your skills/tools/code graph), the returned diff is reviewed independently
   before integration, and offloaded output NEVER commits unreviewed. TDD. **Commit-per-task** (conventional
   commits, no feature branch by default). Any generated artifact gets a zero-dep tested helper + a
   drift-guard test.
6. **Self-iterate — the inner eval-loop (REQUIRED before any review gate).** The coding agent runs the ship
   bar on its OWN work and self-corrects to green *before* surfacing anything to a human or an independent
   gate — this turns your after-the-fact checks into an inner feedback loop instead of a hand-off QA queue.
   Loop these two until BOTH are clean:
   - **Ship bar:** test suite green + config validation clean (validate `company.yml` / any generated config)
     + production build clean.
   - **LLM-judge on your own diff:** self-dispatch a review agent (a general-purpose agent) over `git diff`
     against a 4-point rubric — (1) does it do what the plan/spec said, (2) any obvious bug or unhandled edge,
     (3) convention/style adherence (`CLAUDE.md` + the neighbouring code), (4) is the change covered by a test —
     asking it to return `pass` or a concrete fix-list.
   Apply every fix, re-run the bar and the judge, and loop until the bar is green AND the judge returns `pass`.
   Only then hand to the review gates (step 7). Skipping this is sliding back to "vibe coding" — shipping
   unverified vibes and making the human gates do the coding agent's own QA. Keep it proportionate: this is a
   fast self-check the coding agent owns, not a second heavyweight gate. It **extends CI inward** — the same
   bar your CI runs on every push/PR runs here first, on the agent's own diff, so CI stays the deploy-side
   backstop while the inner loop catches issues one layer earlier, before the human/PR gate ever sees them.
   - **LLM surfaces — run the red-team checklist (mandatory inside the security gate):** if the build touches
     an LLM surface (a content-engine route, an agent/MCP tool boundary, a tenant-facing AI feature), run the
     manual LLM red-team checklist (`security/references/llm-red-team-checklist.md`) against a non-prod/shadow
     surface — direct/indirect injection, jailbreak, PII/secret + cross-tenant leak, tool abuse, unsafe output,
     over-claim. The coding agent runs it early here as a self-check; **the security gate (step 7, Cyrus) then
     runs it as a REQUIRED pass for any LLM-surface build, and a Critical/High finding BLOCKS.** It is folded
     into the existing security gate — NOT a separate new gate — so non-LLM builds are unaffected. A
     hallucinated *claim* routes to the compliance gate (Gus), not a code fix. A golden-prompt regression suite
     is instantiated per-surface only when a live LLM surface needs ongoing regression coverage (YAGNI — no
     standing fixture is built speculatively).
7. **Review gates** — the ship bar is already green from step 6, so the gates open on a clean base. Run the
   independent **adversarial review** (a general-purpose or code-review agent, refute-by-default) for
   anything substantive, then the **gate roster**
   below. These are independent, fresh-lens reviews (Knox judges the diff as if a stranger wrote it, an
   external reviewer from scratch) — deliberately distinct from step 6's self-judge, which is why the inner
   loop *precedes* but never *replaces* them.
8. **Report** — write `ops/reports/YYYY-MM-DD-<topic>-build.md` (shipped, gate results, test delta, commit
   list, follow-ons).
9. **Handoff** — invoke `handoff-refresh` (writes the session log, refreshes the lean master, updates the
   queue + locked decisions).
10. **Deploy** — for any **BIG CLIENT-FACING build**, the FINAL pre-deploy step is an INDEPENDENT adversarial
    review over the diff/branch from a fresh, unbiased, from-scratch lens (a separate external adversarial-review
    agent), because self-review is too lenient; fold its blocking findings before presenting the deploy (in addition to
    the specialist gates + the whole-branch review; skip for internal tooling/docs). Then **OWNER-GATED** — a
    prod deploy is irreversible and customer-facing, so it stays the owner's call: the auto-mode safety gate
    blocks an unauthorized prod deploy and the owner re-authorizes per deploy (by default prior approvals don't
    carry over, unless the owner pre-authorizes a specific deploy). Then invoke `deploy-and-verify` and paste
    the PASS/FAIL summary into the handoff. (Skip this phase for internal/docs/ops-only work — the loop still
    ends at Report + Handoff.)

## Gate roster by exposure (pick the gates from what you're building)
| The work touches... | Gate (nickname) | How |
| --- | --- | --- |
| external / marketing copy (site, ads, email, decks, social) | **Gus** | `content-compliance-reviewer` (via `compliance-review`) |
| legal / contract / privacy / claims / using AI imagery | **Lex** | `legal-aid` (via `legal`) |
| brand / visual / layout / WCAG-AA | **Iris** | `creative-director` |
| AI slop / generic / templated / "could a competitor copy this" (content or design) | **Vera** | `slop-check` (the `ai-slop-critic` agent); fold every block finding. Sibling to Gus (claims) and Iris (final taste) |
| auth / payments / customer-PII / RLS / the AI features / the product / dependencies | **Cyrus** | `security-engineer` (via `security`) — Critical/High findings are deploy-blocking; for **LLM-surface builds** Cyrus MUST run the LLM red-team checklist (`security/references/llm-red-team-checklist.md`) as a required pass |
| a world-acting tool: adds a `tools:`/MCP write-tool to a model call, OR a new side-effecting endpoint | **the tools prerequisite wall** + **Cyrus** | HARD INVARIANT: no such diff ships until the action passes a governed boundary (trusted tenant context, registered action, idempotency key + payload-hash, atomic budget/cap, reaper/timeout, payload-bound approval where policy requires). Encode the boundary matrix as tests. Routes through Cyrus. BLOCKING |
| code change | adversarial **code review** | a code-reviewer / general-purpose agent, refute-by-default |
| code change: clean code / readability / maintainability / "can the next human work on this" | **Knox** | `clean-code-review` (the `clean-code-critic` agent); reviews every diff as if a stranger wrote it; clean-code lane only (routes correctness + security out); fold every blocker; BLOCKING (cleanliness below 60). Sibling to the adversarial code review (correctness) + Cyrus (security) |
| big client-facing build, FINAL pre-deploy | **external reviewer (independent)** | a separate external adversarial-review agent — adversarial diff/branch review from a fresh unbiased lens; blocking findings fixed before deploy |
| internal tooling / docs only | correctness/completeness review only | a general-purpose review agent |

Run the relevant specialist at brainstorm (input), spec/plan (review), and final build (sign-off).
A compliance or legal **FLAG is a human gate** — surface it; never ship past it.

## Human gates (where the loop stops for the owner)
Three: **design approval**, any **compliance/legal FLAG**, and **deploy**. Everything between runs
autonomously (the owner's action-over-questions default; execution is inline unless parallelism is needed).

## Conventions (pointers, not restated)
See `CLAUDE.md` "Core conventions": dated specs/plans under `docs/`, commit-per-task, zero-dep tested helpers +
drift guards, the ship bar, owner-gated deploy, and KB grounding for customer-facing work (`company.yml` +
`kb_dir`).

## This skill chains, it does not replace
It invokes: `build-patterns` (shape), the `grill` protocol (brainstorm + plan stress-test), an independent
code-review agent, the specialist agents (Gus/Lex/Iris/Vera/Cyrus/Knox), `handoff-refresh`, and
`deploy-and-verify`. Read those for the detail of each step; this skill is the order, the overlay, and the gates.
