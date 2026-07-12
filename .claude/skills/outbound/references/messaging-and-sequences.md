# Messaging & Sequences

How to write outbound that your audience actually responds to, and how to structure the cadence. The buyer
is busy, skeptical of polished marketers, and reachable in the gaps of their day — so the winning style is
**short, specific, concrete, and value-first.** The ready-to-use cadence is in `assets/sequence-template.md`;
this file is the thinking behind it.

## Voice (pull from the product-voc skill)

- **Plain and direct.** No agency jargon ("omnichannel synergy"), no hype. Talk like a person who
  understands their business.
- **Concrete and specific.** A named outcome in their words beats "grow your brand." Specific beats clever.
- **Respect their time.** 3–5 sentences. The whole email should be readable on a phone in ten seconds.
- **Lead with value, not a pitch.** Your wedge is your lowest-friction, most genuinely useful offer
  (`company.yml` → `offer.summary` — e.g. a free diagnostic/audit). The ask is "want the link?" not "book a
  30-minute call."
- **Source the voice from the `product-voc` skill** (Petra) so outbound sounds like the rest of the
  company — honor `company.yml` → `brand.voice` and `brand.banned_phrases`; don't invent a separate tone.

## Personalization that's real (the `{observation}`)

The single biggest driver of replies is a **true, specific observation** about the prospect: their site
doesn't rank for their category + city, they have 11 reviews vs competitors at 200+, no online booking, an
outdated site, running ads to a weak landing page. **Pull it from real research** (the `market-radar`
skill's radar, a quick Maps/site check); **never fabricate it.** Fake flattery ("loved your recent post!")
is transparent, kills trust, and is off-brand.

Benchmark reality (why this matters): batch-and-blast with no personalization runs ~1–3% reply; basic
mail-merge (name/company) ~5–9%; a real, specific observation does better. The observation *is* the
strategy.

## Proof ladder (match the claim to the evidence)

Only claim what you can actually prove. Two rungs, and don't skip one:

- **Rung 1, process / diagnostic language only (where you start).** Until you have a documented proof
  benchmark (real, defensible outcome numbers) and your **first documented wins**, sequences describe only
  what the diagnostic and your offer *do*: surface the leaks, show where opportunity is being lost, name the
  fast fixes. They never assert an outcome. No "$X recovered," no "3x more," no percentages, no guarantees.
  Diagnostic framing ("shows you where," "surfaces," "you just get the results") is the ceiling.
- **Rung 2, add the proof line (once the benchmark and wins exist).** After you hold documented, defensible
  numbers, insert one honest, specific proof line — for example the measured result a comparable customer
  got — attributed and benchmark-backed. Add that one line, keep everything else short, and still route it
  through the compliance-review gate before it sends.

A results claim without the benchmark behind it is exactly the FTC and brand line that the compliance and
legal gates exist to hold. When in doubt, stay on Rung 1.

## Sequence structure

- **Multi-touch, multi-channel, spaced** — a handful of touches over ~10 days across email (primary, via
  **Instantly / Smartlead** on the warmed domain), LinkedIn (optional, no pitch on connect — **Sales Nav
  targeting + cloud automation within the account-safety limits**, see `tooling-and-stack.md`), and a call
  (only if DNC-scrubbed/TCPA-cleared). The standard motion: **LinkedIn opens the door, email converts.** No
  cold texts.
- **Each touch adds something** — a new angle or observation, not "just bumping this."
- **Soft, single CTA** — the diagnostic link / a yes-no question, not multiple asks.
- **Graceful breakup** — close the loop politely and leave the door open; don't guilt-trip.
- **Stop on any reply or opt-out**, immediately. A reply (even "not now") exits the sequence and goes to a
  human.

## Metrics that matter (and the one that doesn't)

- **Reply rate is the KPI** — industry avg ~3–5%, good ~8–12%, excellent ~15%+. Track **positive reply
  rate** (replies minus "not interested"/opt-outs) as the real signal.
- **Meetings booked** (diagnostics/discovery) — the actual output the SDR is accountable for.
- **Open rate is NOT a primary KPI** — Apple Mail Privacy Protection inflates opens 30–50%. Use it only as
  a directional deliverability check (opens dropping below ~30% suggests an inbox-placement problem).
- **Deliverability health** — bounce rate <2%, spam complaints <0.3% (see `deliverability.md`); these gate
  everything.
- **A/B test** subjects and the opening line in small, honest batches; keep the winner; coordinate with the
  `data-analytics` skill on what counts as a real difference at low volume (don't over-read tiny samples).

## Gate before it sends

Copy passes **compliance-review** (claims/disclosures/brand-safety, Gus) and the channel passes the
**`legal` skill** (CAN-SPAM/TCPA/DNC, Lex), then the **owner** approves. No guarantees of results, ever
(FTC + brand line).

---

**How the agent uses this file:** write short, specific, value-first messages in the product-voc voice with
a **real** personalized observation; structure a spaced multi-touch sequence with one soft CTA; optimize on
**reply/meeting rate, not opens**; and route copy through compliance-review + the legal skill + owner
approval before launching.
