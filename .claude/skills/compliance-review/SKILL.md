---
name: compliance-review
description: Manually run the independent content-compliance reviewer (Gus) against a target — a content draft, a file path (a product page, landing page, deck, ad, email, or blog post), or pasted copy — for an on-demand advertising-claims, substantiation, and brand-voice audit of any customer- or public-facing surface before it ships. Use whenever the user wants copy checked for compliance or on-brand voice, even if they don't say the word "skill". Triggers include "/compliance-review", "compliance check this", "audit this copy", "is this on-brand and compliant", "run the compliance gate", "FTC-check this claim", "review this before we publish". Read-only — it returns a verdict with findings and suggested fixes and never edits or ships anything, and the owner decides.
---

# compliance-review: the Advertising-Claims and Brand-Voice Gate (Gus)

Run the independent compliance and brand-voice gate against a target, on demand. Gus is a
read-only reviewer: he checks advertising claims, claim substantiation, industry-specific
language, and brand voice, then returns a verdict with located findings and suggested fixes.
He detects and recommends; he never edits or ships. The author applies the fixes, and the
owner (`company.yml` → `owner.name`) decides what ships.

This is the same gate content skills auto-dispatch before the owner sees a draft. This skill
runs it on demand against any surface — including one produced outside the content skills.

## Invocation

`/compliance-review <target>` where target is one of:
- pasted copy (review it directly),
- a file path (the reviewer will Read it),
- "the draft we just produced" (review the current draft in context).

## Steps

1. Resolve the target. If a file path was given, confirm it exists. If copy was pasted, use it
   directly.
2. Dispatch the `content-compliance-reviewer` subagent (Gus) with the target content or file
   path, and tell it to apply its full checklist. Ground the review in the company facts, not
   in anything hardcoded:
   - advertising / unsubstantiated-claims rules and any regulator named in `company.yml` →
     `legal.regulated_claims` (and `legal.jurisdiction`); if that field is blank, apply general
     truth-in-advertising principles (no unsubstantiated superlatives, results claims, or
     guarantees) and flag the gap,
   - any industry-specific or licensing language required by the offer (`company.yml` →
     `offer.*`),
   - stat and proof sourcing — every number or claim traces to a real source; never fabricate
     one to fill a gap (flag it as unsourced instead),
   - brand voice and banned phrases (`company.yml` → `brand.voice`, `brand.banned_phrases`),
   - the buyer it is aimed at (`company.yml` → `icp.description` / `icp.research_doc`); if the
     ICP research doc is missing, note that claims can't be substantiation-checked against the
     real buyer,
   - platform content policy for wherever it publishes.
3. Return Gus's verdict to the owner. On PASS, say so. On FLAG, present the findings and fixes
   but leave them unapplied — Gus is an independent read-only gate, so a human decides what to
   change and ship.

## Honesty wall

Gus never invents a source, a stat, or a fact to make a claim clear the gate. An unsupported
claim is a FLAG with the fix "remove it or cite a real source," never a fabricated citation.
Any placeholder or fabricated proof (invented testimonials, made-up numbers, unearned
badges) is a block, not a rewrite target.

## Boundaries

- Read-only. Detect, flag, recommend. Never edit or ship.
- Claims / substantiation / brand-voice lane only. Gus routes correctness and code bugs to code
  review, security to the security gate (Cyrus), legal-contract questions to the legal reviewer
  (Lex), design taste to creative direction (Iris), and AI-slop / distinctiveness to the
  anti-slop gate (Vera). He notes an out-of-lane issue in one routed line and does not rule on it.
- Any exclusions the company has configured (for example, a standing rule about placeholder
  testimonials) live in the reviewer's own instructions and in `company.yml`; you do not need to
  special-case them here.

## Use as a build gate

The build loop (`ship-a-feature`) references this as the compliance gate for external / marketing
copy — site, ads, email, decks, social, blog. Fold every block finding before shipping.
Internal-only tooling and docs do not need it.
