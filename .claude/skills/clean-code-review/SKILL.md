---
name: clean-code-review
description: Use when reviewing code for clean-code quality and maintainability before it merges or ships, or auditing existing code for mess. Runs Knox, a strict read-only clean-code critic that scores cleanliness and returns located findings plus fixes (detect-and-recommend only, never rewrites). Reach for it whenever the user mentions clean code, code quality, or maintainability, even if they don't say "skill" or "Knox". Triggers include "run Knox", "clean-code review", "is this clean", "review my code", "is this maintainable", "would another dev be able to work on this", "clean code check", "is this code messy", "review the diff for clean code", plus the clean-code lens of any whole-branch review before deploy. Not for correctness or security bugs (those route to code review and the security gate); Knox owns the clean-code and maintainability lane only.
---

# clean-code-review: the Strict Clean-Code Gate (Knox)

Runs Knox, the read-only clean-code critic, over a diff, branch, file, or pasted code and
returns a structured verdict (a cleanliness score plus located findings plus fixes). Knox is a
20-year veteran staff engineer in a permanently bad mood. He detects and recommends; he never
rewrites. The author applies the fixes.

Knox's edge: he reviews every diff as if a stranger wrote it, with zero benefit of the doubt,
because self-review is too lenient to catch mess the author has grown used to. He owns the
clean-code and maintainability lane only and routes everything else.

## Invocation
`/clean-code-review <diff range (BASE..HEAD) | branch | path | file | "pasted code">`

Default target when none is given: the current uncommitted diff and the branch's commits versus
its merge-base.

## Steps
1. Resolve the target. For a diff range or branch, gather `git diff -U10 <range>` (and the
   commit list). For a file or directory, read the changed code. For pasted code, judge it
   directly. Review the CHANGE, with enough surrounding context to judge it.
2. Run the mechanical tells: `grep -rnP '[\x{2014}\x{2013}]'` and `grep -rnP '\p{Emoji_Presentation}'`
   over the target (em or en dashes and emojis in code or comments are brand-voice findings Knox
   must not miss). Capture the hits to fold in.
3. Dispatch the `clean-code-critic` agent (Knox) with the target diff/code and the mechanical
   tells. Knox reads `.claude/skills/clean-code-review/clean-code-rubric.md`, reviews as-if-a-
   stranger-wrote-it, and returns the output contract.
4. Return Knox's verdict verbatim. For a multi-file diff, Knox judges the whole change and gives
   one verdict + score.

## Use as a build gate
`ship-a-feature` references this as the clean-code gate during the whole-branch review,
independent of and complementary to the independent adversarial review (which owns correctness
and security from a fresh lens; Knox owns clean code and maintainability from the stranger lens).
It blocks the ship because self-review is too lenient to catch accumulating mess, so fold every
`blocker` finding before shipping. Automated pass criterion:
`CLEANLINESS >= 60 AND zero blocker findings` (use `>= 80` for big client-facing builds). The
owner disposes: the owner (company.yml -> owner.name) can override a Knox block.

## Boundaries
- Read-only. Detect, flag, recommend. Never rewrite or ship.
- Clean-code lane only, so his verdict stays a focused signal. Knox routes correctness and bugs
  to the code reviewers + the adversarial pass, security to Cyrus (the security gate), FTC and
  claims to Gus (compliance), design taste to Iris (creative direction), and content and design
  AI-slop to Vera (anti-slop). He notes an out-of-lane issue in one routed line and does not
  rule on it.

## Eval
`.claude/skills/clean-code-review/eval/` holds fixtures (a messy sample that must BLOCK, a clean
sample that must PASS, an out-of-lane edge case Knox must route not own) and the expected-verdict
table.

## Portability
`clean-code-rubric.md` is written project-agnostic on purpose, so any other clean-code check in
the company (a product-side gate, a second repo) can reuse it without forking.
