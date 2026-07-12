---
name: cro-funnel
description: Build or optimize a high-converting funnel landing page for paid traffic, or CRO-audit a live surface. Triggers include "build a landing page", "make a campaign page for the ads", "funnel page for IG/TikTok/Meta", "sales page for the offer", "CRO audit", "improve conversion on", "landing page for the offer". Reach for it whenever the ask is about a paid-traffic page or its conversion, even phrased casually ("where do the ads send people", "why isn't this page converting") and even if the words "landing page" or "skill" are never said. Builds noindex campaign pages with honest proof, honest enforced urgency, and an upsell/downsell funnel, grounded in your ICP and offer config. Not for blog posts (use blog-engine), social (use social-engine), or general architecture (use build-patterns).
---
<!-- learning-loop: required -->

# CRO and Funnel Optimization

This skill builds high-converting, sales-letter-style funnel landing pages for paid traffic and
CRO-audits existing surfaces. Every page is built around YOUR real business model, offer ladder,
ICP, and proof, so generic template landing-page patterns do not apply — the specifics come from
config, never from invention.

The skill orchestrates the workflow in the main session and dispatches the `landing-page-builder`
agent to generate pages. The compliance reviewer is the gate.

## Ground yourself in config first

Every company fact this skill needs comes from `company.yml`, never from a hardcoded assumption:
- **What you sell** — `offer.summary`, `offer.pricing_notes`, `offer.booking_link`. The offer ladder and its live prices are the single source of truth; never quote a stale figure. Confirm live product/offer page URLs against your site before linking.
- **Who you sell to** — `icp.description`, and the full research at `icp.research_doc` (under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer facts, personas, pains, or objections.
- **How you sound** — `brand.voice` and `brand.banned_phrases`, plus your message-spine KB under `kb_dir`. Governs every word.
- **Who the owner/founder is** — `owner.name`. Founder-led proof is past-framed and honest (see `references/ethics-guardrails.md`).
- **Legal constraints** — `legal.jurisdiction`, `legal.regulated_claims`.
- **Deploy + analytics** — `integrations.deploy_target`; wire your own analytics/checkout seams (see `references/kpis.md`).

## When to use

- Build a paid-social (IG / TikTok / Meta) campaign landing page for a step of your offer ladder.
- Build the funnel mechanics (upsell to a higher tier, exit-intent downsell, honest timed offer).
- CRO-audit a live surface and return ranked, evidence-tagged opportunities.

## When not to use

- Blog posts → `blog-engine`. Organic social → `social-engine`. Paid ad copy/strategy → `paid-media`.
- General architecture → `build-patterns`.

## Workflow (follow in order; create a todo per step)

1. **Ground + intake the Message Research Brief.** Fill `templates/message-research-brief.template.md` with the owner. Pull defaults from your ICP research (`icp.research_doc`) and any founder/proof KB under `kb_dir` FIRST. Mark unknowns TBD and ask; never invent research. Optionally refresh research (a competitor-landing-page teardown) ONLY if the brief reveals a real gap; the KBs are usually sufficient.
2. **Pick the page type** from `references/page-blueprints.md` using the buyer awareness stage and the six-factor model (`references/six-factor-model.md`).
3. **Dispatch `landing-page-builder`** with the completed brief + the chosen page type. It generates the noindex campaign page (route file + section composition from your funnel section library + copy) grounded in the KBs.
4. **Run the compliance gate** (the `content-compliance-reviewer` agent, Gus) on the generated page. Fix every compliance flag before continuing — these pages receive paid traffic, so any fabricated-proof or non-compliant claim reaches real prospects.
5. **Run the `references/cro-scorecard.md` self-audit.** Tighten message match, CTA focus, friction, proof, objection coverage.
6. **Wire tracking + honest timed offer + verify noindex.** Confirm the analytics lead/checkout/purchase events fire at the real seams; confirm any timed-offer countdown reflects a real, server-enforced, reverting deadline; confirm noindex meta + robots disallow + absence from nav/sitemap.
7. **Pre-launch QA** (`references/qa-checklists.md`). The fabricated-proof gate blocks launch (see Guardrails): no fabricated testimonials or stats may receive paid traffic.
8. **Build + browser-verify locally, deploy on the owner's explicit go, verify live.** Then append the build + learnings to `references/learnings.md`.

## Knowledge base (read before building)

- `references/positioning.md` — how to build the positioning and competitive-alternatives frame from config.
- `references/segments.md` — how to derive audience segments from your ICP and match message angles per segment.
- `references/six-factor-model.md` — Findability / Proof / Clarity / Trust / Responsiveness / Follow-up.
- `templates/message-research-brief.template.md` — the required pre-build intake.
- `templates/voice-of-customer.template.md` — the VoC capture grid.
- `references/page-blueprints.md` — per-page-type blueprints + the decision tree + the locked mechanics.
- `references/copy-frameworks.md` — the framework library (PAS / BAB / 4Ps / QUEST / etc.) + voice rules.
- the behavioral-model catalog (Cialdini's 7, behavioral-econ levers, buyer psychology) — consult the `paid-media` skill's marketing-psychology reference when choosing a persuasion angle for a page; each model carries its ethical line.
- `references/cro-scorecard.md` — the repeatable audit scorecard.
- `references/experiments.md` — the test discipline + the low-volume rule.
- `references/kpis.md` — the funnel KPI dashboard spec.
- `references/qa-checklists.md` — pre-launch (incl. fabricated-proof blocker) + post-launch checks.
- `references/ethics-guardrails.md` — the never-do list + honest-urgency + the founder NAME/PRIVACY rules.
- `references/learnings.md` — the running registry of past builds.

## Guardrails (load-bearing; full detail in references/ethics-guardrails.md)

These keep paid-traffic pages legally and factually defensible, so apply the reasoning behind each
to new cases, not just the literal wording.

- Voice: plain, audience-aware, no jargon, no hype — a distrustful buyer reads plain language as more credible. Honor `brand.voice` and `brand.banned_phrases`. Avoid generic hype words (revolutionary, seamless, leverage, unlock, synergy, transform your business, 10x).
- Name: use the owner's real public name from `company.yml` → `owner.name` in all public copy.
- Privacy: if a founder is still employed elsewhere, present their roles as PAST experience, never as present-tense current employment, and never name a current employer — implying current employment at a named company is a factual and legal exposure.
- Proof: if you have no attributable testimonials yet, lean on founder-led proof, product-as-proof (label any sample data as a sample), sourced stats (with reliability flags), and a real guarantee. Inventing testimonials, reviews, counts, or outcomes is fabricated proof reaching real prospects — off-limits. Any placeholder/sample proof component must be replaced with something real before any paid traffic hits the page.
- Honest urgency only: real, enforced, reverting deadlines. Resetting countdowns or fake scarcity erode the trust the page depends on.

## Offer ladder

Read the live offer ladder from `company.yml` → `offer.summary` + `offer.pricing_notes`, and the
booking/consult path from `offer.booking_link`. Never hardcode a tier or price in a page; the page
composes against whatever the current ladder is. If the ladder is not yet defined, define it with
the owner before building a funnel.

## Funnel mechanics (default pattern)

Noindex campaign routes, per-visitor timed-offer window enforced server-side, a money-back
guarantee, an entry page per offer-ladder step, and an exit-intent downsell — all composed from a
shared funnel section library (see `references/page-blueprints.md`). Wire the timed-offer engine and
checkout seams to your own stack; the blueprint describes the honest pattern, not a specific vendor.

## Output

A noindex campaign page (not crawlable, not navigable, for paid ad traffic), compliance-passed and
CRO-audited, deployed on the owner's explicit go. Plus, on request, a ranked list of live-site CRO
opportunities (format in `references/cro-scorecard.md`).
