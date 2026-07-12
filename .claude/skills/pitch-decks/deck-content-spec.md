# Deck Content Spec (the pitch-deck-writer's reference)

The 8-slide arc, the Example Scenario rules, the animated-demo data shape, and the exact
`deck.json` schema. The `pitch-deck-writer` agent fills one `deck.json` per segment to this spec.
The build (`templates/build-decks.mjs` + `templates/deck-shell.template.html`) turns it into a
self-contained, branded, presentable HTML deck.

Every fact comes from `company.yml` and your ICP research doc - never invent one.

## The 8-slide arc

1. **Cover** - personalized (company, segment, city). The deck-shell fills `{{COMPANY}}`,
   `{{OWNER_NAME}}`, `{{CITY}}`, `{{SEGMENT}}` from the lead. Your `cover.headline` /
   `cover.subhead` may reference those tokens inline.
2. **Their world / the pain** - the segment's specific, sourced pains from the ICP research doc.
3. **The diagnosis** - where deals leak for this segment. Define the diagnostic factors your offer
   actually scores (e.g. Get found / Proof / Clarity / Trust / Fast response / Follow-up, or
   whatever your product measures). Name the few factors most relevant to the segment. If your
   offer has no scoring model, keep this a plain "here is where it breaks" list.
4. **Example Scenario** - the labelled 3-beat simulation (see below).
5. **The animated product demo** - the product dashboard mock with the segment's sample data (see
   the demo shape). The shell wraps it in a "See it working" slide.
6. **The offer ladder** - rendered from `offer.tiers`, which the writer copies verbatim from
   `company.yml -> offer.pricing_notes`. NEVER invent or drift a price.
7. **Proof + guarantee** - rendered from `deck.proof`, grounded in `company.yml -> owner` and your
   real guarantee terms. Honest, past-framed where a role has changed. No fabricated proof.
8. **CTA** - personalized next step. One primary CTA; `cta.primaryDest` is a destination KEY that
   resolves against `deck.destinations`.

## Example Scenario rules

- A realistic but MADE-UP company in the segment (e.g. "a 6-person shop in a mid-size metro").
  Never a real client, never a guaranteed result.
- The build renders a persistent, unmissable label on the slide:
  `Example Scenario - a simulation showing how the system works. Not a real client or a guaranteed result.`
  You do not write that label; you must not contradict it.
- Three beats: `before` (the leaks), `applied` (which pieces of your offer address each leak, in
  plain product terms), `after` (a modest, directional outcome).
- `numbersNote`: illustrative + conservative, tied to the segment's average deal value, labelled
  illustrative. No hard guaranteed percentages, no dramatic "missed-revenue" figures stated as fact.
  If your `company.yml -> legal.regulated_claims` restricts a claim class, obey it here.

## Animated demo data shape (`deck.json.demo`)

Drives the product-dashboard mock. All sample data, segment-appropriate. Every label is
data-driven with a neutral fallback, so the demo names no product unless you supply the name:
- `appName`: the dashboard's name (fallback "Dashboard").
- `scoreLabel` / `scoreValue` / `scoreDelta`: the headline metric, its sample value, and a sample
  change chip (all optional).
- `lenses`: the diagnostic factors with sample scores `[{label, value}]`.
- `movesLabel` + `moves`: 3 "your moves this week" lines (segment-specific).
- `pipelineLabel` + `followUp`: `{quote, value, recovered}` - a sample open item, its value, and an
  example recovered amount.
- `proofLabel` + `proofLine` + `review`: a sample rating line and a sample drafted review-request
  text for the segment.

## The deck.json schema (filled generic example)

```json
{
  "segment": "sample-segment",
  "sampleLead": { "company": "Summit & Co", "owner_name": "Dana", "city": "Austin", "segment": "your segment", "situation": "busy season, missing inbound while heads-down on delivery" },
  "destinations": { "primary": "https://your-domain/start", "booking": "https://your-booking-link", "home": "https://your-domain/" },
  "cover": { "headline": "{{COMPANY}}: stop losing {{SEGMENT}} jobs online", "subhead": "A plan for {{OWNER_NAME}} in {{CITY}}" },
  "pain": { "headline": "Where the jobs leak", "points": ["Inbound missed while you are heads-down on delivery", "Thin proof next to a longer-established competitor", "Quotes that go quiet and never get a follow-up"] },
  "diagnosis": { "headline": "The places jobs leak", "factors": [ { "name": "Get found", "line": "Show up when a buyer searches for what you do." }, { "name": "Fast response", "line": "The first to respond wins most competitive deals." } ] },
  "scenario": { "company": "a 6-person shop in a mid-size metro", "before": ["Misses a large share of inbound during peak season", "Sends one quote, never follows up"], "applied": [ { "piece": "Follow-up flow", "does": "works every sent quote on a day 2 / 6 / 12 cadence" }, { "piece": "Review flow", "does": "drafts a review request after each completed job" } ], "after": ["Recovers a few quotes a month it used to lose to silence", "A review count that keeps climbing"], "numbersNote": "Illustrative, based on a $1,200 average job value. Not a guaranteed result." },
  "demo": { "appName": "Command Center", "scoreLabel": "Visibility score", "scoreValue": 86, "scoreDelta": "+12 this month", "lenses": [ { "label": "Get found", "value": 90 }, { "label": "Proof", "value": 74 }, { "label": "Clarity", "value": 86 }, { "label": "Trust", "value": 80 }, { "label": "Fast response", "value": 68 }, { "label": "Follow-up", "value": 92 } ], "movesLabel": "Your moves this week", "moves": ["Follow up on 3 quotes worth $18,400 before they go cold", "Request reviews from 2 finished jobs this week", "Publish this week's post: 5 quick checks buyers ask about"], "pipelineLabel": "Follow-up flow", "followUp": { "quote": "Sample open quote", "value": 14200, "recovered": 12600 }, "proofLabel": "Reviews", "proofLine": "4.9 from 38 reviews", "review": "Hi Dana, thanks for trusting us with the job. If you have 30 seconds, a quick review really helps a small local team like ours. Here is the link." },
  "offer": { "headline": "Ways in", "note": "One system, a few ways in, at your pace.", "tiers": [ { "name": "Free check", "price": "", "line": "see where you are losing jobs in two minutes." }, { "name": "Tier 1", "price": "<from company.yml>", "line": "your do-this-next plan." }, { "name": "Tier 2", "price": "<from company.yml>", "line": "the system runs it, you approve." } ] },
  "proof": { "headline": "Who built this", "who": "<founder proof from company.yml owner, true and past-framed>", "guarantee": "<your real guarantee terms, or omit>" },
  "cta": { "headline": "See exactly where you are losing jobs", "primaryLabel": "Run the free 2-minute check", "primaryDest": "primary" }
}
```

A live copy of this example is at `templates/sample.deck.json`.

## Guardrails (inline)

Zero fabricated proof. The scenario is a simulation. Illustrative numbers only, labelled. Pricing
and offer tiers come ONLY from `company.yml -> offer.pricing_notes` (copied into `offer.tiers`).
Proof grounded in `company.yml -> owner`, true and past-framed where a role changed; no
present-tense claim you cannot back. Voice per `company.yml -> brand.voice` +
`brand.banned_phrases`; no em dashes, no emojis unless the brand allows. Obey
`company.yml -> legal.regulated_claims`. Destination keys resolve against `deck.destinations` (fill
from `company.yml -> company.domain` and `offer.booking_link`); a `primaryDest` with no matching
key fails the build loudly.
