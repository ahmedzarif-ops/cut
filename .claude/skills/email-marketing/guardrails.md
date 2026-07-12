# Email Guardrails (non-negotiable)

The rules of the road for every lifecycle map and every line of email copy this engine
produces. The compliance-review gate (the `content-compliance-reviewer` agent) enforces these;
treat a flag as a hard stop. When in doubt, choose the more honest, more useful, less
promotional version. These INHERIT your shared brand + message rules (your message-spine and
owner/founder KBs under `kb_dir`, and `company.yml` → `brand.*`, `legal.*`); this file adds the
email-specific layer.

## Pricing (the most common error to avoid)

Pricing is ALWAYS the live values from `company.yml` → `offer.pricing_notes` (or your live
pricing source of truth — e.g. your product catalog). Never write a figure from an older doc,
a screenshot, or memory. If any source or older doc shows a different number than config, the
config value wins. When in doubt, re-read config before writing a price.

## Never produce or recommend

- Fabricated testimonials, reviews, client names, counts, results, or case studies.
- Guaranteed rankings, lead volume, revenue, or outcome numbers.
- Generic ecommerce newsletters, aggressive discount sequences, empty motivational emails,
  or high-volume promotional blasts.
- Fake or resetting urgency, fake scarcity, fake "Re:"/"Fwd:" subjects, deceptive headers
  or sender names, or hidden/manipulative unsubscribe language.
- Sales pitches disguised as education (teach-before-asking is real, not a wrapper).
- Personalization that fabricates data or implies a live audit that did not run.
- Purchased or scraped lists presented as consented marketing.

## Value-first rules (the engine's reason to exist)

- ONE useful lesson per email: one problem, insight, fix, template, checklist, or next
  action. Do not cram unrelated lessons.
- TEACH BEFORE ASKING. For a conversion email: (1) name a costly but recognizable issue,
  (2) explain why it matters in the reader's terms, (3) give a useful action, (4) explain
  the limit of fixing it in isolation, (5) offer the next step only after the value.
- MAKE VALUE TANGIBLE: build emails around real assets (a short audit, a fill-in template, a
  follow-up sequence, a checklist — see `value-first-principles.md`).
- EARN THE NEXT EMAIL: newsletter emails stay useful even if the reader never buys;
  behavioral flows may send more often only when the user requested an asset or started an
  action; honor a global frequency cap; reduce/sunset disengaged subscribers.

## Honest urgency only

Urgency is allowed ONLY when it is real and enforceable:
- A real, server-enforced pricing/founding window (one that actually reverts).
- A real seasonal need genuine to your audience's calendar.
- Genuine limited capacity (a real cap on onboarding slots).
If you cannot point to the real thing creating the urgency, do not imply it.

## Voice rules

- Plain language, audience-aware, calm and credible. Write the way a straight-talking advisor
  speaks to a skeptical buyer, not the way a vendor pitches.
- Honor `company.yml` → `brand.voice` for tone and punctuation rules, and
  `company.yml` → `brand.banned_phrases` for the never-use list. Common defaults to avoid:
  revolutionary, transform, 10x, growth hacking, dominate, scale effortlessly, automate
  everything, seamless, leverage, unlock, synergy, generic "AI-powered." Add your own.
- Lead with the reader's real problem and outcome, not with the technology.

## Names and privacy

- The founder/owner is named per `company.yml` → `owner.name` in all subscriber-facing copy.
  Use the external-facing name form, never an internal nickname.
- Frame any founder proof as PAST or EXPERIENCE ("previously led growth at ...", "an engineer
  who built ..."). Never present-tense current employment; never name a current employer;
  never "former"/"left" in a way that misrepresents.

## Proof discipline

Until real attributable testimonials exist, the only proof an email may use is: founder-led
proof (past-framed, from `owner.name`), product-as-proof (the live product / a diagnostic;
label any sample data as a sample), sourced stats carrying their reliability flag (cite the
named primary source for every statistic; hedge vendor figures with "industry estimates"),
and any real, honored guarantee.

The advocacy / testimonial / referral / case-study programs (program L) are flows to COLLECT
real proof after a real milestone. The emails themselves use only honest proof until real
attributable testimonials exist. Never fabricate proof to fill a sequence.

## Honest sending and deliverability

- Documented consent; accurate sender identity; required business address; a working,
  one-click unsubscribe for bulk; a preference center where practical.
- Separate transactional and marketing streams; SPF/DKIM/DMARC; no purchased/scraped lists.
- Open rate is NOT a standalone success metric (privacy protections distort it).
- See `data-and-deliverability.md` for the full list.

## Honesty separation

Every lifecycle map must label its claims: Observed facts about the company; Evidence-supported
strategy; Hypotheses (untested); Recommendations requiring testing; Claims requiring primary
research or customer validation (never publish as fact).
