---
name: customer-success
description: The Customer Success and Retention engine. Use for customer health reviews, onboarding and activation analysis, at-risk accounts, retention and churn reviews, winback, and advocacy readiness. Reach for it whenever the user mentions customer health, retention, churn, onboarding, activation, at-risk accounts, winback, advocacy, or customer success, even when the ask is casual and they never say the word skill. Dispatches the read-only customer-success analyst, writes dated artifacts under your knowledge base, and feeds the Chief of Staff.
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
- **Ground:** before dispatching the agent, read `learnings.md` in this skill dir (run log, open gaps,
  what-works) and pass it into the agent's context along with `references/frameworks.md`.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical framework. Put proposed changes to
  `references/frameworks.md` under "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner
  to approve.

# Customer Success + Retention

Owns the customer-value lifecycle: onboarding, activation, health, at-risk, retention, churn, winback,
advocacy. Runs IN the main session (so it can reach product/subscription signals when connected).
Dispatches the read-only `customer-success` analyst, writes dated artifacts under
`<kb_dir>/customer-success/` (where `kb_dir` is `company.yml` -> `kb_dir`, default `kb/`), feeds the
Chief of Staff, and routes handoffs. Pre-revenue: no real customers yet - the frameworks are ready;
health and activation render N/A honestly. Never fabricate customers or outcomes.

## Boundary (do not duplicate)
Owns the lifecycle/value layer. Does NOT do finance (revops-finance), product changes/evidence
(product-voc), email sends/copy (email-marketing), or acquisition (growth-marketing). It hands off to
them.

## Commands
- weekly-health (default) | onboarding | activation | at-risk | retention-review | churn-review | winback | advocacy | customer-journey <segment>

## Command notes
- **onboarding -> first-value / week-1 guaranteed-win concierge checkpoint:** hand-hold your earliest
  accounts to a visible week-1 outcome. A customer can log in and still get no result, so logins are
  not the measure of value - real value shows up as the meaningful outcomes your product exists to
  produce (ground these in `company.yml` -> `offer.summary`). Onboarding is not "done" at setup or
  first login; it is done when the account has a visible value-producing result in week 1, and health
  is measured as value-producing activity rather than logins.
- **at-risk -> leading churn signal:** silence in your product's core-value workflow (no meaningful
  outcomes produced) is the leading at-risk indicator. Login frequency is deliberately left out as a
  churn signal - low logins on their own do not flag an account as at-risk, because an account can be
  quiet on logins yet still producing value (or busy on logins yet producing none).

## Step 1: Mode + period; note the latest file in `<kb_dir>/customer-success/`.

## Step 2: Gather signals
Subscription status (your billing provider - `company.yml` -> `integrations`; read-only, via the
revops-finance engine or a direct read), product/activation events (your app's data store),
support/cancellation notes if any, and the frameworks in `references/frameworks.md`. Pre-revenue: most
absent -> pass what exists, label the rest N/A. Never fabricate.

## Step 3: Dispatch the analyst
Agent tool, `subagent_type: customer-success`, with the mode, argument, signals, and
`references/frameworks.md`. It returns the labelled sections.

## Step 4: Write outputs + hand off
- Write `<kb_dir>/customer-success/YYYY-MM-DD-<mode>.md`.
- For any required customer communication: write a handoff to the email-marketing engine
  (segment / trigger / problem / value-before-CTA / CTA / suppression / frequency / success + guardrail
  metrics) - this engine NEVER sends. Product patterns -> product-voc; revenue-at-risk -> revops-finance;
  systemic/high-value/policy -> the Chief of Staff approval queue.
- Short in-chat readout leading with the primary retention risk + any owner decision.

## Rules (safety)
- This engine only analyzes and hands off - it never sends messages or changes
  subscriptions/billing/refunds/discounts/CRM, because customer communication and money changes belong
  to the email-marketing and revops-finance engines and always stay owner-gated. No dark patterns, no
  false urgency. No fabricated outcomes. Advocacy only after verified value + consent.
- The agent analyzes; this skill gathers signals + writes artifacts under `<kb_dir>/customer-success/`
  only. Voice-clean (no em dashes, no emojis).

## Health score helper
`ops/scripts/health-score.mjs` is the zero-dep, company-agnostic health formula (weighted 0-1 dimensions;
returns null if any dimension is missing so an incomplete score is never faked). The weights, bands,
age segments, activation pattern, churn taxonomy, and intervention hierarchy live in
`references/frameworks.md` - map its generic signal names to your product's real workflows before
first use. Defer metric definitions to the revops-finance engine.

Capture what works in `learnings.md`.
