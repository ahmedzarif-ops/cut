# Design Slop Rubric (portable)

The criteria for judging whether a page or UI is "AI slop": templated, generic,
or visually default. A deep source of truth is any installed taste / redesign
design skill (e.g. `~/.claude/skills/taste-skill/SKILL.md`). This file is the
checklist Vera applies; final design taste authority remains with Iris
(creative-director). Ground brand-visual judgment in `company.yml` →
`brand.visual_notes`.

Slop is NOT "designed with AI". A distinctive, intentional design is fine even if
AI produced it.

## Block-level tells (must not ship)
- AI-purple or blue gradient glow as the default accent (the "Lila" tell).
- Centered hero over a dark mesh or gradient blob with no real visual asset.
- Three equal feature cards as the default content section.
- Div-based fake screenshots, fake dashboards, or fake terminals standing in for a
  real product visual.
- Hero that overflows the first viewport (CTA below the fold), or a headline that
  wraps to four or more lines (a font-size error).
- Button text unreadable against its background (fails WCAG AA contrast).

## Warn-level tells (should fix)
- Inter plus slate-900 as the unconsidered default type and color.
- An eyebrow (small uppercase wide-tracking label) above most sections. Cap is
  one eyebrow per three sections (count this deterministically).
- Generic glassmorphism on everything.
- Zigzag left-image / right-text repeated more than twice in a row.
- One layout family (for example three-column cards) reused for most sections.
- Mixed corner-radius or accent color with no documented rule (consistency lock).
- Fake-precise invented numbers (for example "4.1x", "92%") with no source or mock label.

## Do not flag
- Clearly-labeled, well-made AI imagery used as illustration (allowed). Judge it
  only for garble, off-brand, uncanny, mislabeled, or fake-proof use.
- A deliberate, consistent, distinctive system, even if minimal.

## Scoring
0 to 59 block territory, 60 to 79 warn, 80 to 100 clean. Higher is cleaner. A single
block-level tell caps the score in block territory.
