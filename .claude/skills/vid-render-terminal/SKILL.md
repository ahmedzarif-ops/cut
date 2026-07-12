---
name: vid-render-terminal
description: Turn real command-line output into branded, animated terminal footage for your videos - hands-off, no screen-recording GUI, redaction-clean by construction. Use whenever a video needs a terminal, code, git-log, or test-run shot - "render a terminal", "make terminal footage", "animate this command output", "show npm test running on screen", "git log as video", "code demo clip". Runs a real command (or reads a curated cast JSON) and renders it via Remotion; every step is scanned for secrets and PII before it renders. Part of the video pipeline conducted by the video-editor agent. Not for browser or web-app footage (use vid-capture-browser), not for a live interactive Claude Code session (use vid-capture-live), and not for captions (use vid-captions).
---

# vid-render-terminal

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents. Below, `projects/<proj>/` is that toolkit's
> per-project working area.

Real command output becomes a premium animated terminal clip. This is how a video gets its
hands-off terminal footage: a screen-recording GUI is something an agent can't drive, so
instead the agent runs the REAL command, captures the REAL output, and renders a branded
terminal in Remotion. Curated + redaction-clean by construction — the frame only ever shows a
cast you chose.

## When to use
A video needs a terminal/CLI/git/test/build shot. Triggers: "render a terminal", "animate
this command", "show the tests passing on screen", "git log footage", "code demo".

## When NOT to use
- Live interactive Claude Code / real TUI footage → `vid-capture-live`.
- Live website / web-app / dashboard footage → `vid-capture-browser`.
- Captions/subtitles → `vid-captions`.

## How to run
Run against your project-local video toolkit (from your repo root, with a `video-toolkit/` package present):
```bash
# A) Capture a REAL command live, then render its output:
node video-toolkit/scripts/render-terminal.mjs --capture "git log --oneline -5" \
     --title "zsh" --prompt "~/project \$" \
     --save-cast projects/<proj>/out/cast.json \
     --out projects/<proj>/out/terminal.mp4

# B) Render a hand-curated cast (multi-step, exact control):
node video-toolkit/scripts/render-terminal.mjs --cast projects/<proj>/inputs/terminal-cast.json \
     --out projects/<proj>/out/terminal.mp4
```
Set `--title` and `--prompt` to a neutral shell/path — never a real internal slug, and never
any identity your brand withholds (company.yml → owner.name, brand.banned_phrases).

## Cast shape
`{ title, prompt, theme, typingCps?, steps: [{type:"command"|"output"|"comment", text, prompt?}] }`.
Duration is derived from the cast (your toolkit's timeline helper) — never hand-set.

## Guarantees
- **Redaction guard** — every step's text is scanned (an `assertRedactionClean`-style pass over
  the cast) for API keys, JWTs, session/service tokens, private-key blocks, and emails; it
  HARD-FAILS before rendering rather than leak a secret on screen. Extend the block-tier
  register with any identity your brand withholds pre-reveal (company.yml → owner.name) and any
  banned brand token (company.yml → brand.banned_phrases) — read these from config, never invent
  brand facts. Curate the captured output first. Values are NEVER logged — only pattern names.
- **Non-destructive** — output lands in `projects/<proj>/out/`.
- Design/motion contract: your toolkit's terminal composition, styled to
  company.yml → brand.visual_notes; Iris (creative-director) gates it.
