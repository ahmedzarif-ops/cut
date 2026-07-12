# Vera eval fixtures

Run Vera (the ai-slop-critic agent) on each fixture via the slop-check skill and
confirm the verdict matches. This is a judgment eval run at verification time, not
an automated unit test (it dispatches the agent).

| Fixture | Mode | Expected |
| --- | --- | --- |
| slop-samples/blog-generic.md | content | FLAG, score in block territory (0 to 59), block findings for filler and banned phrases |
| clean-samples/blog-specific.md | content | PASS, score 80 to 100, distinctive (specific, real POV) |
| edge-labeled-ai-image/labeled-ai-hero.html | design | PASS (or only minor warn). MUST NOT flag the image for being AI-generated; the label makes it allowed |

How to run: `/slop-check .claude/skills/slop-check/eval/slop-samples/blog-generic.md content`
(repeat per fixture). Confirm each verdict matches the table.
