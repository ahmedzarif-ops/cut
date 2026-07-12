# CRO Audit Scorecard

Run this on every generated page (workflow step 5) and on any live surface being audited. It is also
the format for the "highest-priority current-site CRO opportunities" deliverable.

## Grade every page on these dimensions

Score each 0-2 (0 = missing/broken, 1 = partial, 2 = strong) and note the gap:

- Message match (ad → page headline)
- Relevance by segment and traffic source
- Clarity of value proposition
- CTA focus (one most-wanted action)
- Conversion friction
- Form burden (fields, timing of the contact ask)
- Proof density
- Proof specificity
- Segment relevance
- Objection coverage
- Perceived risk (guarantee, cancel terms)
- Pricing clarity
- Offer clarity
- Credibility gap (is the mechanism/claim believable and unintimidating?)
- Alternative comparison (does it beat the buyer's real alternative — see `positioning.md`?)
- Mobile usability
- Visual hierarchy
- Page speed
- Accessibility
- Tracking quality (events fire)
- Post-conversion handoff (the next step is wired)

## Per-issue output block (required for EACH finding)

For every issue found, write all of:

- **Observed problem**: what is wrong (state it as a fact you can see).
- **Why it matters**: the conversion consequence.
- **Framework used**: which copy/CRO framework this draws on (see `copy-frameworks.md`).
- **Impacted funnel stage**: ad / page / checkout / post-purchase.
- **Six-factor category**: Findability / Proof / Clarity / Trust / Responsiveness / Follow-up (see `six-factor-model.md`).
- **Testable hypothesis**: "If we [change], then [metric] will [direction] because [reason]."
- **Recommended treatment**: the specific change.
- **Primary metric**: the conversion metric it should move.
- **Guardrail metric**: what must NOT get worse (e.g. refund rate, bounce).
- **Evidence level**: observed fact / research-backed / hypothesis / needs validation. Keep these separate; never present a hypothesis as a fact.
- **Expected learning**: what we learn whether it wins or loses.

## Honesty separation (always)

Clearly label each item as one of: an observed page FACT, a research-backed RECOMMENDATION, a
HYPOTHESIS, or an EXPERIMENT requiring validation. Do not make unsupported claims about a page or the
business.

## Cold paid traffic (report the split)

For a finding on a cold-paid-traffic page, report the Primary metric SPLIT for cold traffic:
diagnostic/entry-completion rate AND buy rate, tracked separately (see the cold paid-traffic split in
`kpis.md`). A healthy completion rate can hide a weak cold buy rate. When the cold buy rate lags a
healthy completion rate, the Recommended treatment should include the lower-friction cold-entry
fallback test.

## Ranking

Rank findings by likely impact × evidence level. Lead with high-impact, high-evidence fixes (message
match, CTA focus, the fabricated-proof blocker, missing guarantee, broken tracking) before
low-evidence experiments.
