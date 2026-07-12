# The Chronicle — full settled-battle entries

Ground truth only; every entry cites a session id, decision-ledger id, or durable memory file. Append-only: supersede with a dated note, never delete.

> **These are ILLUSTRATIVE example entries** shipped with the starter kit to show the format. They are not decisions your company has made. Delete them and replace with your own real settled battles as they occur — each grounded in a recorded decision, never invented.

## Table of contents

1. [Fabricated testimonials / social proof — an honesty wall](#1-fabricated-testimonials)
2. [A third-party LLM proxy tool — do-not-install](#2-llm-proxy-tool)
3. [Recurring self-inflicted families (Lessons)](#3-recurring-self-inflicted-families)

---

## 1. Fabricated testimonials

*(Example entry — replace with your own.)*

- **Symptom:** The site carried placeholder testimonials (invented names, review counts, star ratings) while a separate honest page admitted the company was brand-new with no real results yet.
- **Root cause of the reversal:** An honest "we're new, no results yet" page on the same site as glowing fabricated 5-star proof sharpens deception / regulatory risk, and that risk rises with paid traffic.
- **Decision:** REMOVE fabricated proof site-wide. Never replace it with new fabricated proof; fall back to founder-led proof or leave the section clean. Real, clearly-labelled testimonials remain the future goal once they exist.
- **Evidence:** *(cite the session id / ledger id / memory file where this was decided.)*
- **Status:** settled. This is an honesty wall — do not re-introduce fabricated proof under any framing.

## 2. LLM proxy tool

*(Example entry — replace with your own.)*

- **Symptom:** A third-party tool was proposed to cut token cost by proxying the connection to the model provider.
- **Root cause of the rejection:** It runs a local man-in-the-middle proxy that sees auth tokens and rewrites messages in flight — an unacceptable security surface — and its savings only apply to metered API spend, which a subscription plan doesn't incur.
- **Decision:** DO-NOT-INSTALL. The useful *lesson* (terse output economy) was adopted as a written rule; the tool itself was rejected. Pattern: security-review any third-party install first, then adopt only the genuinely useful parts.
- **Evidence:** *(cite the security review / decision record.)*
- **Status:** settled per tool.

## 3. Recurring self-inflicted families

*(Example entry — keep this class; it generalizes to any codebase. Cite your own CLAUDE.md `## Lessons`.)*

Both live as CLAUDE.md `## Lessons` hard rules — cite them instead of re-deriving:

- **Scripted patches fail silently:** a find-replace that doesn't match makes no change and raises no error. After ANY scripted patch, grep-verify the OLD string is gone from the WHOLE file(s) and the NEW string is present — never just the section you edited.
- **Half-folds:** "fold onto a shared system" means add the shared include AND delete the page-local duplicate machinery in the same pass; a half-fold leaves two owners per behavior.
- **Status:** settled as process rules; the debugging side lives in `debugging-playbook`.

---

*Maintenance: see "Provenance and maintenance" in SKILL.md. Append new entries here with a TOC line; never delete — supersede with a dated note.*
