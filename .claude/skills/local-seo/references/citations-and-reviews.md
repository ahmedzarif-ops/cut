# Citations & Reviews — NAP consistency + the honest review engine

Open this for the two biggest **prominence** levers a business can actively pull: consistent citations and a steady, honest review flow. Both are honest-by-construction by design — the shortcuts here are illegal and get listings suspended.

## Part 1 — NAP + citations

**NAP** = Name, Address, Phone. Every place the business appears online should show it **consistently** (same name spelling, suite formatting, and phone format). Inconsistent NAP splits the business's identity across the web and drags prominence; it also confuses Google about which listing is canonical.

### Core directories (claim + make consistent)

Tier by authority; fix the highest first:

- **Highest:** Google Business Profile, Bing Places, Apple Business Connect, Facebook.
- **High (general consumer):** Yelp, BBB, Nextdoor.
- **Vertical / industry-specific:** directories relevant to the client's trade — trade-association directories, local chamber of commerce, and manufacturer/supplier "find a pro / find a dealer" locators (these are high-authority and industry-specific; identify the ones that matter for the client's actual vertical, don't assume).
- **Data aggregators / structured:** the general business-data layer that syndicates to many directories — get the canonical record right so it propagates.

### Citation cleanup workflow

1. **Audit.** Search the business name + phone; list every listing found and note the exact NAP on each. A citation tool speeds this but manual works for a single client.
2. **Establish the canonical NAP** (matches the GBP + website footer exactly).
3. **Fix the highest-authority mismatches first** (Google, Bing, Apple, Facebook, Yelp), then work down.
4. **Suppress / merge duplicates** — duplicate listings for the same business split prominence and risk suspension (esp. duplicate GBPs).
5. **Keep the website NAP** in the footer + a LocalBusiness schema block consistent (hand the schema to `ai-seo`).
6. **Re-audit** after moves, rebrands, or number changes — those are when NAP rot happens.

Consistency and coverage matter more than raw count — a clean presence on the directories that matter beats a spray of inconsistent low-quality listings.

## Part 2 — Reviews (the prominence engine, honest by construction)

Reviews are the biggest lever a business can actively pull on prominence — **count, velocity, recency, average rating, and response rate all feed local rank**, and reviews are also what makes a customer pick up the phone (if you have 8 reviews and a competitor has 80, you look less established even if your price is better). This is also the retention/loyalty layer, and it's what an automated review-request flow operationalizes.

### The hard rules (non-negotiable — legal + policy)

- **Never fake, write, or buy reviews.** Illegal under the US FTC's Rule on the Use of Consumer Reviews and Testimonials (16 CFR Part 465), which took effect Oct 21, 2024 and carries civil penalties; also a Google policy violation → suspension. Confirm the client's jurisdiction (`company.yml` → `legal.jurisdiction`) and route through the legal gate.
- **Never incentivize reviews without disclosure**, and never incentivize a *positive* review at all. Offering a discount for an honest review that is clearly disclosed is a gray area — default to **not** incentivizing (Google prohibits review-gating/incentives in its content policy).
- **Never review-gate.** Do not survey customers to route only the happy ones to Google and the unhappy ones to a private form. It violates Google's review policies and is exactly the deceptive practice the FTC rule targets. **Ask everyone the same way.**
- **Never review-swap or use review-station kiosks that suppress negatives.**

### Honest solicitation — cadence that works

The ask is fully legitimate: you're inviting *every* customer to leave an *honest* review, right when the experience is freshest.

- **Timing:** a text with a **direct review link shortly after the job/visit wraps** converts far better than asking in person while they're paying. For longer projects, ask at the clear "win" moment (final walkthrough).
- **Channel:** text > email for most local businesses (higher open); email as a fallback. One friendly ask + at most one gentle reminder — not a nag.
- **Steady velocity beats a burst.** A trickle of fresh reviews every week reads as an active, trusted business and is more durable than 20 in one day (which can look manipulated). Recency is a signal — old reviews decay.
- **Ask everyone**, satisfied or not. That's both the compliant path and the honest one.
- **Make it one tap:** the direct Google review link (or a short branded redirect to it). Friction kills review rate.

Sample ask (adapt to the client's voice — honest, no pressure, no incentive):
> "Hi [name], thanks for letting us take care of your [job] today. If you have 30 seconds, an honest Google review really helps other neighbors find us: [direct link]. No worries either way — appreciate you!"

### Responding — every review, positive and negative

Response rate is itself a relevance/trust signal, and how a business handles a bad review is read closely by the next prospect.

- **Positive:** thank by name, reference the specific job, stay warm and brief. Don't stuff keywords, but naturally naming the service/city is fine.
- **Negative:** respond **fast, calm, professional, and solution-oriented** — never defensive, never argue, never disclose private details. Acknowledge, take it offline ("please call us at [number] so we can make this right"), show future readers you handle problems well. A well-handled 1-star can build more trust than a wall of 5-stars.
- **Never** buy the removal of a legitimate negative review or post a fake positive to bury it. Earn more real reviews instead.

### Review-flow product tie-in

An automated **review-request flow** operationalizes the honest post-job ask (text + direct link, right timing) and helps manage responses. When a client engagement needs the review mechanics operationalized, route to that flow — this skill owns the *local-ranking strategy* for reviews (velocity, recency, honest cadence, response posture); the review-request product owns the *mechanics* of sending and collecting.
