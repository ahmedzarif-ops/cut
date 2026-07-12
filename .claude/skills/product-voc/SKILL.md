---
name: product-voc
description: The Product + Voice-of-Customer engine — turns customer evidence into product priorities (Jobs-to-Be-Done, diagnostic/intake insights, opportunity briefs, journey maps, PRD-lite, experiments, roadmap recommendations). Dispatches the read-only product-voc analyst and feeds the Chief of Staff. Use whenever the user wants to understand what customers need or where to take the product — even if they don't say "skill" — including "voice of customer", "product opportunity", "JTBD", "jobs to be done", "customer evidence", "product roadmap", "PRD", "churn analysis", "product discovery", "what should we build next", or "synthesize customer feedback". Consumes but does not do market/competitor research (market-radar), unit economics (revops-finance), or onboarding/health ops (customer-success).
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

# Product + Voice of Customer

Owns the customer-evidence-to-roadmap loop. Runs in the main session so it can reach evidence
sources/MCPs when connected. Dispatches the read-only **product-voc** analyst (Agent tool,
`subagent_type: product-voc`; if that agent isn't wired up yet, run the synthesis inline), writes outputs
to `<kb_dir>/product-voc/` (where `kb_dir` is the value in `company.yml` → `kb_dir`, default `kb/`), and
feeds the Chief of Staff plus the relevant pod agents. **Pre-revenue reality:** early on there is almost
no real customer evidence — seed hypotheses, mark "insufficient evidence" honestly, never fabricate.

## Boundary (do not duplicate)
This engine owns CUSTOMER EVIDENCE -> product opportunity/roadmap. It does NOT do market/competitor
research (market-radar), economics (revops-finance), or onboarding/health/intervention ops
(customer-success). It consumes those and routes to them.

## Commands
- `weekly-insights` (default) -> the weekly VOC brief
- `interview-synthesis <source>` | `opportunity <topic>` | `journey-map <segment>` | `prd <opportunity>` |
  `experiment <hypothesis>` | `roadmap` | `feedback-audit`

## Step 1: Mode + period
Default `weekly-insights`, "week ending <today>". Note the most recent file in `<kb_dir>/product-voc/`.

## Step 2: Build the evidence inventory
Gather only relevant, documented evidence and pass it to the agent. Typical sources (use whichever your
company actually has — most will be absent pre-revenue; pass what exists and label the rest NO/INSUFFICIENT
EVIDENCE):
- Diagnostic / intake / discovery-tool responses (your lead-qualifier or self-serve diagnostic, if any)
- Product / activation events from your analytics or database
- Support, sales, and churn notes
- Email replies and surveys
- Recorded sales/discovery calls (your call-recording tool, if connected)
- The ICP research doc at `company.yml` → `icp.research_doc` (if missing, run ICP research first — never
  invent customer facts) and your message-spine KB (`<kb_dir>/message-spine.md`, if it exists)
- Findings routed in from market-radar
- Your seeded product frameworks under `<kb_dir>/product/`: `segments.yml` (customer segments),
  `jobs-to-be-done.yml`, `evidence-taxonomy.yml` — mark items hypotheses until validated; if these don't
  exist yet, seed them as hypotheses

The deeper framework and method material lives in `references/`; reach for it when you need the detail
behind a step.

**Discovery mode** — for `interview-synthesis`, `opportunity`, or `experiment`, run the continuous-discovery
method in `references/discovery-ost-jtbd.md`: build an Opportunity Solution Tree (desired outcome ->
opportunities -> solutions -> experiments), run the JTBD switch interview (timeline + four forces:
push/pull/anxiety/habit) on your discovery calls and recorded conversations, then size + rank the
opportunity and name its riskiest assumption + smallest test. Read-only: the analyst designs the discovery,
the build loop (ship-a-feature) runs the test.

## Step 3: Dispatch the analyst
Agent tool, `subagent_type: product-voc`, with the mode, argument, and the evidence inventory. It returns
the labelled markdown sections (or a filled template for opportunity/prd/journey-map/experiment). If the
agent isn't wired up, run the same synthesis inline under the same evidence discipline.

## Step 4: Write outputs + hand off
- Write to `<kb_dir>/product-voc/YYYY-MM-DD-<mode>.md`.
- Route feedback to the named agents and write a handoff to the Chief of Staff (using your agent-handoff
  template) into your handoff inbox for any product opportunity needing prioritization or an owner decision.
- Short in-chat readout leading with the most important insight + any owner decision.

## Rules
- Evidence first; zero fabrication (no invented interviews/quotes/usage); Observed/Inferred/Hypothesis
  labels; include disconfirming evidence.
- The agent synthesizes; this skill gathers evidence + writes artifacts into `<kb_dir>/` only. This is a
  read-only evidence-to-roadmap engine, so it stops at writing artifacts and handing off — building or
  deploying product changes belongs to the build loop (ship-a-feature), keeping the evidence lane and the
  build lane cleanly separated.
- Roadmap commitments need owner approval. Voice-clean (honor `company.yml` → `brand.voice` /
  `brand.banned_phrases`).
