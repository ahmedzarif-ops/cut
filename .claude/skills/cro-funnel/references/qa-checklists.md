# QA Checklists (pre-launch + post-launch)

Run pre-launch BEFORE any paid ad spend points at a page. Some items are hard blockers.

## PRE-LAUNCH (must all pass before paid traffic)

- [ ] **FABRICATED-PROOF BLOCKER (hard).** No fabricated testimonials, reviews, stats, or customer counts may receive paid traffic. Any placeholder/sample proof component (stock quotes, sample star ratings, invented counts) MUST be replaced with real, attributable proof (names + written permission) or removed before ad spend. Building and internal-review with a placeholder is fine; going live to ads is not.
- [ ] Compliance gate PASSED (the `content-compliance-reviewer` agent clean: regulated-claim rules per `legal.regulated_claims`, unsubstantiated claims, stat sourcing, brand voice).
- [ ] Honest urgency verified: any countdown reflects a real, server-enforced, reverting deadline; it does not reset on reload; no fake scarcity.
- [ ] Founder copy follows the NAME (`owner.name`) + PRIVACY (past-tense, no current employer) rules.
- [ ] Every claim has a source, proof, or qualifying language; stats carry their reliability flag.
- [ ] One most-wanted action; CTA hierarchy clear; CTAs resolve to a real checkout session or booking link (`offer.booking_link`).
- [ ] Tracking fires: `generate_lead` / `begin_checkout` / `purchase` at the real seams (see `kpis.md`).
- [ ] noindex meta present, campaign route in the robots disallow, page NOT in nav / footer / sitemap.
- [ ] Mobile usable (ad traffic is mobile): tap targets, readable copy, form works on a phone.
- [ ] Page speed acceptable; images sized; no layout shift on the hero.
- [ ] Pricing, the guarantee, and cancel terms are visible and accurate (from `offer.pricing_notes`).
- [ ] The 6-factor self-audit (`cro-scorecard.md`) is done and high-impact gaps are closed.

## POST-LAUNCH (after it is live)

- [ ] The 2-3 success KPIs (`kpis.md`) are being captured for this campaign.
- [ ] Watch cost-per-action and the guardrail metrics (refund/cancel/bounce) for the first traffic.
- [ ] Re-run the cro-scorecard after real traffic; gather qualitative signal (session recordings, exit poll) per `experiments.md` before declaring wins.
- [ ] Log the build, the offer, what converted, and what to reuse in `learnings.md`.
