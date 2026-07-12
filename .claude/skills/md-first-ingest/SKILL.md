---
name: md-first-ingest
description: Convert any user-provided file (PDF, image, screenshot, docx, xlsx, pptx, csv, rtf, html) into a cached .md file BEFORE reading or analyzing it, so the expensive raw read happens exactly once. Use whenever the owner or anyone on the team uploads, attaches, pastes a path to, or asks an agent to read/summarize/work on a document, spreadsheet, deck, contract, report, photo, or screenshot — even casually ("read this", "what does this PDF say", "here's the file", "use this doc as context"). Also use before dispatching any subagent that would read such a file, and pass the .md path instead of the original. Skip only for source-code files inside the project and for one-glance UI screenshots used purely to point at a visual bug.
---

# MD-First Ingest

Reading a PDF or image burns image-level tokens every single read, in every agent, in every
session. Converting the file to markdown once means every later read — yours, a subagent's, a
future session's — costs a fraction. The cache makes re-uploads of the same file free.

## Workflow

1. Run the helper (it caches by content hash, so re-running is always safe):

   ```bash
   bash .claude/skills/md-first-ingest/scripts/ingest.sh <source-file>
   ```

   From outside the project root, pass the project root as a second argument so the cache
   stays in one place: `ingest.sh <file> /path/to/your/project`

2. Act on the one-word verdict it prints:
   - `CACHED <md>` — an up-to-date conversion already exists. Read the .md; do not open the source.
   - `CONVERTED <md>` — deterministic conversion done (text, docx, xlsx…). Read the .md.
   - `NEEDS_TRANSCRIPTION <md>` — no deterministic converter (PDF, image, pptx…). Read the
     SOURCE once, then write a faithful markdown transcription into the .md file below its
     frontmatter block (keep the frontmatter — the hash is what makes the cache work). Capture
     all substantive content: text verbatim where it matters, tables as markdown tables, and for
     images/charts a thorough description plus any visible text and numbers.

3. From then on, work only from the .md. When dispatching subagents, give them the .md path,
   never the original — a subagent handed the raw PDF silently re-pays the full read cost.

## Conventions

- Cache lives under your knowledge-base directory at `<kb_dir>/ingest/<slug>.md` (kb_dir is set
  in `company.yml`, default `kb/`), with frontmatter recording the source path, its sha256, the
  date, and the converter used. If the source file changes, the hash misses and the helper
  reconverts — never edit the cached .md by hand to "update" a document.
- Transcribe faithfully; do not summarize during ingestion. Summarizing is the task that comes
  after — a lossy cache poisons every future use of the file.
- If a transcription would be enormous (a 100-page PDF), transcribe the parts relevant to the
  task fully and add a `## Not transcribed` section listing what was skipped and where to find
  it, so a future reader knows the cache is partial.
