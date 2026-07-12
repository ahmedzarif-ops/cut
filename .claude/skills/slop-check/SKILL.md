---
name: slop-check
description: Run the anti-AI-slop critic (Vera) on content or design. Use to check a file, a directory, or pasted copy for AI slop (generic, templated, substanceless work) before it ships, or to audit existing surfaces; runs as a build gate sibling to the compliance-review (Gus) gate. Returns a slop score, located findings, and fix recommendations. Reach for it whenever the user wants to know if something reads as generic or would be easy to copy, even if they never say the word "slop". Triggers include "check this for AI slop", "is this slop", "run Vera", "slop check", "is this too generic", "does this sound AI-written", "would a competitor copy this", "is this distinctive enough", "vet this copy/design before it goes live". Detect-and-recommend only; never rewrites.
---
<!-- learning-loop: required -->

# slop-check: the Anti-AI-Slop Gate (Vera)

Runs Vera, the read-only anti-AI-slop critic, over content or design and returns a
structured verdict (slop score + located findings + fix recommendations). Vera
detects and recommends; she never rewrites. The builder applies the fixes.

Slop is NOT "made with AI". Labeled, well-made AI imagery is allowed; Vera flags
only genuine quality failures.

## Invocation
`/slop-check <path | directory | "pasted text"> [content|design|both]`

If the mode is omitted, infer it from the target (a page, UI, HTML, CSS, or TSX
implies design; prose or markdown implies content).

## Steps
1. Resolve the target. For a file, read it. For a directory, gather the candidate
   files and run each one. For pasted text, use it directly.
2. Run the mechanical tells first: scan the target for the cheap, deterministic
   signals — banned phrases and avoid-words from `company.yml` → `brand.banned_phrases`,
   eyebrow overuse, and any punctuation your house style bans there. These mechanical
   tells are cheap to check with a plain string/regex scan and easy for a judgment
   pass to overlook, so compute them here and hand them to Vera to fold in.
3. Dispatch the `ai-slop-critic` agent (Vera) with the mode, the target text or
   path, and the pre-computed mechanical-tell findings to fold in. For a prose/content
   pass, open `references/ai-tell-taxonomy.md` — the 33-tell AI-writing detector
   (signal + human fix per tell, plus how punctuation policy defers to your house
   style) — and work the target against it. Ground brand judgment in `company.yml`
   → `brand.voice` / `brand.banned_phrases` and the knowledge base under `kb_dir`;
   never invent what the brand would or wouldn't say.
4. Return Vera's verdict verbatim — she owns the slop lens, and paraphrasing or
   re-scoring her output would let self-review leniency creep back in. For a
   directory, aggregate: list each file with its score and the count of block and
   warn findings, then the worst offenders.

## Use as a build gate
Other skills reference this as a gate before shipping client-facing content or
design, sibling to the compliance-review (Gus) gate. The caller folds every
`block` finding before shipping. An automated caller (for example a blog machine)
can require `SLOP_SCORE >= 80 AND zero block findings` to pass.

## Boundaries
- Read-only. Detect, flag, recommend. Never rewrite or ship.
- Gus (compliance-review) owns FTC/claims; Iris (creative-director) owns final
  design taste; Vera owns the slop and distinctiveness lens. Defer accordingly.

## Portability
The rubric docs (`content-slop-rubric.md`, `design-slop-rubric.md`) and Vera's
judgment instructions are written to be company-agnostic: every brand fact comes
from `company.yml`, never hardcoded here. A product's in-app "AI-slop check"
feature can reuse them without forking.
