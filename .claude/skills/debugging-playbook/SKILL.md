---
name: debugging-playbook
description: Symptom-to-cause triage playbook for this company's recurring, time-costing failure modes. Use whenever something breaks or behaves unexpectedly — a failing test run or drift guard, a product build error, "Cannot find module './NNNN.js'" from a dev server, a scripted find-replace that "worked" but the page didn't change, a preview URL returning 302, an agent run failing with an auth/API error, strict-tsc failures in generated type files, or double-firing animations after a refactor. Reach for it BEFORE proposing fixes, even if the user just says "it's broken", "the test fails", "the page still shows the old style", or "the deploy check failed". Not for gate/approval process (change-control), settled historical post-mortems (failure-archaeology), or design/architecture decisions (build-patterns).
---

# Debugging Playbook

Triage runbook for this company's known failure modes. Each trap below has cost real
session time at least once; the discriminating experiments turn a vague symptom into
a confirmed cause in one or two commands. Run the experiment before proposing a fix —
the whole point of this playbook is that the obvious diagnosis was wrong the first time.

This is a living file. It ships seeded with the stack-agnostic traps and the common
Next.js/Vercel-on-a-product-app traps; **add a new trap every time a failure burns a
session** (one story + one discriminating experiment per trap). Some traps below assume
a particular stack (Next.js product app, Vercel deploys, Claude-driven agent runs) — they
only apply if your setup uses that piece; delete the ones that don't fit and add yours.

## Step 0 — locate before you grep

For any "where is X / what calls X / how does Y work" question, query a code knowledge
graph first if you have one wired up (it is materially cheaper than grepping the whole
tree). A knowledge-graph CLI (e.g. `graphify`) typically exposes:

```bash
graphify query "<question>" --budget 2000
graphify affected "<symbol>"   # reverse impact of a change
graphify explain "<node>"
```

Keep the graph fresh (git hooks / a Stop hook that rebuilds it). Blind grep is the
fallback, not the default. If you have no graph tool, `rg -n` / `rg -l` scoped to the
relevant directory beats a recursive `find`/`tree` dump.

## Symptom → triage table

| Symptom | Likely cause | Discriminating experiment | Fix |
| --- | --- | --- | --- |
| Page/file "patched" but old styling/behavior still visible | Scripted find-replace silently missed occurrences (non-match = no error) | `grep -c "OLD_STRING" <file>` — any hit means the patch was partial | Re-patch every occurrence; grep-verify the whole file (see Trap 1) |
| Dev server: `Error: Cannot find module './NNNN.js'` | A production build ran while the dev server was serving — chunk manifests are now stale | Did a build just run in this repo? Then this is it, not a code bug | Kill and restart the dev server (delete the build/cache dir if it persists) |
| Product build / strict tsc fails inside a generated types file (e.g. `.next/types/.../route.ts`) | A route/handler file exports a non-handler symbol (helper, const, type) that the framework's generated type check rejects | Open the named route file; look for any `export` that isn't a request handler or route config | Move the extra export to a lib file; route files export handlers only (see Trap 4) |
| Animation/scroll behavior fires twice, or feels doubled/janky after a "fold onto shared system" refactor | Half-fold: the shared include was added but the page-local duplicate machinery was never deleted — two owners per behavior | `grep -n "IntersectionObserver\|addEventListener('scroll'" <file>` and count owners vs the shared include | Delete the page-local duplicate in the same pass as the include (see Trap 2) |
| Agent runs die with an auth/API error (e.g. `AI_APICallError`) when using subscription/OAuth auth | A subscription/CLI-login OAuth token cannot authorize programmatic model-API calls — an auth-path limit, not a transient error | Same call with a metered API key succeeds → auth path, not code | Use a metered API key for programmatic agent runs; don't debug the subscription path (see Trap 5) |
| Preview/demo URL returns 302 (curl or smoke check "fails") | Host access-protection on preview deployments (e.g. Vercel SSO) — expected, NOT a failure | `curl -sI <url> \| head -5` → 302 to an auth/SSO endpoint = protected preview | Verify via an authenticated browser or the production URL; when handing a preview to the owner, include login credentials (standing rule) |
| Test run fails on a file you didn't touch | A drift guard tripped: tests that pin real repo data/config shapes break when unrelated data/config edits land | Run the failing test file in isolation and read the assert message — it names the drifted value | Decide: the CODE drifted (fix code) or the WORLD legitimately changed (update the guard). Never delete the guard to go green |
| Config warnings on ship | Company config drifted from its schema | Run your config validator (ship bar = 0 warnings) | Fix the named config file |

