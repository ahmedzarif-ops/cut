# Channel Strategy

Separate playbooks, not one mixed-channel strategy. Each channel has its own role,
structure, and intent logic. The `growth-strategist` uses the decision tree and the
expansion framework here to pick where a campaign runs. A common beachhead default for
a new push is a demand channel (e.g. paid social) first (add retargeting once the pixel
has data); bring high-intent search on only after the demand channel produces paid
conversions.

Adapt the concrete keyword clusters, audiences, and exclusions to your ICP
(`company.yml -> icp`) — the examples below are illustrative structure, not your
targeting.

---

## Search (Google / Bing)

Primary role: capture buyers who are ACTIVELY looking for a solution. Highest intent,
highest cost-per-click, best for the paid offers and consultations.

### Campaign groups

Build groups around the problems your ICP searches for. Typical clusters:

1. "[your category] help / software / service"
2. Problem-specific queries ("how to [get the outcome the buyer wants]")
3. Competitor and alternative queries ("[incumbent] alternative")
4. Category-education queries
5. Segment-specific groups (one per major ICP segment)

### Search-intent routing

| Query type | Route to |
|---|---|
| Informational problem query | The free diagnostic or a content asset |
| "How to [get the core outcome]" | The free diagnostic |
| "[incumbent] alternative" | The alternative / comparison page + diagnostic |
| Category-education query | Segment page, then the diagnostic |
| "Plan / template for [category]" | The entry paid offer |
| "[category] software" | The recurring core offer |
| "[category] agency / service" | The service-alternative page + diagnostic or consult |
| High-complexity / integration query | The recurring offer or the high-touch consult by buyer size |

### Search-term governance

- Match-type strategy by maturity: start phrase + exact on proven terms; open broad
  match only with a strong negative list and conversion data to learn from.
- A negative-keyword system, reviewed every optimization cycle (see
  `testing-and-measurement.md`).
- Segment exclusions (do not show one segment's ads on another segment's queries when
  the page does not match).
- Wrong-buyer intent exclusions (exclude end-user/DIY intent when you sell to the
  business) so spend stays on your real buyer.
- Employment / training exclusions ("[category] jobs", "certification", "courses").
- Free-template and low-intent research exclusions where they do not convert.
- Landing-page mapping by query cluster (each group points at the matching page).
- Impression-share and lost-IS analysis (budget vs rank); CPC vs cost-per-qualified-
  customer, not CPC alone.

---

## Paid social (Meta: Facebook + Instagram, and similar)

Primary role: create demand, surface recognizable problems, generate free-diagnostic
completions, retarget engaged buyers, and re-engage visitors. This is the cold-traffic
demand engine and the retargeting workhorse.

Use these creative types:
- Founder/authority-facing video (real credibility, honestly framed).
- Static image ads (product, in-context, before/after).
- Problem-story ads (the specific pain, dramatized honestly).
- Contrast ads (the rented/expensive status quo vs your owned system).
- Diagnostic-result teaser ads.
- Carousel walking the places the outcome leaks before the buyer converts.
- Short UGC-style creative and Reels.
- Lead ads ONLY where CRM integration and quality control are strong (otherwise drive
  to the hosted diagnostic).

Do NOT lead cold traffic with "Buy our recurring product." Lead with a relevant
diagnostic, a specific pain, an owned-system insight, or a segment-specific problem.
Cold traffic optimizes for the LEAD (completed diagnostic), not the cold purchase.

---

## Video (YouTube and similar)

Primary role: educate, establish founder credibility, demonstrate the problem, and
retarget. Best for warming a skeptical buyer before search or retargeting closes.

Use these formats:
- 15 to 30 second hook-led video.
- 45 to 90 second problem-and-solution ads.
- Founder explanation videos.
- Customer-story videos ONLY once verified results exist.
- Screen-recorded product / diagnostic demonstrations.
- Retargeting viewers by watch depth (25 / 50 / 75 / 95 percent).

Core video angles (adapt to your ICP): why the better provider still loses to the
louder one online; why the rented status quo keeps the buyer dependent; the places the
outcome leaks before conversion; what happens after the buyer engages; what prospects
check before they commit; how the system keeps working while the owner is busy.

---

## Professional network (LinkedIn and similar)

Use selectively. Primary role: reach higher-revenue, larger-team, or operations-focused
buyers and executives.

Best offers: the high-touch consult; a strategy consultation; an operational
assessment; an executive guide or diagnostic on the core problem.

Do NOT use it as the default channel for small/solo buyers unless data shows it can
acquire qualified buyers profitably. It is a high-touch and larger-buyer channel, not a
velocity channel.

---

## Retargeting

Separate retargeting by intent tier; each tier gets its own message and offer.

