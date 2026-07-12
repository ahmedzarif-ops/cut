# ICP & Targeting

Outbound only works if the list is right. Spraying a broad list torches the sending domain and the brand;
a tight, well-researched list of genuine-fit prospects is what makes the channel pay. This file defines how
to build and qualify the list against YOUR ICP, and what to disqualify. The scoring rubric lives in
`assets/icp-scorecard.csv` and is automated by `scripts/score_leads.py`.

## Who you target (ground in config)

Read `company.yml` → `icp.description` and the full research at `icp.research_doc` (under `kb_dir`). If the
ICP research doc is missing, run ICP research first — never invent segments or buyer facts. The buyer is
the **decision-maker** who feels the pain your offer removes.

**The sweet spot** (where your offer lands best) is defined by your ICP research, but a common B2B shape:
- **Big enough to afford it and to care** — enough revenue/size to invest in the outcome you sell.
- **Small enough to lack the in-house function you replace** — once a prospect has a mature internal team
  for exactly what you do, you're selling against an internal function instead of filling a gap.
- **Growth-minded** — actively wants the outcome, not coasting or winding down.

Encode these thresholds in `scripts/score_leads.py` (the ICP knobs at the top) so the scorer matches your
real ICP.

## Buying signals (what makes a prospect a good "now" target)

These are also "we can obviously help" hooks for the message. Tailor to your ICP research; common signals:
- **Weak or no website** / dated site / no online booking — a clear, observable opportunity.
- **Thin market presence** — few reviews, low rating, not ranking for their category + location.
- **Ad behavior** — *not* running ads (greenfield, untapped) **or** running ads inefficiently (budget
  exists, just needs better targeting/creative).
- **Growth signals** — hiring, adding capacity, opening a second location, recently expanded.
- **Timing** — reaching out ahead of the prospect's peak/decision season, when the pain is top of mind.

*The `market-radar` skill (Remy) and the `data-analytics` skill surface these signals; the SDR turns them
into the `{observation}` that personalizes the outreach.*

## How to build the list

1. **Source** from the **data layer** (see `tooling-and-stack.md`): **LinkedIn Sales Navigator** (filters,
   lead lists, intent — safe, no auto-send) and **ZoomInfo / Apollo / Clay** for buyers reachable on
   LinkedIn; **local-business data** (Google Maps / local search, Yelp) for segments where the buyer isn't
   on LinkedIn; plus your own inbound/CRM data (`company.yml` → `integrations.crm`).
   *(If your environment has firmographic-enrichment or web-research skills/tools available — e.g. the
   `web-research` skill — use them for enrichment.)*
2. **Capture** the fields in `assets/prospect-list-template.csv` (segment, size, revenue estimate, website/
   reviews/ads signals, contact info, geo).
3. **Verify contacts** — validate emails before sending (bounces above ~2% wreck deliverability — see
   `deliverability.md`). No valid contact method → it's not a workable lead.
4. **Score & prioritize** — run `score_leads.py` to tier A–D; **work A then B**, nurture C, drop D.
5. **Respect privacy** — prospect data follows the `legal` privacy posture (minimization, lawful sourcing,
   honor deletion/opt-out requests).

## Disqualifiers (don't work these)

- **Non-target segment** — outside your ICP, regardless of other signals.
- **No contact method** — can't reach them, can't work them.
- **Too small to afford** — no revenue to invest (note and deprioritize).
- **Already has the internal function or an incumbent agency** (if known) — different, harder pitch;
  deprioritize or angle specifically.
- **Outside serviceable geography** (if you limit where you operate) — flag and skip.

## The qualification bar before a lead becomes "book the meeting"

Light fit check, not a full BANT interrogation: right segment, decision-maker reachable, plausibly able to
afford, and a real gap. The SDR's job is to **start the conversation and book the diagnostic/discovery**,
then hand off — not to fully qualify or close.

---

**How the agent uses this file:** build a tight, verified, well-researched list against the ICP in config;
score and prioritize it; and pull the real `{observation}` for each prospect from genuine signals — never
pad the list for volume, and never fabricate the personalization.