## The traps, with stories

### Trap 1 — scripted patches fail silently

`sed`/find-replace on a non-matching string exits 0 and changes nothing. A remap that
fixed a `<style>` block but missed identical refs inside body `style=""` attributes reads
as "done" — the section you checked looked right; the rest of the page didn't. An
adversarial diff review is often what catches the half-wired remainder.

After ANY scripted patch, verify the whole file(s), not the section you edited:

```bash
grep -rn "OLD_STRING" <files>   # must return nothing
grep -c "NEW_STRING" <files>    # must match the expected count
```

### Trap 2 — half-folds leave two owners per behavior

"Fold this page onto the shared system" means add the include AND delete the page-local
duplicate in the same pass. A fold that added a shared reveal/animation system but left the
old observer + an unthrottled scroll handler alive kept everything "working" — just twice.
Discriminating experiment: grep the folded file for observers/listeners the shared system
already provides; each behavior must have exactly one owner.

### Trap 3 — stale dev-server chunks after a build

Running a production build while the dev server is up can corrupt the dev server's chunk
resolution: requests start failing with `Cannot find module './1234.js'`. It looks like a
broken import; it's a stale process. Restart the dev server first (delete the build/cache
dir if needed) before reading a single line of code.

### Trap 4 — route files are handler-only

Some frameworks (e.g. Next.js) generate strict type checks that require route/handler files
to export only request handlers and route config. Exporting a shared helper from a route
file compiles fine in the editor but fails the production build. The error points at the
generated types file, not your route — trace it back to the route it names.

### Trap 5 — subscription/OAuth auth vs the model API

A subscription or CLI-login OAuth token can authenticate the CLI but cannot authorize
programmatic model-API calls from your own code. If you see an auth/API error on a
subscription-auth path for agent runs, that is an auth-path limit, not a bug to chase —
switch to a metered API key. Record the finding once so the next session doesn't
re-investigate it.

### Trap 6 — a protected-preview 302 is not an outage

Access-protected preview deployments (e.g. Vercel SSO) 302 every unauthenticated request,
including curl smoke checks. Confirm with the redirect target before declaring a deploy
broken. Real production smoke checks live in the `deploy-and-verify` skill.

## Test battery anatomy

- Your test runner (e.g. `npm test`) should run every test file and exit non-zero if any
  file fails. Read the runner's own summary line — never report "tests green" off a piped
  `cmd | tail` (tail exits 0 and swallows a real failure). Use `set -o pipefail`, or capture
  to a file and check `$?`, or assert the pass-count line.
- Many tests are **drift guards**: they pin real data shapes (pricing, access, config, brand
  tokens, ledger schemas). A failure usually means something drifted, not that the test is
  flaky. Read the assert message before touching anything.
- Ship bar: test run green + config validator at 0 warnings + a clean production build.

Run one file in isolation using whatever single-file invocation your runner supports (e.g.
`node --import ./tests/register.mjs tests/<name>-test.mts`), then read the assert message.

## When NOT to use this skill

- Approval/gate/process questions (who signs off, which gate blocks) → `change-control`.
- "Why did we decide X" / settled post-mortem history → `failure-archaeology`.
- Design/architecture decisions and invariants → `build-patterns`.
- Generic debugging discipline (hypothesis loops) → a systematic hypothesis-and-test debugging pass;
  this skill supplies the repo-specific priors to feed it.

## Provenance and maintenance

- Confirm the commands exist for your stack before relying on them: check your `package.json`
  test script, your config-validator and deploy-verify script paths, and your graph tool's
  `--help`.
- Sources for new traps: the `## Lessons` list in `CLAUDE.md` and your session handoff logs.
- Add a new trap the moment a Lessons line lands; keep one story + one discriminating
  experiment per trap, and delete traps whose stack you don't run.
