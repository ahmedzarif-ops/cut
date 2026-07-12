# SETUP — 10 minutes from unzip to a working agentic company

This kit gives a brand-new project a full agentic operating system: a build loop, review
gates, GTM engines (blog, social, email, paid media, outbound), department analysts, a video
pipeline, and a CEO decision system — all company-agnostic until YOU feed in your facts.

## 1. Drop it in

Copy the contents of this folder into the root of your new repo (or empty folder):

```
your-new-project/
├── CLAUDE.md          ← the operating rules Claude Code loads every session
├── company.yml        ← YOUR company's facts (empty until step 2)
├── SETUP.md           ← this file
├── kb/                ← create this; your research/knowledge files will live here
├── scripts/           ← small zero-dependency helpers some skills call
├── docs/              ← orchestration patterns + reference docs
├── ops/               ← operating runtime: decision classes now; the decisions ledger + CEO-twin briefs land here on first use
└── .claude/
    ├── skills/        ← the skill library
    └── agents/        ← the specialist agents
```

## 2. Run the setup interview

Open Claude Code in the project and say:

> "Run the setup interview from SETUP.md"

Claude will interview you — one question at a time, plain English — to fill `company.yml`:
who you are, what you sell, who you sell to, your voice, your constraints. Answer honestly;
"I don't know yet" is a valid answer (skills that need a missing fact will tell you to
research it first rather than invent it).

**Interview contract (for Claude):** walk the `company.yml` fields in order using one
question at a time with a recommended default where one exists. Never invent an answer the
owner didn't give. Write the file, read it back to the owner in one summary block, and get
an explicit "yes, that's right" before finishing. If `owner.is_technical` is false, keep
all future explanations jargon-free.

## 3. Sanity-check

Say: **"Ground yourself in company.yml and tell me what this company is."**
If Claude's answer matches reality, the kit is live.

## 4. First moves (suggested order)

1. **ICP research first.** Most GTM skills refuse to write copy without a real ICP file.
   Say: "Research my ICP and write kb/icp-research.md" — then set `icp.research_doc`.
2. **Message spine second.** "Build my message spine in kb/message-spine.md" — the one
   canonical story every surface inherits.
3. Then use anything: "run the build loop on X", "write a blog post", "grill me on this
   plan", "run a slop check on this copy".

## Rules the kit assumes (already encoded in CLAUDE.md)

- Facts come from `company.yml` + your `kb/` files — skills never invent customer facts.
- Review gates (compliance, legal, security, anti-slop, clean-code, design) run before
  anything customer-facing ships.
- Nothing deploys to production without the owner's explicit approval.
- When you correct Claude, the lesson gets appended to CLAUDE.md's Lessons section.
