# Agentic Company Operating System — starter kit

A drop-in operating system that turns a fresh Claude Code project into a one-owner agentic
company. You bring the facts about your business; the kit brings the machinery to run it.

## What this is

A complete, company-agnostic operating layer:

- **A build loop** — brainstorm → spec → plan → build → verify → report → handoff, with
  commit-per-task discipline and owner-gated deploys.
- **Six review gates** — compliance, legal, security, anti-slop, clean-code, and design taste.
  Each is a specialist agent that reviews before anything customer-facing ships, detecting and
  recommending, never rewriting.
- **GTM engines** — playbooks for blog/SEO content, organic social, value-first email and
  lifecycle, paid media and conversion copy, and outbound prospecting.
- **Department analysts** — specialist agents for data/measurement, revenue and finance,
  customer success, and market research.
- **A video pipeline** — capture, transcribe, rough-cut, voiceover direction, graphics,
  music, and render, for turning scripts into finished video.
- **A CEO decision system** — a decision twin that classifies each call by reversibility,
  handles the safe ones, and escalates the one-way doors to you with a starred recommendation
  and a logged reasoning trail.

The operating rules live in `CLAUDE.md`, which Claude Code loads every session. The proven
multi-agent patterns are documented in `docs/orchestration-patterns.md`.

## What this is NOT

- **Not a company.** The kit ships with **zero business data** — no customers, no offer, no
  brand, no voice, no numbers. Every skill reads your facts from `company.yml` and your `kb/`
  files, and refuses to invent a fact you haven't given it. Until you run setup, it knows
  nothing about any business.
- **Not a website or app.** It's the *operating layer* that runs the company. What you build
  with it is up to you.
- **Not auto-pilot.** Nothing deploys to production, and nothing customer-facing ships,
  without your explicit approval.

## Install (3 steps)

1. **Drop it in.** Copy the contents of this folder into the root of your new (or empty)
   project.
2. **Run the setup interview.** Open Claude Code in the project and say *"Run the setup
   interview from SETUP.md."* It interviews you one question at a time to fill `company.yml`
   with your facts.
3. **Sanity-check.** Say *"Ground yourself in company.yml and tell me what this company is."*
   If the answer matches reality, the kit is live.

Full walkthrough, the interview contract, and suggested first moves are in **[SETUP.md](SETUP.md)**.

## Where to look

| File | What it is |
| --- | --- |
| `SETUP.md` | Install + first-run guide |
| `CLAUDE.md` | The operating rules Claude loads every session |
| `company.yml` | Your company's facts (empty until setup) |
| `docs/orchestration-patterns.md` | The multi-agent patterns to reach for |
| `.claude/skills/` | The skill library (each description says when it fires) |
| `.claude/agents/` | The specialist agents |
| `kb/` | Your research and knowledge files (you create these) |
