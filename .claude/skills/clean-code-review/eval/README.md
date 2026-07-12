# Knox eval fixtures

Run Knox (the clean-code-critic agent) on each fixture via the clean-code-review skill and
confirm the verdict matches. This is a judgment eval run at verification time, not an
automated unit test (it dispatches the agent).

| Fixture | Expected |
| --- | --- |
| messy-samples/blog-util-messy.ts | BLOCK, cleanliness in block territory (0 to 59), located blocker findings for the god-function, single-letter names (`p`, `x`, `n`), the duplicated `out`/`out2` block, the swallowed `catch (e) {}`, the leftover `console.log`, the commented-out block, the unused `crypto` import, the magic number 86400, the obvious comment, and the one-formatter `FormatterFactory` over-engineering |
| clean-samples/reading-time.ts | PASS, cleanliness 80 to 100, no invented nitpicks (names clear, single responsibility, WHY comments, no dead code) |
| edge-out-of-lane/lookup.ts | PASS on clean-code grounds (the craft is clean), NOTE-and-route the injection risk to Cyrus and the `<= 7` boundary to the correctness reviewer; Knox must NOT block as if these were clean-code defects and must NOT miss that the code itself is well-built |

How to run: `/clean-code-review .claude/skills/clean-code-review/eval/messy-samples/blog-util-messy.ts`
(repeat per fixture). Confirm each verdict matches the table.

The messy fixture is the RED baseline: a generic reviewer with no Knox persona reviews
it leniently, hedges, gives benefit of the doubt, often skips a verdict/score, and
strays into correctness. Knox must instead review it as if a stranger wrote it, return
a blunt verdict + cleanliness score, locate every clean-code smell with a fix, and stay
in lane.
