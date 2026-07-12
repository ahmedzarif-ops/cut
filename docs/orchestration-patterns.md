# Orchestration patterns

The proven multi-agent moves a Claude Code session should reach for. Each one is a shape of
work that beat the naive single-pass approach in practice. Use them by name; combine them.

The through-line: **one agent working alone misses things a second, differently-framed agent
catches.** These patterns manufacture that second frame on purpose — a fresh reviewer, a
skeptic, an outsider, a taste-check — instead of hoping one pass is enough.

---

## 1. Multi-seat review panel

**When:** anything customer-facing, legally exposed, or high-stakes is about to ship.

**How:** dispatch each *relevant* specialist to review the same artifact in parallel — the
compliance seat, the legal seat, the security seat, the anti-slop seat, the design seat,
whichever apply. Each returns findings only (detect and recommend, never rewrite). You fold
the blocking findings first, then the rest, then re-run any seat whose lane you touched.

**The discipline that makes it work:**

- **Only the relevant seats.** Internal tooling doesn't need a brand review. Don't dilute the
  panel — a seat with nothing to say trains you to ignore seats.
- **Findings, not edits.** A reviewer that rewrites owns the change and stops reviewing it.
  Keep review and authorship separate.
- **Anonymized cross-review.** When seats also critique *each other's* findings, strip the
  author label first. A finding should win on merit, not on which seat raised it. The junior
  seat's catch and the senior seat's catch get read the same way.
- **The panel reviews the artifact, not just the plan.** Reviewing a description of the work
  misses what the work actually did. Point every seat at the real output.

---

## 2. Adversarial verify

**When:** before a finding, a claim, or a "this is done" ships — especially if acting on it
is expensive or hard to reverse.

**How:** hand the finding to an independent agent whose *only* job is to refute it. Not to
agree, not to improve it — to try to prove it wrong. Give it the same source material and ask:
"is this actually true? what would make it false? show the counter-case." A finding that
survives a genuine attempt to kill it is one you can act on. A finding that folds under one
skeptic was going to fold in production.

**Why independent:** the agent that produced the finding is invested in it. A separate agent,
told its job is demolition, brings the frame the author can't. Pass it the artifact and the
claim; don't pass it the author's confidence.

**Use it on the big calls, not every line** — it costs a full extra pass. Reserve it for
irreversible ships, load-bearing claims, and anything where being wrong is costly.

---

## 3. The grill interview

**When:** any brainstorm, plan, design, or decision — *before* building. Default-on: open in
this mode without being asked.

**How:** interview the owner (and, in a multi-seat session, have the seats interview each
other) **one dependency-ordered question at a time.** Not a questionnaire — a real interview
where each answer determines the next question. Ask the thing that unblocks the most
downstream decisions first.

**The rules:**

- **One question per turn.** A wall of ten questions gets one skimmed answer. One sharp
  question gets a real one.
- **Dependency order.** Resolve the fork that changes everything downstream before the
  details. Don't ask about button color before you know if there's a button.
- **A starred recommendation on every question.** Never ask "what do you want?" naked. Ask
  "here are the options, ★ I'd pick B because —, but which?" The owner corrects a
  recommendation faster than they generate one from scratch.
- **Look up facts, don't ask them.** Only *decisions* go to the owner. Anything knowable from
  config, the codebase, or research you find yourself.

The grill's output is a plan that already survived its own hardest questions.

---

## 4. Concept-board-first (owner-taste surfaces)

**When:** any surface the owner will personally present or judge on look and feel — a landing
page, a deck, a brand moment, ad creative. Anything where "is this good?" is a taste call,
not a checklist.

**How:** **do not build first.** Produce 2–3 *radically different* styled mocks in one
self-contained board, show them together, let the owner tap one — *then* build the chosen
direction to finish.

**Why:** taste can't be specced forward. Building one direction and asking "good?" wastes a
full build on a guess, and the owner can only react to what's in front of them. Three
divergent options in one glance surface the real preference in seconds. Gate scores
(anti-slop, design polish, accessibility) measure *craft* — they do not substitute for the
owner's pick. A page can score 95 and still be the wrong direction.

Make the options genuinely different, not three shades of one idea, or the board isn't a
choice.

---

## 5. The outsider seat

**When:** anything a stranger will encounter cold — public pages, investor materials, first
touch with a customer, onboarding.

**How:** add a reviewer with **zero project context** — no backstory, no insider vocabulary,
no knowledge of what you meant. Ask: does this land for someone who's never heard of us? What
do they misread? What's confusing that we've gone blind to?

**Why:** the team knows too much. Every builder fills gaps from memory the reader doesn't
have. An acronym reads as obvious to you and as noise to them. The outsider is the only seat
that reliably catches jargon, missing context, and the curse of knowledge — because it
*shares* the reader's ignorance instead of the team's expertise.

---

## 6. One perceptual lane per iteration (creative work)

**When:** iterating on anything with multiple sensory dimensions — video (visuals + voice +
music + pacing), a page (layout + copy + motion), audio (script + read + mix).

**How:** change **one perceptual lane per loop.** Fix the visuals, ship a proof, get a read
on it. *Then*, separately, touch the voice. Never re-cut the visuals and re-voice the
narration in the same iteration.

**Why:** if you change two lanes at once and the result got worse, you can't tell which
change did it — and you'll often throw out a good change to undo a bad one. Worse: the owner's
last approved version in each lane is your baseline. Regenerating an *already-approved* take as
a side effect of fixing something else can wreck it, and metric gains (words-per-minute,
pauses, scores) do **not** validate a creative performance — only the owner's eye and ear do.
Keep the approved lane frozen; move one thing; prove it; then move the next.

---

## 7. Verify the real thing (rendered / consumed / linked)

**When:** always, before calling anything shipped. This is the failure family that passes
every machine check and still breaks for the human.

The gates verify the *artifact*. They don't verify the **wiring**. Three specific checks:

- **Verify the rendered output, not the asset.** Load the actual page in a real browser and
  look at it. A file whose bytes are correct and whose assets each return 200 can still render
  as a broken, unstyled mess because of a path, a slash, or a missing config rewrite. "The
  file is right" ≠ "the page is right."
- **Verify the consumed input, not the produced output.** When a pipeline has several
  generations of an asset on disk, confirm *which one the consuming stage actually reads* —
  by duration, hash, or content — not just that some file rendered cleanly. You can render a
  perfect output from a stale input and never know until someone notices it's the old version.
- **Verify the linked destination, not the link text.** After any "these are separate things"
  ruling, open every link and confirm what the destination *actually contains*. A button
  labeled right can point to the wrong place; a panel reviews the page and never clicks
  through. Separated materials are standalone by default.

And the quiet one: **never read a pass off a truncated pipe.** `command | tail` returns
tail's exit code, so a real failure rides through as "green." Run verification with its own
exit code visible, or read the runner's own summary line — not a truncated tail of it.

---

## Composing them

A typical high-stakes ship chains several:

1. **Grill** the plan until it survives its own questions.
2. For a taste surface, **concept-board-first** → owner taps a direction → build.
3. **Multi-seat panel** reviews the built artifact; fold blocking findings.
4. **Adversarial verify** the load-bearing claims and any irreversible step.
5. **Outsider seat** on anything a stranger meets cold.
6. **Verify the real thing** — rendered, consumed, linked — in a real browser.
7. Owner-gated deploy.

Reach for the pattern that manufactures the frame you're missing. When in doubt, the cheapest
insurance is a second, differently-framed pass.
