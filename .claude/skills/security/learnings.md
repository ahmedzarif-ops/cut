# Learnings — security (Cyrus)

> Self-improvement memory for this skill + its agent. The SKILL reads this at the START of every run
> (Ground) and appends at the END (Capture). Proposed changes to canonical files (a control note, a playbook,
> the threat model) go under "Proposed refinements" for HUMAN REVIEW; never silently edit a canonical file.

## Run log (newest first)
| Date | What ran | What worked | Change next time |
| --- | --- | --- | --- |
| — | (seed) skill installed: 7 reference playbooks + LLM red-team checklist + threat-model + review templates | — | First live use: run Workflow A on a real diff to calibrate severity + the deploy-block bar for your stack |

## Open gaps / what to improve
- On the first real review, produce the project's security backlog (a repo `SECURITY.md` and/or a
  `security-backlog.md` under `kb_dir`) if one does not exist yet — the playbooks assume a living backlog to
  map findings onto.
- References are written against a typical modern web stack (host + database-with-RLS + payment processor +
  LLM provider). Confirm the actual stack and re-ground the file paths + control names on the first review.

## What works (durable patterns)
- (seed) Defensive-only + read-only + risk-ranked + proportionate, exactly like the legal (Lex) and
  compliance (Gus) gates — the advisory-gate shape fits the owner-gated-deploy model.

## Proposed refinements — HUMAN REVIEW before applying
- (none pending)
