---
name: handoff-refresh
description: Write this session's handoff log and refresh the lean master handoff so "resume from handoff" reloads fast and nothing is lost between sessions. Use at session end and whenever the context-window hook warns — reach for it even if the word "skill" is never said. Triggers include "prep a handoff", "update the handoff", "wrap up the session", "refresh the handoff", "close out this session", "save state before I clear". Writes ops/handoffs/sessions/S##.md from the template, prepends the session index, and re-stacks the CURRENT START-HERE block plus running queue plus locked decisions in the lean master ops/handoffs/HANDOFF.md. Preserves the always-update-the-master and context-warning rules.
---

# handoff-refresh

Keep session continuity loss-less and cheap. The master handoff is **lean** — it holds only the current
start-here block, the running queue, the locked decisions, and the persistent reference (the standing facts:
hosting, env, routes, brand), plus a session index. Each session's full detail lives in its own
`ops/handoffs/sessions/S##.md`. The canonical master is **in-repo** at `ops/handoffs/HANDOFF.md` so it is
committed and visible in version control. If you also keep a pointer file outside the repo (a bookmark on your
desktop, say), it stays a one-line pointer to the in-repo master — never move the canonical copy out of the repo.

## When to run
- **At session end (always).** Refresh the master, because it is the single file "resume from handoff" reads —
  if it goes stale, the next session starts blind.
- **When the context-window hook warns (around 55%).** Auto-draft so nothing is lost mid-session, then the owner
  can `/clear` and resume cleanly.

## Steps
1. **Write the session log.** Copy `templates/session-handoff.template.md` (bundled with this skill) to
   `ops/handoffs/sessions/S{{N}}.md` and fill every slot (shipped · deployed+verified · open actions ·
   decisions locked · commits · next-step · deferred shortcuts · queue deltas). `{{N}}` is the next session
   number; the numbering scheme is arbitrary but must be monotonic and match the index.
2. **Update the canonical index.** Prepend a one-line entry to `ops/handoffs/sessions/INDEX.md` between the
   `<!-- SESSION-INDEX:START/END -->` markers:
   `- **S{{N}}** — <one-line hook> — [S{{N}}.md](S{{N}}.md)`.
3. **Refresh the lean master** `ops/handoffs/HANDOFF.md`:
   - **Re-read the master immediately before editing it** (read-fresh-before-write). The master is written by
     Claude tools, not by a script with an atomic-write backstop, so a concurrent session may have refreshed it
     since you last read it. Re-reading right before the edit is the mitigation against a last-writer-wins lost
     merge. (If your project has script-written org files, those get an `atomicWriteFileSync`-style helper; this
     single procedural rule covers the tool-written master; per-session `S##.md` files are single-writer and
     need neither.)
   - **Replace** the CURRENT START-HERE block with this session's and **remove** the prior one — do not leave it
     as a `(superseded by …)` block. The master holds exactly **one** START-HERE block at all times; the previous
     block is already preserved in its `S##.md` and the one-line session index, so keeping it here only
     duplicates. This bound matters: unbounded superseded blocks once bloated a master to hundreds of KB and made
     it impossible to read in one pass. Keep the master bounded.
   - Update the RUNNING QUEUE and LOCKED DECISIONS sections.
   - Surface ACTIVE DECISIONS from the CEO Twin ledger (`ops/decisions/ledger.jsonl`, if present): list any
     held/escalated entries (ruling still pending) as an "ACTIVE DECISIONS (do not silently re-litigate; reverse
     only by superseding)" block, and note any recent lane-widening the Twin auto-approved.
   - Keep the PERSISTENT REFERENCE section current (only edit it when a standing fact actually changes).
   - Mirror the new index line into the master's session index.
   - Link to the `S##.md` rather than pasting full session detail into the master, so it stays lean, readable in
     one pass, and cheap to reload on "resume from handoff".
   - Commit it (the master is in-repo, so the refreshed current state is visible in version control).
4. **Guard integrity.** Run your test suite with the runner's own exit code visible (never `cmd | tail`, which
   swallows failures). A handoff-index integrity test should fail if any index entry lacks a file or any file is
   unlisted — wire one if you haven't. Fix any failure before finishing.
5. **Arch-map cadence check (if you maintain one).** If your project keeps an engineering architecture page as a
   single source of truth, it must stay current or it drifts. Track `arch-page last refreshed: S##` in the
   PERSISTENT REFERENCE section. If meaningful codebase changes have landed since, or it has been **≥5 handoff
   sessions** since that refresh, add "refresh the engineering architecture page + regenerate any derived graph
   data" to the RUNNING QUEUE and call it out in the START-HERE block so it is not missed. Update the marker when
   the page is refreshed.

## Rules
- **Loss-less.** Keep every session file and archive — they are the verbatim backstop that makes history
  recoverable. Any full pre-existing snapshot in `_archive/` is permanent; nothing gets deleted.
- **Resume parity.** After refresh, "resume from handoff" against the lean master must still surface the current
  start-here block + full queue + all locked decisions + the persistent reference, with deeper history one click
  away in the index.
- **Bounded master.** Exactly one START-HERE block; superseded blocks live only in their `S##.md` and the index.
