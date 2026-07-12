---
name: outbound
description: >-
  The outbound prospecting / SDR toolkit for your company — filling the pipeline with genuine-fit
  prospects. Use WHENEVER the work is proactive outreach to win new clients: defining the ICP; sourcing,
  verifying, and scoring prospect lists; writing cold email / LinkedIn / call sequences; protecting
  deliverability (warmup, separate domain, list hygiene); booking a discovery/diagnostic then handing off.
  Reach for it even casually — "find me prospects to reach out to," "write a cold email sequence," "score
  this lead list," "why are our emails going to spam," "build an outbound campaign," "who should we
  prospect" — even if they never say "skill." Outbound is the most legally loaded work we do, so it is
  compliance-first: within CAN-SPAM, TCPA/DNC (never cold-texts) and current mailbox-provider sender rules,
  it defers to the legal skill, gates copy through compliance-review, never launches without owner
  approval. Relevance over volume, replies over vanity opens.
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs a self-improvement loop through `learnings.md` in this skill dir:
- **Ground:** before dispatching the agent, read `learnings.md` (run log, open gaps, what-works) and pass
  it into the agent's context along with its canonical knowledge files and your config.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook. Put proposed canonical-file changes under
  "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

# Outbound — Prospecting & SDR

This skill is the **outbound SDR's toolkit**. Its job is to proactively fill the pipeline — find
genuine-fit prospects, reach them with relevant, value-first outreach, and book the discovery / diagnostic
call — the proactive counterpart to your inbound funnel. The throughline is **earned attention, not spam**:
a tight researched list, real personalization, protected deliverability, airtight compliance, and a clean
handoff. Volume without relevance torches the domain and the brand; this skill does the opposite.

## Ground yourself in config first

