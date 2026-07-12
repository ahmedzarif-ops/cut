---
name: build-patterns
description: Architecture patterns for building your company's agentic system. Use whenever the work touches how the AI system is structured, composed, or gated — deciding whether something should be a skill, a specialist subagent, or an agent team; building or wiring the content/ops engines; adding review-and-approval (shadow-mode) gates; or authoring new skills and agents. Reach for it even if the words skill or agent are never said, as long as the work is about how the system is structured rather than the content it produces. Not for building landing pages, blog posts, or paid copy (use the dedicated content skills) — this is the how-to-structure-it layer.
---

# Build Patterns

How to apply Claude Code's three composability primitives — skills, specialist subagents, and agent teams — to building your company's system. The mapping below is the load-bearing part.

## Mental model

If your product is itself an agent architecture (AI drafts the work, the owner approves every piece before it ships — shadow mode on by default), then a pattern you build to *develop* the company is often the same pattern that should run *inside the product* for the customer. Ask "is this also a product feature?" each time.

| Company concept | Claude Code primitive |
|---|---|
| A repeatable workflow (run the weekly research sweep, draft a blog post, build a social batch) | a skill (`.claude/skills/<name>/SKILL.md`) |
| A focused role (research synthesist, content reviewer) | a specialist subagent (`.claude/agents/<name>.md`) |
| Several roles on one deliverable with a shared task list | an agent team (one lead plus 3 to 5 teammates) |
| Nothing publishes until the owner says yes | a reviewer gate before final output |

## Query the code knowledge graph first (if you have one)

If a code knowledge-graph tool is wired up (e.g. a `graphify`-style indexer with a query/affected/explain/path interface), a graph query is markedly cheaper in tokens than a blind grep/glob — so before exploring code for any build here, query it first, and fall back to grep only when the graph can't answer. When you dispatch a subagent, workflow, or Explore agent for build work, tell it to do the same in its prompt. After adding any code / skill / agent / config, confirm the graph is current (rebuild it if your setup doesn't auto-refresh) before querying. If no graph tool exists yet, that's a worthwhile thing to wire up — code questions recur constantly.

## Decide: skill vs subagent vs team

Pick the lightest tool that fits. Escalate only when the lighter one stops working.
- **Skill:** a single workflow you trigger the same way every time. Default to this.
- **Specialist subagent:** a focused role with its own isolated context and a narrow toolset, so it stays in its lane and heavy subtasks do not crowd the main session. Reach for it for expertise on tap or an independent review.
- **Agent team:** multiple specialists on one deliverable coordinated by a lead. Experimental, token-heavy, Claude Code only, session-scoped. Reach for it only on genuinely multi-perspective full-feature builds. Skip it for single-file work. Cap at 3 to 5 teammates.

## The two-tier pattern with a human gate

The recommended default is a two-tier hierarchy: an orchestrator skill that runs in the main session (where credentials/MCPs are live), a specialist subagent that does isolated synthesis or drafting with no external creds, and an owner gate before anything ships. The shape:

| Orchestrator skill (runs in-session, holds MCP creds) | Specialist subagent (isolated, no MCP) | Gate |
|---|---|---|
| `market-radar` | a research/synthesis analyst subagent | owner approves the action digest |
| `social-engine` | a concept-strategist subagent | concept gate before any generation spend |
| `blog-engine` | a publisher subagent (new) + an updater subagent (refresh) | draft, then owner's yes, then deploy |

The orchestrator runs in the main session because OAuth MCPs (research/SEO/social tools, image-gen, etc.) are only live there. The subagent does isolated work with no MCP. Mirror this whenever you add an engine.

## The content-review gate (the pattern that matches a shadow-mode product)

All agent-produced customer-facing content passes through an independent read-only reviewer subagent before the owner sees it: a skill drafts, the reviewer (`content-compliance-reviewer`) checks advertising claims (FTC / unsubstantiated claims per `company.yml` → `legal.regulated_claims`), any industry-specific licensing language, stat sourcing, brand voice (`company.yml` → `brand.*`), and platform content policy, then returns PASS or FLAG with fixes, then the owner gives the final yes. Content skills auto-dispatch it; a `/compliance-review` invocation runs it on demand against any surface. This gate is shadow mode — it is what makes "AI does the marketing" safe to sell into a regulated or licensed buyer. If your product has its own agent system, build this same gate into it.

## Escalate to a team: usually not yet

A full dev agent team (a strategist lead plus a market analyst, content writer, brand-voice editor, compliance reviewer, and CRO specialist) is a documentable option but usually premature. Most dev work is single-threaded coding plus the content pipeline above, which the lighter skill + subagent + gate pattern already covers. Escalate to a team only when one deliverable genuinely needs three or more simultaneous perspectives and the lighter pattern is demonstrably failing.

## Conventions

- Single responsibility per file. Compose small skills. No mega-skills.
- Author every skill/agent through Anthropic's `skill-creator` guidelines (triggering-focused descriptions, allowed frontmatter only, progressive disclosure); validate before shipping. Never hand-roll.
- YAGNI: build each agent/skill for today's use case only; prefer extending an existing skill over adding a new one.
- Version-control `.claude/` skills and agents.
- Security: subagents run with shell permissions. Grant each only the tools it needs (reviewers are read-only by design).
- Descriptive names and explicit dependencies.
- No company facts hardcoded in any skill/agent — read them from `company.yml` + `kb/`.
- Owner approval is never automated away.

## Buy to learn, then internalize (vendor / tool doctrine)

Open every external tool/vendor/agency/API adoption with one question: **more money or more time?** Short on time → *rent* the expertise to move now; short on money → *build* in-house. But the endpoint is always **owning the capability as agents + SOPs**, never renting forever:

- Time-box the engagement and document the WHY behind each decision the vendor drives.
- Train the in-house owner — for us that's an **agent + a skill**, so the capability compounds and travels.
- Once internalized, downgrade the vendor to insurance-only, then cut it.
- Flag any rent-forever arrangement as an **unpriced liability**. The mechanism for wrapping a vendor/tool so an agent can drive it headlessly is a CLI-integration harness (a GUI/API-to-CLI wrapper pattern) — build one when you need a GUI-only tool to become agent-native.

## Caveats

- Agent Teams is experimental, token-heavy per teammate, Claude Code only, and session-scoped.
- These patterns lower risk. They do not vet quality for you. Human judgment still ships the work.
