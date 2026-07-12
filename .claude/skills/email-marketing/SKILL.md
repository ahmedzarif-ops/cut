---
name: email-marketing
description: Design, write, and optimize your company's OWN value-first email and lifecycle marketing — welcome sequences, nurture flows, onboarding/activation, abandonment recovery, upgrade paths, re-engagement, and advocacy — grounded in your ICP, owner, and message-spine knowledge base and gated by the compliance reviewer. Reach for it whenever the user mentions email marketing, lifecycle email, welcome sequence, nurture flow, onboarding emails, abandonment sequence, drip campaign, re-engagement emails, or email for the offer, even if they do not explicitly say "skill." Not for paid ad copy (use paid-media), blog posts (use blog-engine), organic social (use social-engine), an in-product customer-facing email feature, or general architecture (use build-patterns).
---
<!-- learning-loop: required -->

# Value-First Email and Lifecycle Marketing

This skill is your company's lifecycle-email engine. It designs, writes, evaluates, and
optimizes your OWN value-first email — email that earns attention by making the reader more
capable, more informed, and better served BEFORE asking them to buy, and moves qualified
prospects up your offer ladder. The skill orchestrates in the main session, dispatches two
specialist agents, and gates on the compliance reviewer and the owner.

## Ground yourself in config first

Every company fact this skill needs comes from config, never from invention:
- **What you sell** — `company.yml` → `offer.summary`, `offer.pricing_notes`, `offer.booking_link`. The offer ladder and its live prices are the single source of truth; never quote a stale figure from an older doc. Confirm the live product/offer page URLs against your site before linking.
- **Who you sell to** — `company.yml` → `icp.description`, and the full research at `icp.research_doc` (under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent customer facts, personas, or objections.
- **How you sound** — `company.yml` → `brand.voice` and `brand.banned_phrases`, plus your message-spine KB under `kb_dir`. Governs every line.
- **Who the owner/founder is** — `company.yml` → `owner.name`. Any founder-led proof is past-framed and honest (see `guardrails.md`).
- **Legal constraints** — `company.yml` → `legal.jurisdiction`, `legal.regulated_claims`.
- **Sending infra** — `company.yml` → `integrations.esp` (email service provider) and `integrations.crm`. If blank, the engine produces platform-neutral output and a human wires the platform.

## Overview (the boundary)

- Owns your lifecycle EMAIL: program design (triggers, branches, exits, measurement),
  value-first editorial, ready-to-send sequence copy, segmentation + a platform-neutral
  tracking schema, subject/CTA/segment-module libraries, QA, deliverability, experimentation.
- It RECEIVES lifecycle plays delegated by the growth strategy layer and produces the email
  assets. It is a sibling to `blog-engine`, `social-engine`, and `paid-media`.
- It does NOT do: the ESP / automation wiring or actual sending (a human wires the platform);
  an in-product customer-facing email feature (product-side); paid ad copy; blog posts;
  organic social.

This is your marketing moving prospects up YOUR OWN ladder, not a product feature that writes
a customer's emails for them.

## When to use

- Build or optimize a lifecycle email program (welcome, nurture, onboarding, abandonment,
  upgrade, re-engagement, advocacy).
- Design the segmentation, the contact-property/event schema, or the editorial calendar.
- Plan the email measurement, deliverability, or experimentation for a lifecycle push.

## When not to use

- Paid ad copy / paid-media strategy → `paid-media`.
- Blog posts → `blog-engine`. Organic social → `social-engine`.
- An in-product email feature (product writing the customer's emails) → product build.
- General architecture → `build-patterns`.

## Workflow (one todo per step)

1. Ground. Read the KB docs below; read your config (`company.yml`) and the shared KBs under `kb_dir` (ICP research, message spine, owner/founder story); and skim the live surfaces the emails point to (your offer/product pages) so links and promises message-match.
2. Intake the program brief. Fill `templates/program-brief.template.md` with the owner. Pick the run SCOPE: a FOUNDATION run (the core-ladder sequences) or a named program. Default segments from the KBs; ask only real gaps; never invent research.
3. Optional light research. Cross-reference your market-radar / demand-signal feed under `kb_dir` + the ICP KB FIRST. Only pull a small voice-of-customer sample if the brief exposes a real gap. No heavy research sweep by default (this engine grounds in existing KBs).
4. Dispatch the `email-lifecycle-strategist` agent with the brief + KB pointers. It returns the filled lifecycle map (strategy, segmentation, schema, per-program specs, 90-day roadmap, ranked first-20).
5. MAP GATE. Present the lifecycle map + roadmap + ranked first-20 to the owner. They approve or edit, and confirm which sequences to write first, BEFORE any copy is generated.
6. Dispatch the `email-copywriter` agent with the approved map + the scoped sequence list. It returns the ready-to-send sequences + the libraries.
7. Compliance gate. Run the compliance-review gate (the `content-compliance-reviewer` agent, Gus) on the copy and any claims. Fix every flag before continuing — unresolved compliance flags are what create legal/brand exposure on a live send.
8. Assemble outputs into your run folder under `kb_dir` (e.g. `kb/email/<YYYY-MM-DD>/`): `index.html` (from `templates/email-hub.template.html`), `lifecycle-map.md`, `sequences/` (one file per program), `schema.md`, `libraries.md` (subjects/preheaders/CTAs/segment-modules), `roadmap.md` (90-day + ranked first-20).
9. ASSEMBLE BUILT EMAILS. From the approved + compliance-passed copy, write `<run>/sequences/<seq>.json` (the build schema), then run: `node .claude/skills/email-marketing/templates/build-emails.mjs <run>/sequences/<seq>.json .claude/skills/email-marketing/templates/email-shell.template.html <run>/sequences/built/<seq>`. If the run folder lives outside the repo, use absolute / `~` paths. This fills the branded `email-shell.template.html` per email, applies the UTM links (see `link-and-tracking.md`), and writes the built HTML + `preview.html`. (Skip for a copy-only run.)
10. Owner's final yes. No auto-push to any ESP; a human loads the flows (the human gate). Append the run to `learnings.md`.

## Knowledge base (read before running)

- `guardrails.md` — the never-do list, value-first rules, voice, names/privacy, proof discipline, pricing-from-config, honesty separation.
- `offer-roles.md` — the offer ladder and each step's EMAIL role; primary promise + conversion event per step.
- `message-factor-model.md` — the shared factor/pillar model every email maps to (so email tells the same story as every surface), and the per-recommendation fields.
- `segmentation.md` — the funnel-stage / segment / buyer-reality / primary-leak / engagement dimensions.
- `lifecycle-programs.md` — the required programs A-L and the spec shape each must define.
- `value-first-principles.md` — one-lesson-per-email, teach-before-asking, tangible assets, earn-the-next-email, personalize-only-when-it-helps.
- `editorial-pillars.md` — the ongoing content pillars for recurring sends.
- `frameworks-and-research.md` — the copy-framework selector and the labeled research methodology.
- `data-and-deliverability.md` — the platform-neutral data model, automation standards, consent + deliverability rules.
- `measurement.md` — downstream-outcome metrics and the experimentation rules.
- `link-and-tracking.md` — the destination keys, the UTM scheme, and the tracking boundary.
- `templates/` — the program-brief intake, the lifecycle-map contract, the email-sequence contract, the HTML hub shell, the branded `email-shell.template.html`, and the zero-dep `build-emails.mjs` build script.
- `learnings.md` — the running registry of runs.
- The behavioral-model catalog (Cialdini's 7, behavioral-econ levers, buyer psychology): consult the `paid-media` skill's marketing-psychology reference when choosing a persuasion angle; each model carries its ethical line.

## The two agents

- `email-lifecycle-strategist`: brief + KBs → the lifecycle map (strategy, segmentation, schema, program specs, roadmap, ranked first-20). Dispatched at step 4. Plan only, no send-ready copy.
- `email-copywriter`: the approved map → the ready-to-send sequences + libraries. Dispatched at step 6, only after the map gate.
- The MAP GATE between them (step 5) is the concept-gate-before-spend: the owner approves the architecture before copy is written.

## Guardrails (non-negotiable; full detail in guardrails.md)

- PROOF: honest proof only. If the company has no attributable testimonials yet, use founder-led proof (past-framed, from `owner.name`), product-as-proof (label any sample data as a sample), sourced stats (each carrying its reliability flag — trace every statistic to a named primary source), and any real guarantee. Zero fabricated testimonials/counts/results. The advocacy programs COLLECT real proof; they never fabricate it.
- VALUE-FIRST: one useful lesson per email; teach before asking; no discount blasts; no fake urgency; earn the next email (frequency caps, suppression, honest unsubscribe).
- VOICE: plain, audience-aware, no hype. Honor `company.yml` → `brand.voice` and `brand.banned_phrases`.
- PRICING: always the live values from `company.yml` → `offer.pricing_notes` (or your live pricing source). Never a stale figure from an older doc.
- HONEST SENDING: documented consent, accurate sender identity, working + one-click unsubscribe, transactional/marketing separation, no purchased lists. Open rate is not a standalone metric.

## Output

Per run, into your run folder under `kb_dir` (e.g. `kb/email/<YYYY-MM-DD>/`): `index.html` (the
interactive command center), `lifecycle-map.md`, `sequences/` (ready-to-send copy per program),
`schema.md`, `libraries.md`, and `roadmap.md`. The skill and agents live under `.claude/` and are
version-controlled; run artifacts live under `kb_dir`.