1. Diagnostic landing-page visitors who did not start.
2. Diagnostic starters who did not finish.
3. Diagnostic completers who did not buy the entry offer.
4. Free-preview / trial users who did not purchase.
5. Entry-offer buyers who have not upgraded.
6. Recurring-offer product-page viewers.
7. Checkout starters.
8. Consultation page viewers.
9. Blog readers of the highest-intent topics.
10. Video viewers by engagement depth.
11. Engaged social users.
12. Existing customers for upsell, retention, review, referral, and high-touch offers.

---

## Channel decision tree

Pick the channel from offer + awareness stage + segment + budget:

- Cold, building demand, any tier entry -> paid social prospecting to the free
  diagnostic.
- Active high-intent search -> search to the matching offer/page.
- Skeptical buyer who needs to trust before buying -> video (warm) then retarget.
- Larger / high-touch buyer -> professional network + founder-led + warm retargeting.
- Anyone who already engaged -> retargeting by the intent tier above.
- Low budget -> concentrate on ONE channel (paid social to the diagnostic) plus
  retargeting; do not spread thin.
- Beachhead default for a new push: the demand channel first (demand + diagnostic), add
  a retargeting layer once the pixel has data; bring high-intent search on only AFTER
  the demand channel produces paid conversions.

---

## New-channel-expansion framework (the growth-OS layer)

Beyond the core channels, recommend a NEW channel only when it earns a test. For each
candidate, state the criteria: audience fit, offer fit, a realistic budget floor, and
the role it would play. Candidate archetypes (adapt to your market):

| Channel archetype | When it earns a test | Likely role / offer |
|---|---|---|
| Category-specific intent networks (marketplaces, guaranteed-lead programs) | Your market has a real intent network the buyer uses | A source to CONTRAST against in copy, or a future service; rarely your core owner-acquisition channel |
| Local / community networks | Local buyer + community density; trust-led categories | Community presence + diagnostic; lower volume |
| Reddit / forum ads | Proven organic traction in the buyer's communities | Cold awareness to the diagnostic; cheap hook testing |
| Video-as-paid (not just organic) | You have founder + demo video that holds attention | Educate + retarget; warms before search closes |
| Programmatic / display retargeting | Enough site + video audience to retarget efficiently | Retargeting reinforcement, never cold prospecting |
| Podcast (category / small-business shows) | A founder-credibility moment and budget for mid-roll | Awareness + authority for higher tiers |
| Direct mail retarget (to engaged leads) | High-ticket targets worth the unit cost | A warm touch in an ABM sequence |
| Partnership / co-marketing | A partner with the same buyer audience and no conflict | Referral + co-branded diagnostic; near-zero CAC |

Always tie an expansion recommendation to the honesty separation (Hypothesis vs
Recommendation requiring testing) and a measurement plan. Do not recommend a channel
just because it exists; recommend it because the audience, offer, and budget line up.

---

## Staged paid-spend discipline (generic, applies to any funnel)

Arm paid spend in stages, never all at once. Owner-gated spend applies at every stage;
no dollar is armed without the owner.

1. **Instrument-only, ZERO spend** — pixel + conversion events firing, budget = $0, to
   build the audience and validate the events fire correctly.
2. **Warm retargeting, purchasers excluded** — retarget engaged viewers/leads; suppress
   anyone who already bought so spend never chases an existing customer.
3. **Controlled cold** — with a **stop-loss** and explicit **contribution-margin math**
   (never scale cold past the margin the offer can carry). Cold only after stages 1-2
   give a real cost-per-qualified-outcome to hold against.

### Spend-order rules

- Validate ONE end-to-end measurement pipe before spending (a single working funnel
  measurement, not a warehouse).
- Arm the pixel/tag with consent + test traffic; verify events fire before any spend.
- Publish/launch the pilot organically first; verify real organic signal before paid.
- Identify the strongest TRUTHFUL creative (no hype; the compliance and slop gates
  stand).
- Run a small owner-approved test with a bounded budget and explicit approval.
- Scale only on proven unit economics — a real paid-outcome cost that the tier can
  carry.
- A promotional ad credit NEVER justifies premature spend; it is not a reason to skip
  the steps.
- Never send cold traffic to a high-ticket checkout before fit is proven.
- Optimize to first checkpoints / qualified interest, never to cheap leads — a cheap
  lead that never activates is a loss, not a win.

### Partnership targets (concrete-offer rule)

Every partnership approach carries a **concrete offer** — a live teardown, a shared
workshop, a guest tutorial — **never a generic "let's collaborate."** Tie each to a
measurement plan like any expansion bet.

### Affiliates — deferred until real outcomes exist

No affiliate program until real, verified customer outcomes exist. An affiliate motion
before there are honest outcomes to point to is a proof/compliance risk. Revisit once a
real cohort produces citable results.
