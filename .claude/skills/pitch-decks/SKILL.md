---
name: pitch-decks
description: Build per-segment, lead-personalized customer sales pitch decks - self-contained branded HTML decks a salesperson presents to a warm lead (screen-share, in person, or as a file/PDF), each carrying a transparently labelled Example Scenario simulation and an embedded animated product demo for that segment. Triggers include "build the pitch decks", "make a sales deck for [segment/vertical]", "deck for this lead and segment", "pitch deck for a vertical", "refresh a segment's Example Scenario, demo data, or pains". Reach for it whenever the ask is a warm-lead sales deck by market segment, even if the word "skill" is never said. Not for public landing/funnel pages (use cro-funnel), paid ads (use paid-media), blog (use blog-engine), social (use social-engine), email (use email-marketing), or investor/generic static decks. Orchestrates in the main session, dispatches the pitch-deck-writer agent per segment, and gates on compliance-review and the owner.
---

# Vertical Pitch-Deck Engine

This skill produces per-segment, lead-personalized **customer sales pitch decks**. Each deck is a
self-contained, branded HTML deck a salesperson presents to a warm lead (screen-share, in person,
or sent as a file / PDF), carrying a transparently labelled **Example Scenario** (a simulated
company in the lead's segment) and an embedded animated product demo for that segment. The skill
orchestrates in the main session, dispatches the `pitch-deck-writer` agent per segment, and gates
on `compliance-review` and the owner.

Ground every fact in `company.yml` (offer, owner, brand, pricing, ICP) and your knowledge base
under `kb_dir`. A rewritten deck NEVER hardcodes a company fact; it inherits them from config.

## Overview (the boundary)

- Owns the in-sales-conversation deck asset: the per-segment sales deck, its Example Scenario
  simulation, and its animated demo. It is the last step of the customer journey: ads -> funnel
  page -> free diagnostic -> (sales conversation) -> **pitch deck** -> close.
- Reuses your brand visual language, the ICP research doc, the message spine, and the owner/offer
  facts from `company.yml`.
- It is NOT a public marketing page (use `cro-funnel`), NOT an investor deck, NOT paid/blog/social/
  email (their own engines). A sibling content engine.

## When to use

- Build the per-segment sales decks, or a deck for a specific lead + segment.
- Refresh a segment's Example Scenario, demo data, or pains.

## When not to use

- A public landing page -> `cro-funnel`.
- Paid ad copy -> `paid-media`. Blog -> `blog-engine`. Social -> `social-engine`.
  Email -> `email-marketing`.
- An investor or generic company overview deck (build those directly, not through this engine).

## Workflow (one todo per step)

1. Ground. Read `deck-content-spec.md` (the arc + the `deck.json` schema), `company.yml` (offer,
   pricing, owner proof, brand voice, booking link, domain), and your KBs under `kb_dir`
   (`kb/icp-research.md` at `company.yml -> icp.research_doc`; `kb/message-spine.md` if you keep
   one). If the ICP research doc is missing, run ICP research FIRST - never invent customer facts.
2. Intake the run brief. Which segments (your market slices / verticals / ICP segments), and per
   segment a sample lead `{company, owner_name, city, segment, situation}`. If the owner does not
   supply real leads, invent a representative sample per segment FROM the ICP research doc. Ask
   only real gaps.
3. Dispatch `pitch-deck-writer` once per segment, in parallel (one agent per segment, so each deck
   stays focused). Each writes `<kb_dir>/pitch-decks/<date>/<segment>/deck.json`.
4. Compliance gate. Run `compliance-review` on every `deck.json` (Example Scenario framing + label
   intact, illustrative numbers, zero fabricated proof, owner proof past-framed if applicable,
   pricing accuracy vs `company.yml`, brand voice). Fix every flag before building - compliance
   issues are cheaper to correct in `deck.json` than in rendered HTML.
5. Build. For each segment, run from the project root:
   `node .claude/skills/pitch-decks/templates/build-decks.mjs <kb_dir>/pitch-decks/<date>/<segment>/deck.json .claude/skills/pitch-decks/templates/deck-shell.template.html <kb_dir>/pitch-decks/<date>/<segment>`
6. Verify each built deck: 0 leftover `{{` tokens, 0 em dashes, the `scenario-label` present, the
   8 slides present, the demo present. Eyeball at least one in a real browser (over a local server,
   not `file://`, if your brand uses any external asset - this shell uses system fonts so it is
   `file://`-safe).
7. Assemble a command-center `<kb_dir>/pitch-decks/<date>/index.html` (noindex hub linking every
   deck with build + compliance status).
8. Owner's yes. A human presents the deck; nothing auto-sends. Append the run to `learnings.md`.

## Knowledge base (read before running)

- `deck-content-spec.md` - the 8-slide arc, the Example Scenario rules, the demo data shape, and
  the exact `deck.json` schema (with a filled generic example).
- `templates/deck-shell.template.html` - the branded, self-contained deck chrome (slots + tokens,
  the demo styles + animation). System-font, no external requests, `file://`-safe.
- `templates/build-decks.mjs` - the zero-dependency build engine (section renderers, `composeDeck`,
  CLI). Its standalone test is `templates/build-decks.test.mjs` (run via `node`).
- `templates/sample.deck.json` - a complete generic example.
- `learnings.md` - the running registry of runs.

## The agent and the gate

- `pitch-deck-writer` (no MCP): one segment + the KBs -> that segment's `deck.json` (content
  only). Dispatched per segment at step 3.
- `compliance-review`: gates every deck's content at step 4. Fix every flag before building.

## Guardrails (these keep the deck legally safe and on-brand; full detail in deck-content-spec.md + the agent)

- The Example Scenario is a labelled simulation (the build renders the label). Keep it free of
  fabricated testimonials / counts / results / guaranteed outcomes - a real prospect could act on
  the deck, so anything not literally true is a compliance and trust risk. Illustrative numbers
  only, labelled.
- Pricing and offer tiers come from `company.yml -> offer` (the writer copies them into
  `deck.json -> offer.tiers` verbatim; verify against `company.yml`). One source of truth so prices
  cannot drift.
- Owner/founder proof (`deck.json -> proof`) is grounded in `company.yml -> owner`: true and, if
  the person's role has changed, past-framed. Never fabricate credentials, employers, or results.
- Voice: follow `company.yml -> brand.voice` and `brand.banned_phrases`. No em dashes, no emojis
  unless your brand voice allows them.
- Any regulated-claim rules in `company.yml -> legal.regulated_claims` bind every claim in the deck.

## Output

Per run, into `<kb_dir>/pitch-decks/<YYYY-MM-DD>/`: one `<segment>/deck.json` +
`<segment>/index.html` per segment, and a command-center `index.html`. The skill, agent, and
templates are version-controlled; run artifacts live under `kb_dir`. A human presents the deck;
nothing sends automatically.

<!-- learning-loop: required -->
