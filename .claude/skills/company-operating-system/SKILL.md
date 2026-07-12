---
name: company-operating-system
description: The CEO operating system - the weekly CEO cockpit (one visual dashboard of the current constraint, priorities, approval queue, scorecard, status, and risks) plus monthly and quarterly reviews, decision memos, initiative charters, risk reviews, the approval queue, and the monthly agent-system audit. Reach for it whenever the owner wants to know where the company stands or how it is being run, even if the word "skill" is never said - triggers include "ceo update", "ceo cockpit", "company update", "weekly update", "where do things stand", "run the ceo digest", "operating review", "operating cadence", "approval queue", "decision memo", "initiative charter", "risk review", and "agent audit".
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs the company self-improvement loop:
- **Ground:** before dispatching the agent, read `learnings.md` in this skill dir (run log, open gaps,
  what-works) and pass it into the agent's context along with its canonical knowledge files.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook. Put proposed canonical-file changes under
  "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

# Company Operating System

Turns the `ops/` operating system into a CEO operating cadence. Runs IN the main session (so it can reach analytics MCPs/APIs once they exist). Dispatches the read-only `chief-of-staff` agent for synthesis, renders the weekly cockpit to HTML, writes artifacts into `ops/` after the owner reviews, and opens the cockpit. Internal only; nothing is ever published or sent.

Ground every run in `company.yml` (company name, owner name, offer, ICP, brand voice) - the cockpit's framing, scorecard, and voice come from there, never hardcoded.

`references/README.md` maps the canonical inputs this skill reads (org map, decision rights, agent registry, operating calendar, templates, rubrics, the synthesist agent) - reach for it when you need the exact file behind a step, and keep render/slot detail there if it grows so this file stays lean.

## Commands
- weekly (default) -> the visual HTML CEO cockpit
- monthly | quarterly -> fill the matching template
- decision-memo <topic> | initiative <name> | risk-review | approval-queue
- agent-audit -> the monthly agent-system audit

## Step 1: Identify the mode + period
Default mode "weekly", period "week ending <today>". Note the most recent file in `ops/reports/weekly/` to frame "since last".

## Step 2: Gather sources + analytics
Confirm these exist and pass them to the agent:
- `company.yml`; the `ops/*.yml` config (agent registry, decision rights, operating calendar); `ops/initiatives/registry.md`, `ops/risks/register.md`, `ops/approvals/queue.md`
- the market-radar output (`market-radar` skill), the `blog-engine` skill's `learnings.md`, the `social-engine` skill's `learnings.md`, and the master handoff (`ops/handoffs/HANDOFF.md` - see the `handoff-refresh` skill)
- Hard-number proof lane (pull if present, else note as pending / not-yet-built): any value/ROI benchmark or hours-saved / dollars-saved artifact your data analyst (`data-analytics`) has produced under `ops/data/`, once it exists, plus any tracked strategic-moat initiative's `ops/initiatives/registry.md` row or charter - so the cockpit tracks the company's headline proof number and its biggest bet.
- Analytics: if the owner pasted analytics figures (GA4/GSC/ad-platform), pass them verbatim; else pass the literal token `ANALYTICS_INSTRUMENTED_NO_DATA`. Wire an in-session analytics pull here the day a connector is added (see `company.yml` -> `integrations`); never fabricate a number to fill the scorecard.