Every company fact this skill needs comes from config, never from invention:
- **Who to target** — `company.yml` → `icp.description`, and the full research at `icp.research_doc` (a
  file under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer
  facts, segments, or buying signals.
- **What you sell / the wedge offer** — `company.yml` → `offer.summary`, `offer.pricing_notes`,
  `offer.booking_link`. The value-first opener leads with your lowest-friction, most tangible win; the CTA
  is your booking link.
- **How you sound** — `company.yml` → `brand.voice` and `brand.banned_phrases`, plus your message-spine KB
  under `kb_dir`. Source the outbound voice from the `product-voc` skill (Petra) so outbound sounds like the
  rest of the company — don't invent a separate tone.
- **Legal constraints** — `company.yml` → `legal.jurisdiction`, `legal.regulated_claims`. Non-US recipients
  raise the bar (GDPR/CASL can require opt-in) — route those to the `legal` skill.
- **Sending infra** — `company.yml` → `domain` (send cold from a SEPARATE warmed domain, never this one),
  `integrations.crm` (system of record), `integrations.esp` (marketing sender, if any).

**Read first / read as needed:**
- `references/icp-and-targeting.md` — who to target, how to source/verify/score lists, buying signals,
  disqualifiers. *Start here.*
- `references/messaging-and-sequences.md` — how to write for your audience, sequence structure,
  personalization, the proof ladder, and the metrics that matter.
- `references/outbound-compliance.md` — CAN-SPAM / TCPA / DNC per channel; **defers to the `legal` skill**
  as authoritative.
- `references/deliverability.md` — protect the sending domain: authentication, warmup, hygiene, monitoring.
- `references/tooling-and-stack.md` — the sales stack by job (Sales Nav / ZoomInfo data, LinkedIn
  automation, Instantly/Smartlead email, CRM) **and the LinkedIn account-safety limits.**
- `assets/prospect-list-template.csv` — the list-building column template (input to the scorer).
- `assets/icp-scorecard.csv` — the editable ICP scoring rubric.
- `assets/sequence-template.md` — a ready, compliance-noted multi-touch sequence.
- `scripts/score_leads.py` — scores/tiers a prospect list by ICP fit (edit the ICP knobs at the top to
  match `company.yml`).
- `references/audit-opener.md` — the per-prospect audit-opener pattern (the SDR "killer asset"): an
  auto-built, honest, mobile-first audit that IS the opener AND provides the true `{observation}`.

## Core principles

- **Compliance-first; defer to the legal skill.** Operate within CAN-SPAM (email), TCPA/DNC (calls), and
  the mailbox-provider sender rules; **never cold-text** — texting is TCPA-loaded and one wrong send is
  expensive, so route calling/texting and anything ambiguous to the `legal` skill. **No campaign sends
  without owner approval** (and the compliance gate), because outbound speaks in the company's name.
- Relevance over volume. A tight, verified, well-fit list with real personalization beats a broad blast —
  volume without relevance torches the domain and the brand, so a narrow list protects both deliverability
  and reputation.
- Real personalization only. The `{observation}` has to be true and specific; fabricated flattery or "re:
  our conversation" pretexts read as spam and break trust the moment they're spotted.
- Protect the channel. Separate warmed sending domain, full SPF/DKIM/DMARC + one-click unsubscribe, and
  verified lists keep you out of spam folders; hold **bounce <2% / complaints <0.3%** as hard guardrails,
  since crossing them tanks the domain's sender reputation for every future send.
- Honest about results. No guaranteed-results claims (the FTC + compliance line). Optimize on **reply/meeting
  rate, not opens** — Apple Mail Privacy Protection inflates opens, so opens are a vanity signal.
- Right tools, used safely. Target with Sales Navigator / ZoomInfo / Apollo (and local-business data where
  the buyer isn't on LinkedIn); automate LinkedIn with cloud tools and cold email with Instantly / Smartlead;
  CRM is `company.yml` → `integrations.crm`. All third-party LinkedIn automation carries ban risk, so **run
  within the account-safety limits** (`tooling-and-stack.md`) and treat platform terms (LinkedIn UA) as a
  gate separate from the law (`legal` skill) — a lost account is as costly as a legal miss. Pick the channel
  to the prospect; not every audience lives on LinkedIn.
- Book and hand off — don't oversell. Start the conversation, book the diagnostic/discovery, and hand off
  with context; promising what the close can't deliver just moves the disappointment downstream.
- **Honor opt-outs instantly and permanently**, and respect prospect-data privacy (the `legal` posture) —
  this is both the law and the fastest way to keep complaint rates down.

## Workflow A — Build & score the target list

Per `icp-and-targeting.md` + `tooling-and-stack.md`: source from the data layer — Sales Navigator /
ZoomInfo / Apollo / Clay for buyers reachable on LinkedIn, local-business data (Google Maps, Yelp, local
databases) for segments that aren't — plus your existing CRM data; capture the
`prospect-list-template.csv` fields; verify contacts (bad addresses spike bounces and burn the domain); then:
```
python scripts/score_leads.py prospects.csv --top 25
```
Work tier **A then B**; nurture C; drop D (disqualified/weak). Pull each prospect's real `{observation}`
from genuine signals (the `market-radar` skill's radar, a quick site/Maps check). For tier-A, generate the
**audit opener** (`references/audit-opener.md`) — it runs a real quick public check and hands you the true
top observation.

## Workflow B — Write the sequence

Per `messaging-and-sequences.md` + `assets/sequence-template.md`: short, specific, value-first (lead with
your lowest-friction offer), in the voice from the `product-voc` skill (Petra), with a real personalized
observation and one soft CTA. Multi-touch, spaced. Pick the channel to the prospect: for local/offline
segments, email + local data + phone are often primary; use LinkedIn (Sales Nav targeting + cloud
automation) for buyers who live on the platform. When multichannel, sequence deliberately — LinkedIn opens
the door, email converts — and run LinkedIn **within the account-safety limits** (`tooling-and-stack.md`).
Calls only if DNC-cleared; **never cold-text**.

## Workflow C — Compliance & deliverability gate (before any send)

- Compliance (`outbound-compliance.md`): CAN-SPAM done right (truthful headers, physical address, working
  opt-out honored ~48h); calls DNC-scrubbed + TCPA-cleared; **never cold-text**; route the hard calls to
  the `legal` skill.
- Deliverability (`deliverability.md`): separate warmed domain; SPF/DKIM/DMARC + one-click unsubscribe;
  verified list; steady ramped volume; weekly Postmaster monitoring; **auto-pause on bounce >2% /
  complaints >0.3%** (crossing these tanks sender reputation).
- LinkedIn account safety (`tooling-and-stack.md`): if the campaign uses LinkedIn automation, confirm it's
  **within safe limits** (~20–25 connects/day, never max ~100/week, acceptance >25–40%, ramped on new
  accounts, no ToS-violating scraping). Platform terms are a separate gate from the law.
- **Gates: compliance-review (content) + the `legal` skill (channel law) + owner (approval) before the
  first send.**

## Workflow D — Book & hand off

Light fit check (right segment, reachable decision-maker, can afford, real gap) → book the diagnostic/
discovery → **handoff brief to the closer** (the owner / Mark) with the context and observation → log
everything in your CRM (`integrations.crm`) → if won, hand to the `customer-success` skill (Cora) for
onboarding. Any reply (even "not now") exits the sequence to a human; opt-outs stop it permanently.

## Reusability

Written as a generic B2B outbound motion — the structure (tight ICP → verified scored list → value-first
compliant sequence → protected deliverability → book & hand off) serves any outbound program; swap the ICP
and offer in `company.yml`. Coordinate with the `market-radar` skill (signals, Remy), `product-voc`
(voice, Petra), `compliance-review` (content, Gus), `legal` (law, Lex), `data-analytics` (metrics, Dana),
and your CRM (system of record).
