# Content Slop Rubric (portable)

The criteria for judging whether written content (blog, email, ad, social, deck copy)
is "AI slop": generic, templated, or substanceless. Portable: this file hardcodes no
company facts. Ground brand judgment in `company.yml` → `brand.voice` /
`brand.banned_phrases` and any brand-voice reference under `kb_dir`; if a blog-engine
skill ships a brand-voice doc, read it too.

Slop is NOT "written with AI". Slop is low-quality regardless of who wrote it.

## Judge three things
1. Genericness: could any company have published this? No real point of view,
   no specifics, no named detail, restates the prompt, listicle bloat, hedging.
2. Substance: does it actually help the reader, or is it empty calories? Apply a
   people-first test. Thin or scaled-content-abuse is slop.
3. Distinctiveness: does it carry something only this brand would know or say (a
   real operator detail, a signature reframe), or is it a template a competitor
   could clone in an afternoon? Lack of distinctiveness is the core "hard to
   replicate" failure.

## Block-level tells (must not ship)
- Fabricated or uncited statistics, invented results, made-up counts. (The legal
  call belongs to Gus / compliance-review; flag it here as a slop and honesty tell
  and defer the FTC/claims ruling to Gus.)
- Pure filler with zero concrete information across a whole section.
- Any punctuation or phrase your house style explicitly bans (`company.yml` →
  `brand.banned_phrases`). If nothing is banned, this is not a tell.
- Absent founder/operator specificity in CLIENT-FACING sales or landing copy: no
  real operator detail that only your brand would know (a named scar from the work,
  a lesson only an insider has, the founder's specific pedigree). Guardrail: this is
  a block ONLY for client-facing sales/landing copy; for routine high-cadence blog
  it stays a warn (below) so autonomous blog volume is not over-blocked.

## Warn-level tells (should fix)
- Generic AI filler and avoid-words: "leverage", "synergy", "supercharge",
  "cutting-edge", "revolutionary", "game-changer", "seamless", "unlock",
  "in today's digital landscape", "it's important to note", "when it comes to",
  "in conclusion".
- Templated structure: every section the same shape, mechanical intro / three
  points / conclusion, keyword stuffing.
- Hedging and repetition, restating the question, no stance.
- Abstraction with no example, number-with-source, or named specific.
- Absent founder/operator specificity in routine blog or non-sales content (warn
  only; the client-facing sales/landing case is a block, above).

## Do not flag
- Clearly-labeled, well-made AI imagery (allowed). Judge imagery only for genuine
  quality failures (garble, off-brand, uncanny, mislabeled, used as fake proof).
- A confident, specific, plain-spoken piece with a real point of view, even if
  short. Brevity is not slop.

## Scoring
0 to 59 block territory, 60 to 79 warn, 80 to 100 clean. Higher is cleaner. A single
block-level tell caps the score in block territory.
