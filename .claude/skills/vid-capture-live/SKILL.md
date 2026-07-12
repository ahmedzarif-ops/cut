---
name: vid-capture-live
description: Record a REAL interactive Claude Code (`claude`) session as hands-off, redaction-clean course footage - capture with asciinema, gate the cast text for secrets BEFORE any pixel is rendered, replay it with agg, then frame it in your brand chrome for the lesson. Use whenever a video needs live agentic-terminal footage of an actual Claude Code session - "capture a live claude session", "record me using Claude Code", "film the agent working", "live terminal footage", "record the real TUI", "capture the coding session for the course". Records into a scrubbed sandbox, hard-fails on any secret/PII/pre-reveal-identity match in the cast, and upserts a capture manifest the assembler gates on. Part of the video pipeline conducted by the video-editor agent. Not for synthetic curated-cast terminals (use vid-render-terminal), and not for browser or web-app footage (use vid-capture-browser).
---

# vid-capture-live

> Requires a project-local video toolkit (a `video-toolkit/` package you supply — e.g. a
> Remotion/ffmpeg pipeline exposing these scripts). This skill documents the craft; wire the
> commands to your own toolkit's equivalents.
> Also requires `asciinema` (record) and `agg` (cast→mp4 replay) on PATH.

Real interactive Claude Code footage, hands-off and redaction-clean by construction. Where
`vid-render-terminal` renders a hand-curated cast (synthetic, one command at a time), this
skill captures an ACTUAL `claude` session — the live Ink/React TUI, real diffs, real
spinners — as an asciinema `.cast`, then frames it in your brand's light/chrome system
(company.yml → brand.visual_notes) for the course.

The deciding property is **redaction enforceability**. A `.cast` is a JSON log of every byte
written to the pty, so grepping its text is an authoritative, deterministic gate that fires
BEFORE a single pixel is rasterized — far stronger than frame OCR on a screen-recording.

## When to use
A video needs footage of a real Claude Code session. Triggers: "capture a live claude session",
"record the agent working", "film the real TUI", "live terminal footage for the course".

## When NOT to use
- Synthetic / hand-curated command output → `vid-render-terminal`.
- Live website / web-app / dashboard footage → `vid-capture-browser`.
- Captions/subtitles → `vid-captions`.

## Two-layer safety (belt AND suspenders)
1. **Belt — the sandbox.** Record only inside a scrubbed capture sandbox directory OUTSIDE
   all your live repos (e.g. `~/capture-sandbox/`): fake `.env` values (`sk-DEMO...`), a
   neutral git identity (NOT any real name your course withholds pre-reveal), a clean
   `~/demo $` prompt, do-not-disturb on, large mono font (~36px). The content never contains
   a real secret.
2. **Suspenders — the cast text-grep.** The capture script runs an `assertCastClean` pass over
   the raw cast bytes; a block-tier hit HARD-FAILS and the session is never stamped clean.
   Block-tier patterns: any secret/PII, any internal slug, any identity your course withholds
   pre-reveal (e.g. the owner's real name — company.yml → owner.name), any banned brand token
   (company.yml → brand.banned_phrases), home/absolute paths, and local secrets files (e.g.
   `*.local.yml`). Values are NEVER logged — only pattern names. Keep the register in your
   video toolkit (e.g. `video-toolkit/scripts/lib/capture-redaction.mjs`, extending a shared
   `redaction-patterns.mjs`); wire the block-tier list from company.yml → brand.banned_phrases
   plus your own secret/PII patterns — never invent brand facts, read them from config.

## How to run
Run against your project-local video toolkit (from your repo root, with a `video-toolkit/` package present):
```bash
# 1) Record a real `claude` session into the sandbox, then gate + stamp the manifest.
#    Run your curated session in the launched shell; exit to stop recording.
node video-toolkit/scripts/capture-session.mjs --rec --session setup-ch1 \
     --manifest projects/<proj>/captures.json

#    (or ingest an already-recorded cast:)
node video-toolkit/scripts/capture-session.mjs --cast sessions/2026-07-10-setup.cast \
     --session setup-ch1 --manifest projects/<proj>/captures.json

# 2) Frame a clip from a CLEAN session: agg replay -> raw/<clip>.mp4 ->
#    LiveTerminal composition frame -> framed/<clip>.mp4, and upsert the manifest clip.
node video-toolkit/scripts/render-live-terminal.mjs --manifest projects/<proj>/captures.json \
     --clip live-first-file --session setup-ch1 \
     --framing read --chip "STEP 2 OF 5 -- INSTALL CLAUDE CODE" --in 12.4 --out 24.9
```

## Framing (hard-cut, one per clip)
`--framing wide|read|point` picks a STATIC framing — never an animated zoom. `wide` shows the
whole window (≤3s establishing), `read` (default) is a gentle ~80% crop, `point` magnifies a
single band with an accent ring and dims the rest. Framing switches are SEPARATE cuts in the
assembler cutlist, so each `framed/<clip>.mp4` is concat-copy friendly.

## Guarantees
- **Fail-closed render** — the render script REFUSES to render unless the clip's session is
  stamped `castRedaction.status: "clean"` AND the on-disk cast still hashes to the stamped
  sha256 (no TOCTOU). It re-runs the authoritative text-grep over the exact bytes before agg runs.
- **Manifest is the eligibility gate** — a clip is INELIGIBLE for the lesson cutlist until its
  manifest entry carries `redaction.status: "clean"`; `validateCutlist` blocks any capture-lane
  ref that doesn't (`unredacted-capture`). "Frame-by-frame, per clip" becomes a machine
  invariant, not a checklist promise.
- **Non-destructive** — casts under the sandbox, `raw/` + `framed/` under `projects/<proj>/`; the
  retained `raw/` lets you re-frame without re-capturing.
- Design/motion contract: `LiveTerminal` composition (dark terminal on your brand's light field);
  Iris (creative-director) gates the framing.
