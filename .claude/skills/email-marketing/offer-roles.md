# Offer Ladder and Email Roles

The ladder and the EMAIL job each step does. Read this before deciding which step an email or
sequence should move a reader toward. Your actual ladder — the steps, names, and prices — comes
from `company.yml` → `offer.summary` and `offer.pricing_notes`; never quote a stale figure from
an older doc. This file is the METHOD: how to think about each rung's email role. Map the rungs
below onto your real offer.

## The ladder (the general pattern)

Most offer ladders have some of these rungs. Fill in your real ones from config:

```
Free lead-gen / diagnostic  ->  Low-cost entry (tripwire)  ->  Core recurring offer  ->  High-touch / premium
```

The job of lifecycle email is to make a prospect more capable, more informed, and better served
BEFORE asking them to buy, and to move them one honest step up this ladder.

## Free lead-gen / diagnostic (the top rung)

- Email role: get qualified subscribers to START and COMPLETE the free thing (a diagnostic, an
  audit, a first result), interpret the result clearly, and deliver result-specific value before
  inviting a purchase.
- Primary promise: the one-line promise of the free thing (from `offer.summary`).
- Primary conversion event: COMPLETION of the free thing (not an open or a click).
- Surface ONE priority to fix first. Do not overwhelm.

## Low-cost entry / tripwire

- Email role: make the low-cost decision feel transparent, useful, low-risk, and immediately
  applicable; show why a prioritized, paid plan beats scattered free advice.
- Outcome: a concrete, do-this-next deliverable the buyer can apply quickly.
- Reference the components honestly; if the entry offer credits toward a higher tier, say so.
- Primary conversion event: the paid entry purchase.

## Core recurring offer

- Email role: reframe from "I need more ideas / more tactics" to "I need a system that keeps the
  critical work moving"; resolve objections about quality, control, setup, time, price, technical
  complexity, tool/CRM fit, and cancellation.
- Outcome: the ongoing value of the core offer (from `offer.summary`) — describe what it actually
  does, in the reader's terms.
- Primary conversion event: a subscription, a qualified demo, or a qualified consultation.

## High-touch / premium

- Email role: qualify larger or more complex buyers and drive high-quality consultations, without
  forcing a high-ticket CTA on low-intent subscribers.
- Outcome: the senior / done-with-you / bespoke value (from `offer.summary`).
- CTA: your booking link (`company.yml` → `offer.booking_link`).

## Choice architecture at the decision point

When a reader is ready to act, present the honest choice rather than forcing one CTA: the DIY
entry offer, the done-with-you core offer, or a consultation for complex needs. The skill must
distinguish when a business should use the entry offer, the core offer, the premium tier, or none
of the above.
