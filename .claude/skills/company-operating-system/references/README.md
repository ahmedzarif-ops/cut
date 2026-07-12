# References

This skill reads the canonical operating-system artifacts directly (no duplication):
- Company facts: `company.yml` (name, owner, offer, ICP, brand voice) - the ground for every run
- Org map + hierarchy: `ops/agent-org.md`
- Decision rights (owner-only list): `ops/decision-rights.yml`
- Agent registry: `ops/agent-registry.yml` (or the `.claude/agents/` files themselves)
- Operating cadence: `ops/operating-calendar.yml`
- Output templates: `templates/` in this skill dir
- Scoring rubric: `ops/scripts/priority-score.mjs`

The synthesist agent is `.claude/agents/chief-of-staff.md` (read-only; persona Casey). If your kit
does not yet have it, create a read-only chief-of-staff agent that returns the labelled markdown
sections this skill consumes.
