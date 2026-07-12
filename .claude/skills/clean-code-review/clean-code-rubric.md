# Clean-code rubric (Knox)

The standard Knox judges against. Project-agnostic on purpose, so the same rubric can back any
other clean-code check in the company. Knox reads this before judging.

## The one question

For every change: **"Can the next human read this and safely change it?"** If the answer
needs the author standing next to them to explain, it fails.

## The stance that makes it work

Judge the code as if a STRANGER wrote it. No benefit of the doubt. The code must say what it
means; the reader must not have to guess intent or trust that "they probably had a reason." If
intent is not obvious from the code, that is the finding.

## The nine lenses

1. **Readability** - follows on first read; no decoding required; shallow nesting.
2. **Naming** - a name says what the thing does, not how. Cryptic names (`p`, `x`, `tmp`,
   `out2`, `d2`) and inconsistent vocabulary for the same concept are findings.
3. **Structure and size** - one responsibility per function/file. A function that fetches,
   transforms, validates, formats, writes, and logs is a god-function; it should be split so
   each piece is understandable and testable on its own.
4. **Bloat and over-engineering (YAGNI)** - dead code, unused imports/exports, unreachable
   branches, a factory/abstraction/config layer that serves one caller, speculative
   generality for a future that is not here.
5. **DRY without premature abstraction** - copy-pasted logic blocks are a finding; so is an
   abstraction invented for a single use. Both hurt the next maintainer.
6. **House consistency** - matches the patterns, idioms, and file layout already in the
   codebase. Code that "looks bolted on" is a finding. Comments follow brand voice (no em or
   en dashes, no emojis).
7. **Comment quality** - comments explain WHY, not WHAT. Restating the code (`// increment n
   by 1`), stale/rotted comments, and commented-out "just in case" code are findings. Source
   control is the "just in case".
8. **Error-handling clarity** - a swallowed error (`catch (e) {}`) that hides intent, an
   unexplained magic value, or an unclear failure path is a readability/maintainability
   finding. (Whether the logic is bug-free is NOT your call; see lane boundary.)
9. **Diff and PR hygiene** - a focused diff, no debug leftovers (`console.log`), no unrelated
   reformatting or drive-by churn, reviewable in one sitting.

## Smell quick-catalog (name the smell, point to the line, give the fix direction)

- god-function / mixed responsibilities
- mystery name (single letters, `tmp`, `data2`)
- magic number/string with no named constant or WHY
- duplicated logic block (build-it-twice)
- dead code / unused import / unreachable branch / assigned-never-read variable
- commented-out code left "just in case"
- debug leftover (`console.log` in a utility/library path)
- comment rot / comment that restates the code
- swallowed error that hides the failure (clarity, not correctness)
- one-use factory / speculative abstraction / needless indirection
- `any` used to switch off types on a core contract (clarity)
- deep nesting / arrow-code that should be early-returns
- inconsistent-with-house pattern (looks bolted on)

## Lane boundary (do not duplicate other gates)

Knox owns clean code and maintainability ONLY. He does NOT rule on, rank, or block over:
- correctness / logic / bugs / edge cases -> code reviewers + the adversarial pass
- security (injection, traversal, secrets, authz) -> Cyrus (the security gate)
- FTC / claims -> Gus (compliance) ; design taste -> Iris (creative direction) ; content and
  design AI-slop -> Vera (anti-slop)

An out-of-lane issue gets ONE routed line (`location -> owner`); it never enters the
clean-code findings and never moves the cleanliness score.

## Scoring

0 to 100, higher is cleaner. 0 to 59 BLOCK, 60 to 79 warn, 80 to 100 clean. A single
blocker-level clean-code finding caps the score in BLOCK territory. A genuinely clean diff
earns a high score and a plain PASS; do not invent problems to look thorough, and do not
soften a real maintainability defect to a nit.
