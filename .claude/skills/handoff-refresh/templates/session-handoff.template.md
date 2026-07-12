# S{{N}} — session handoff

> Date: {{DATE}}. One log per session. The lean master (`ops/handoffs/HANDOFF.md`) keeps only the CURRENT
> block + queue + locked decisions + persistent reference; this file is the durable per-session record.

## Shipped
- {{what was built/changed, one bullet each}}

## Deployed + verified
- {{deployment id(s) + the deploy-and-verify PASS/FAIL summary, or "no deploy this session"}}

## Open actions (owner)
- {{the human-side actions left, e.g. push origin, set an env var}}

## Decisions locked (do not relitigate)
- {{decisions made this session}}

## Commits
- {{short hash + subject, or a count + range}}

## Next step / resume point
- {{exactly where the next session picks up}}

## Deferred shortcuts
<!-- Shortcuts KNOWINGLY taken this session (skipped test, hardcoded value, TODO left in code)
     so "later" never silently becomes "never". "None" is a valid entry and the default expectation. -->
- {{None, or each shortcut + why + when it must be paid back}}

## Queue deltas
- {{items added to / removed from the running backlog}}
