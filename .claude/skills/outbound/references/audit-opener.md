# The Audit Opener (the SDR "killer asset")

An auto-generated, per-prospect audit that IS the outreach opener: "I ran a 2-minute check on {company},
here is what I found." It productizes the ONE true observation each touch needs into a real, shareable,
mobile-first artifact. It is your free diagnostic/audit offer, pre-run. Channel-agnostic (email, a call
reference, or later LinkedIn), so it also de-risks the LinkedIn debate.

## Wire it to your own generator

The kit does not ship the audit generator — it's a small tool you build (or adapt) to run **real, automated
public checks** on a prospect's site and emit an honest, mobile-first HTML/JSON artifact. A workable shape:
a pure scorer + a collector (calls public APIs) + a renderer, driven by a CLI like
`node your-audit-toolkit/build-audit.mjs --company "Example Co" --website example.com`, writing the artifact +
its data under `kb_dir` (e.g. `kb/audit-runs/<slug>.html` + `<slug>.json`). Keep a rubric-of-record file so the
checks are versioned, and a brand-config file so the artifact is brand-swappable.

Typical checks (all publicly measurable, no login): site speed / mobile-friendliness (e.g. Google's free
**PageSpeed Insights API** — set an API key to avoid HTTP 429 rate-limits; without it, the tool honestly
marks those rows "not checked", never guessed), HTTPS, click-to-call presence, a clear primary CTA,
findability for the prospect's category + location, and — once you connect a reviews API + a place id — a
public-reviews row (keep it dormant and rendered "not checked" until it's actually wired, never a fabricated
rating).

## The honesty rules (non-negotiable — this is the compliance/FTC line)
1. **Never send an audit whose findings are not all real.** Every value on it comes from an automated public
   check. If you cannot verify a line, it stays "not checked".
2. **Missing is "not checked", never guessed.** A row you could not measure says so; it is not a pass, a
   fail, or a number.
3. **No results/outcome promises.** No "you will get X more leads / more calls / rank #1". The audit states
   observations + published third-party standards only. Block results-claim copy in the renderer by
   construction, and do not add any in the surrounding email/message either.
4. **The "what good looks like" block is a labelled Example Scenario** (illustration), never presented as
   the prospect's or a named competitor's real numbers.
5. **No testimonials, case studies, or results numbers** on the artifact or around it, until a real proof
   benchmark + documented wins exist.
6. **One true, specific observation per touch.** The audit gives you that observation; the opener references
   the single most important finding, not a wall of them.
7. **CAN-SPAM before any live send (the `legal` gate).** The audit is the body/opener, NOT the compliance
   layer. Before a real prospect receives it, the sending email MUST carry a valid physical postal address,
   a clear one-click opt-out/unsubscribe, and honest from/subject lines. Because the artifact can be
   forwarded standalone, set a postal address in its brand config (its footer should carry an opt-out line +
   any required non-affiliation notice). The `legal` skill signs this off before the first send.

## How it plugs into the sequence
- **Workflow A (list):** after `score_leads.py` tiers the list, generate an audit for tier-A prospects. The
  audit's top issue becomes the sequence `{observation}`.
- **Workflow B (sequence):** the opener links or references the audit ("I ran a 2-minute check on {company}
  — here is what I found: [link]") and lowers the ask to "book 15 min to walk the top 3 fixes" (the CTA is
  your booking link, `company.yml` → `offer.booking_link`, baked into the brand config).
- **Gates still apply:** compliance-review (content/claims) + the `legal` skill (channel law) + owner
  (approval) before any send. The audit is the opener, not a license to skip the compliance + deliverability
  gate.

## Reusability / product
Build it brand-swappable (a per-tenant brand config), so the same generator becomes a reusable module of a
white-label offering (source → score → personalize → sequence → book, with the audit as the opener).
