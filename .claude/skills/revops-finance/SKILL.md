---
name: revops-finance
description: >-
  The RevOps and Finance engine and the company's metric source-of-truth. Use for the weekly
  revenue/finance brief, the monthly close, cohort analysis, unit economics (CAC, payback, LTV,
  contribution margin), cash forecast, and runway. Pulls live billing/payments plus your product
  database plus manual analytics figures, dispatches the read-only revops-finance-analyst, and feeds
  the CEO cockpit. Read-only on billing and payments (never mutates, so it is safe to run anytime).
  Reach for this whenever the user mentions revops, finance, revenue, MRR, cohorts, unit economics,
  CAC, LTV, contribution margin, cash forecast, runway, or monthly close, or asks how the business is
  doing on money or how much cash is left, even if they never say the word skill.
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs a self-improvement loop through `learnings.md` in this skill dir:
- **Ground:** before dispatching the agent, read `learnings.md` in this skill dir (run log, open gaps,
  what-works) and pass it into the agent's context along with its canonical knowledge files and your config.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook. Put proposed canonical-file changes under
  "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

# RevOps & Finance

The company metric source-of-truth. Runs IN the main session so it can pull live data (a billing/payments
MCP, your product database). Dispatches the read-only `revops-finance-analyst`, writes the RevOps brief to
`ops/reports/revops/`, and hands it to the Chief of Staff (the `company-operating-system` skill renders the
cockpit scorecard). Read-only on external systems: it reads billing but does not write, because refunds and
subscription/price/billing changes are owner-only and must not happen from a metrics run.

Canonical metric definitions and the RevOps playbook this skill depends on live in `references/` and in your
metric dictionary - consult them so the brief matches the agreed definitions.

## Commands
- weekly (default) -> the revenue/finance brief
- monthly-close -> the fuller monthly review
- cohort | unit-economics | cash-forecast -> focused analyses
- metric-dict -> review/update `ops/company/metric_dictionary.yml` definitions

## Step 1: Mode + period
Default weekly, "week ending <today>". Note the most recent file in `ops/reports/revops/`.

## Step 2: Pull data (read only)
- Billing/payments MCP (e.g. a Stripe MCP), if connected: active subscriptions, MRR, new/churned subs,
  payments for the period. If it is not connected, record "billing MCP not connected" and proceed with NO
  DATA for revenue - wire to your own payments provider before relying on this lane.
- Your product database (e.g. Supabase/Postgres), read-only: contact/lead counts.
- Manual analytics (e.g. GA4/Search Console): figures the owner pasted this run, else NO DATA.
- Your product catalog module: current prices (or `company.yml` -> `offer.pricing_notes`).
- `ops/company/cash.local.yml`: read if present (git-ignored); else cash-forecast reports "run the cash
  interview".
Do not call any billing write / refund / subscription-mutation tool - reads only, since mutations are
owner-only and out of scope for a metrics pull.

## Step 3: Dispatch the analyst
Agent tool, subagent_type `revops-finance-analyst`, with the mode, period, and the data block (billing +
product-database + manual + `cash.local.yml` contents). It returns the labelled brief sections.

## Step 4: Write the brief + hand off
- Write `ops/reports/revops/YYYY-MM-DD-revops-brief.md` from the returned sections.
- Write a handoff to the chief-of-staff (via your agent-handoff template) so the cockpit scorecard +
  primary-revenue-constraint flow up to the `company-operating-system` skill.
- Give a short in-chat readout leading with the primary revenue constraint + any owner decision.

## Cash interview (first run / on request)
Ask the owner for cash on hand, monthly burn, and any expected inflows; compute runway; write
`ops/company/cash.local.yml`, which stays git-ignored (do not commit it - it holds sensitive cash/runway
figures). `ops/company/cash.example.yml` documents the shape.

## Rules
- Read-only on all external systems; never write to billing/payments/CRM; never change prices/spend.
- No fabrication: report missing inputs as NO DATA rather than inventing them, because invented numbers
  would corrupt the metric source-of-truth the cockpit trusts. Defer to metric_dictionary definitions.
- The agent does the synthesis; this skill pulls data + writes artifacts into `ops/reports/` only.
- Voice-clean per `company.yml` -> `brand.voice` (no em dashes, no emojis by default).
