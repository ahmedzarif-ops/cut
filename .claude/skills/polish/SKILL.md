---
name: polish
description: The FINAL visual-polish gate, run by Iris (the creative-director agent) on every customer-facing asset before it ships — landing pages, the marketing site, pitch/sales decks, webinars, ads, emails, the product UI, one-pagers, case studies. A read-only craft gate built on design-engineering motion standards, taste, brand, responsiveness, and accessibility. It scores polish 0-100, returns located before/after fixes, and blocks below the bar. Triggers include "polish this", "run polish", "final polish", "/polish", "does this clear the polish gate", "is this ready to ship" — reach for it whenever a customer-facing asset is about to go out for a final craft/taste/motion pass, even if the words "polish" or "skill" are never said. A critique-and-return gate, not a redesign or a build — Iris (or the owner) applies the fixes.
---

# /polish — Iris's final polish gate

The **last gate** a customer-facing asset passes before the owner-gated deploy. It is a craft + taste polish, run by **Iris** (the `creative-director` agent), built on design-engineering motion standards. The goal: nothing customer-facing ships that a top design studio would send back. "Good enough" is not the bar; **polish is the differentiator.**

## When it runs

- **On every customer-facing asset**, as the final step before the owner-gated deploy/send: the marketing site + landing/campaign pages, pitch/sales decks, webinars, paid-ad creative, lifecycle emails, the product UI, one-pagers, and case studies.
- **After** the functional/correctness gates, the compliance gate (Gus), security (Cyrus), and content-slop (Vera) — polish is the taste/craft final pass, not a substitute for them.
- **Not** for internal tooling/docs (only customer-facing work).

## Who runs it

Dispatch the **`creative-director` agent (Iris)**. Iris loads and applies her inherited motion/craft skills for this gate:
- **`design-engineering`** — the animation decision framework, easing/duration bars, press-feedback, origin-aware popovers, GPU-only props, stagger, the invisible details.
- **`review-animations`** (+ its `STANDARDS.md`) — the strict motion-review method; run it over any motion in the asset.
- **`animation-vocabulary`** — the shared motion/interaction vocabulary for naming and judging animations.

## The polish checklist (the dimensions Iris scores)

1. **Motion & interaction** — every animation justified; under 300ms on UI; `ease-out`/strong custom curve (never `ease-in` on UI); never `scale(0)` entries; press-feedback (`scale(0.97)`) on pressable elements; `transform`/`opacity` only; origin-aware popovers; interruptible where rapid. When unsure, delete it.
2. **Layout & hierarchy** — spacing rhythm, alignment, a clear focal path, generous whitespace, nothing cramped or arbitrary.
3. **Typography** — scale/contrast, line length + line-height, weights with intent, no orphan/widow slop, tabular numbers where numbers change.
4. **Color & brand** — on the company (or client) brand system defined in `company.yml -> brand.visual_notes`; named tokens, not improvised hex; sufficient contrast; restraint.
5. **Imagery & icons** — intentional, consistent, on-brand; any AI-generated imagery of customers/people must be grounded in the ICP (`company.yml -> icp.description` / `icp.research_doc`) and never framed as a real customer, testimonial, or result; no stocky/generic filler.
6. **Responsive** — verified at the owner's primary review viewport (default 430px, iPhone 16 Pro Max class); no horizontal scroll; tap targets >= 40px.
7. **Accessibility** — WCAG-AA contrast; `prefers-reduced-motion` honored (gentler, not zero); focus-visible states; SR-announced state changes.
8. **Distinctiveness** — does it look like *this company*, or like every other template? (Complements Vera's content-slop lane — this is the visual-slop lane.)

## Output contract

Iris returns:
- A **polish score 0-100** (higher = more polished).
- A **verdict**: `SHIP` (>= 85) or `POLISH-FIRST` (< 85).
- A **located findings table** in a strict Before / After / Why format (one row per fix, exact `file:line` or slide/section), highest-impact first.
- The **top 3 highest-leverage fixes** called out.

## Blocking rule + lane boundaries

- **Blocking:** a customer-facing asset scoring **below 85 is a blocking gate** — fold the fixes (or the owner explicitly overrides). 85 is the bar because below it an asset reads as templated or merely "good enough," which undercuts a premium positioning — the whole point of the gate.
- **Lane:** polish owns craft + taste + motion + responsiveness + a11y-of-presentation. It routes the rest out to the gate that owns it: correctness/bugs → code review; regulated claims / stat-sourcing → Gus (`compliance-review`); security → Cyrus (`security`); deep copy-slop/voice → Vera (`slop-check`); binding legal → Lex (`legal`). Polish complements these; it does not replace them.

## Relationship to the gate roster

Polish is the **final craft gate**, the visual sibling of Knox (clean-code) and Vera (content-slop): Knox judges the code, Vera judges the copy, **Iris `/polish` judges the finished customer-facing experience** — the last taste pass before the owner's deploy go.
