# Offer Roles, Central Contrast, and Brand Language

The offer ladder and the paid-acquisition job each rung does. Read this before deciding
which offer a campaign should sell. Read the actual offer names, prices, and links from
`company.yml -> offer` — never quote a stale number from an old kit; if two sources
disagree, `company.yml` wins.

## Central contrast

Do not frame the choice as "use AI vs do not." Frame every campaign as the real
alternative the buyer faces today versus the better system your offer provides. The
generic shape:

> Keep [the painful/expensive/rented status quo the buyer uses now] and keep losing to
> [the more-visible or better-equipped competitor], or build [the owned system your
> offer provides] that brings the outcome directly to them.

Ground the exact enemy and the exact contrast in your message spine (in `kb_dir`). The
enemy is the status quo the buyer already resents, not "old-fashioned people."

## Brand language

Pull from an approved phrase bank grounded in your ICP research and `brand.voice`. Adapt
per channel; keep the register skeptical-buyer, not hype. Build this bank once per
company from the message spine and reuse it. Each phrase should be:

- Plain and specific (a concrete outcome, not "we help you grow").
- True and defensible (no unsupported comparison, no guarantee).
- In the buyer's own words (pulled from real voice-of-customer, never invented).

Avoid the hype tells and anything in `brand.banned_phrases` (see `guardrails.md`).

## The offer ladder (the reusable shape)

```
FREE lead magnet / diagnostic  ->  ENTRY / tripwire paid offer  ->  RECURRING / core offer  ->  HIGH-TOUCH consult / done-for-you
```

Map your real offers (from `company.yml -> offer`) onto these rungs. Point paid traffic
at the live funnel pages that carry each rung (read their real URLs from config /
your site). Each rung's paid-acquisition role:

### Free lead magnet / diagnostic

- Paid role: the PRIMARY paid-acquisition offer for COLD traffic. Almost every cold
  campaign leads here, not at a purchase.
- Use for: cold prospecting on your demand channels (paid social, video prospecting,
  search where intent is informational), and retargeting where appropriate. Blog and
  content amplification play a background, retargeting-support role, not the cold lead.
- Value proposition: a fast, genuinely useful result the buyer gets in minutes ("in two
  minutes, see [the specific finding] and what to fix first").
- Primary conversion event: a COMPLETED lead action, not a landing-page view or a
  button click.

### Entry / tripwire paid offer

- Paid role: the primary monetization and qualification offer. A low-cost tripwire that
  often credits toward the recurring tier.
- Use for: high-intent paid search, the diagnostic results-page upsell, retargeting,
  email nurture, blog visitors, comparison-shopping audiences, DIY-minded buyers.
- Value proposition: a concrete, do-this-next deliverable the buyer can act on quickly.
- Primary conversion event: a paid purchase.

### Recurring / core offer

- Paid role: the primary recurring-revenue offer.
- Use for: entry-offer customers, diagnostic completers with high pain/intent,
  retargeting, email nurture, product-aware audiences, consultation follow-up, and
  higher-value buyers who already see that the underlying problem is operational.
- Value proposition: the ongoing system that does the work, honestly described.
- Primary conversion event: a subscription, a qualified demo, or a qualified
  consultation.

### High-touch consult / done-for-you

- Paid role: the high-consideration, high-intent offer.
- Use for: high-value paid search, founder-led professional-network ads (e.g.
  LinkedIn), larger / operational buyers, warm retargeting, outbound-supported ABM,
  referral and partnership campaigns.
- Value proposition: senior help across the buyer's whole problem, not a single tactic.
- Primary conversion event: a qualified consultation booked and attended, via
  `company.yml -> offer.booking_link`.