## Step 3: Dispatch the agent
Agent tool, subagent_type `chief-of-staff` (the read-only synthesist, persona Casey), with the mode, period, source paths, and analytics block. It returns the labelled markdown sections (### READOUT, ### APPROVAL_QUEUE, ...).

## Step 4 (weekly): Render the cockpit
- Read `cockpit.template.html` and import `render-cockpit.mjs` (mdToHtml, renderCockpit) from this skill dir.
- Map each returned section through mdToHtml, then fill the slots: READOUT, APPROVAL_QUEUE, PRIORITIES, SCORECARD, STOP_START_CONTINUE, STATUS_DIGEST, RISKS_HANDOFFS, DATA_CONFIDENCE, ACTION_NEEDED.
- Fill COMPANY (from `company.yml` -> `company.name`), PERIOD, and GENERATED (today). Set SCORECARD_CLASS to "card" when real analytics was provided, else "card pending".
- Write the result to `ops/reports/weekly/YYYY-MM-DD-ceo-cockpit.html`, then open it (`open <path>`).
- Give a short in-chat readout leading with ACTION_NEEDED.
The render helper is pure + tested; run it in-session via a short node one-liner that imports `render-cockpit.mjs`, fills the slots, and writes the file.

## Step 5: Record decisions (the gate)
The cockpit shows the approval queue as display only, because this skill informs and surfaces the human gate rather than acting on it. When the owner gives a decision in chat (Approve / Approve-with-conditions / Defer / Decline / Request-more-evidence), append it to `ops/approvals/queue.md` and log it in `ops/decisions/YYYY-MM-DD-<topic>.md` (and the running `ops/decisions/ledger.jsonl` if used). Record the decision; don't execute it, since execution stays on the owner-gated rails downstream of the record.

## Lighter modes
- monthly/quarterly: fill `templates/monthly-operating-review.md` / `templates/quarterly-plan.md` from the agent's synthesis -> write to `ops/reports/{monthly,quarterly}/`.
- decision-memo <topic>: fill `templates/decision-memo.md` -> `ops/decisions/`.
- initiative <name>: fill `templates/initiative-charter.md` -> `ops/initiatives/` + append `ops/initiatives/registry.md` (keep <=3 active).
- risk-review: update `ops/risks/register.md` from the agent's risk synthesis (structure: `templates/risk-register.md`).
- approval-queue: show the pending `ops/approvals/queue.md`.
- agent-audit (monthly): run the agent-system audit end to end:
  1. Ground: for each agent, locate its owning-skill `learnings.md`; collect the evidence inputs listed in
     the chief-of-staff agent-audit contract.
  2. Dispatch `chief-of-staff` in agent-audit mode with that evidence. It returns a markdown audit +
     a fenced AUDIT_DATA json block.
  3. Write the markdown to `ops/reports/monthly/YYYY-MM-DD-agent-audit.md`.
  4. Render the visual page: import `renderAgentAudit` from `ops/scripts/render-agent-audit.mjs`,
     pass the parsed AUDIT_DATA, and write the returned HTML string to an internal, noindex-guarded
     page (e.g. `public/internal/agent-audit/index.html`); do NOT add it to the sitemap; wire your
     deploy target's noindex header; deploy is owner-gated, so leave it local until the owner approves.
  5. Route proposals: for every agent whose verdict is Merge, Retire, or New-capability, append a proposal
     row to `ops/approvals/queue.md` and `ops/proposals/ledger.md` (owner + rationale + evidence path).
     These are owner-gated; never mark them done.
  6. Capture (this skill's own loop): append a dated row to `learnings.md` in this skill dir.

## Operating cadence + proposal pipeline

The cadence is defined in `ops/operating-calendar.yml` `meetings:` (the source of truth for when +
who + the throttle knobs). Three tiers nested in the calendar ticks:

- **Daily** - the marketing pod (Mark). See `growth-marketing` `references/daily-growth-meeting.md`.
- **Weekly** - the growth / chief-of-staff / revops cross-functional + departmental briefs feed THIS cockpit.
  The promotion step is manual for now.
- **Monthly/Quarterly** - all-hands. Monthly = synthesized readout; quarterly = real deliberation (dispatch
  the department leads - e.g. Mark/Reva/Petra/Dana - as independent voices, then surface convergence + conflict).

**Proposal pipeline.** Proposals live in `ops/proposals/ledger.md` with the state machine
`new -> scored -> queued -> surfaced -> { approved | approved-with-conditions | deferred | declined |
needs-evidence | merged | parked }` (`needs-evidence` loops to `scored`; mirrors the decision-rights
owner_choices via the ledger's label-mapping table). Score on the priority rubric
(`ops/scripts/priority-score.mjs`); strategic_alignment is scored vs the current `primary_constraint`. Dedupe + a
14-day cooldown + 21-day auto-park keep it from sprawling or stalling.

**One CEO pane.** Lower tiers never page the owner. Proposals reach `ops/approvals/queue.md`
(which this cockpit renders) by clearing the per-tick surfacing cap, ranked by `priority_score` - there is
no fixed numeric threshold, since the rubric informs the ranking but does not replace judgment.
**Owner-grade override:** any proposal whose `decision_tier` is `owner_approval` (per `ops/decision-rights.yml`)
surfaces regardless of score or cap and is never auto-actioned - a one-way-door decision must never be
silently capped out of the owner's view; the cap governs only discretionary proposals.

**Weekly promotion (manual).** In the weekly run (Step 4), before rendering the cockpit: (1) rank the
ledger's `scored`/`surfaced` proposals by `priority_score`, take the top N under the weekly cap (5) PLUS all
owner-grade items; (2) map each into the queue columns - the move -> Decision, owner_agent -> Owner, rationale
-> Recommendation, evidence base -> Evidence, effort+reversibility -> Cost / risk, expected impact ->
Expected upside, plus a Deadline; the owner-choice cell uses the queue vocabulary (Approve /
Approve-with-conditions / Defer / Decline / Request-more-evidence); (3) sweep the ledger and park anything
unactioned >21 days, routing parked items to the monthly/quarterly all-hands. After the owner decides, write the
resolved choice back into the ledger state (per the label-mapping table) to close the loop. All
of this is manual / human-gated (no code auto-actions).

## Rules
- Generate freely (the cockpit only informs + surfaces pending approvals). But NEVER take an external action (no sends, deploys, spend, customer-facing changes); owner-only decisions are recorded, not executed.
- The agent is read-only; the skill writes only into `ops/`.
- Zero fabrication; HTML self-contained + offline; honor `company.yml` -> `brand.voice` (default: no em dashes, no emojis).
