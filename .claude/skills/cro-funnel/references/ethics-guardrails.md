# Ethics & Claim Guardrails

These are non-negotiable. A page that violates any of these does not ship.

## Never recommend or build

- Fake testimonials, fake reviews, fake customer counts
- Fake scarcity or artificial countdown timers (timers that reset on reload, or "only N left" with no real limit)
- Hidden fees
- Deceptive cancellation flows
- False ranking / placement guarantees
- Guaranteed revenue claims
- Fabricated before-and-after results
- Unsupported claims about product/AI performance
- Language that implies the product replaces the buyer's judgment when it is approval-first (the owner approves everything)
- Messaging that encourages review-policy violations (no incentivized or gated reviews)

Treat every claim as needing a source, proof, or qualifying language. Honor any industry rules in
`company.yml` → `legal.regulated_claims`.

## Honest urgency (the only allowed urgency)

Urgency must reflect something REAL and enforced:
- A timed offer: the countdown counts to a real per-visitor deadline (e.g. `first_seen + window` from a cookie); the discount is enforced SERVER-SIDE and genuinely reverts after the window; it does not reset on reload.
- A founding/early price is real and limited; do not show a fake "seats left" number unless a real, enforced cap exists.
- The cost-of-waiting framing (every slow week is business lost to faster competitors) is real and needs no timer.
If a deadline or limit is not actually enforced, do not imply it.

## Proof rules (when pre-testimonial)

Allowed proof: founder-led (from `owner.name` + any founder KB), product-as-proof (real screenshots,
a live diagnostic — label any sample data as a sample), sourced industry stats (with their
reliability flags), and any real guarantee. Any placeholder/sample proof component is a PRE-LAUNCH
blocker (`qa-checklists.md`): real and attributable, or removed, before paid traffic. Never author new
fabricated named quotes.

## Founder NAME rule

Use the owner's real public name from `company.yml` → `owner.name` in all public copy. Use the real
public names of any other named founders — never an internal nickname or a placeholder name.

## Founder PRIVACY rule (employer confidentiality)

If a founder is building this while still employed elsewhere and does not want their current employer
to find out, present their roles in ALL public copy as PAST / EXPERIENCE, not present-tense
employment:
- "spent ten-plus years as a [role] for [category of company]" — categorical, not a named current employer.
- Describe credentials as background ("built systems at [category]"), never "is currently" / a current title / "for a living".

NEVER name a current employer. The credentials must be REAL and only tense-shifted to read as
background; never write anything false (e.g. "former X" or "left X" when they have not). Keep any
enterprise clients categorical and unnamed.

## Stat reliability

Every stat carries a reliability flag traced to its source in your ICP research (`icp.research_doc`).
Cite primary studies for hard claims; treat vendor/directional figures as illustrative only, and say
so. Re-verify before stating a number as a hard fact.
