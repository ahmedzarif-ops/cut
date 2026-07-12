# The Automation ROI Time-Study

One honest gap most agent-run companies have is a hard number: nobody has yet measured what running the
company on the agent org actually produces versus paying humans to do the same work. This file makes that
measurement **repeatable and reproducible** so any run lands the same way and the resulting dollars-saved
figure is defensible. **Data owns the benchmark.** It is an internal time-study, not a customer artifact:
every hour traces to a logged run and every wage to a cited source, and the honest-intervals rule from the
core principles applies to the output.

## What it produces

A single, defensible claim: **hours saved times loaded salary equals dollars saved per quarter and per
year.** Reported as an interval (conservative, expected, best case), never a single hero figure. Provable
within roughly 30 days of the first run. Any customer-facing version of the number routes through the
`compliance-review` gate (Gus) before it is published.

## Baseline assumptions (define once, cite the source)

- **Roles priced:** the humans you'd otherwise hire to do this work, for example a content writer / SEO
  specialist, an email / lifecycle marketer, a paid-media strategist and copywriter, and a market/
  competitive researcher. List the exact roles the run covers; do not price a role no task exercises.
- **Salary baseline:** use a **loaded** cost (base wage plus the employer overhead multiplier), not the
  bare salary. Pull each wage from a **named public source** (for example BLS, Glassdoor, or Payscale) for
  your market and record the figure, the source, and the pull date. Never estimate a wage from memory.
- **Human baseline hours:** the time a competent human takes for the same deliverable, sourced honestly.
  Prefer a timed human run where feasible; otherwise use a cited industry benchmark, clearly labeled as
  sourced not measured. State which it is per task.
- **Scope boundary:** every task is timed end-to-end **up to the human-in-the-loop deploy gate.** The agent
  org's work stops where a human approval or a code deploy begins, matching how the company actually runs
  (top-of-funnel agent-run; the critical calls stay human).

## Task set (the real work, timed end-to-end)

Time the agent org on real, representative deliverables, each to the deploy gate:
- a **blog post** (research to draft to on-brand, gated),
- an **email nurture plan** (a full lifecycle sequence),
- **a full quarter of paid copy across channels** (paid social / search / etc.),
- **market research** (ICP / competitive),
- **SEO content** (a ranking-targeted piece or cluster),
- **the whole growth plan** (the end-to-end strategy).

Keep the task set fixed between runs so results are comparable. If a task is added or dropped, note it and
do not compare across the change without re-baselining.

## Measurement protocol (so runs reproduce)

1. **Pre-register the run:** the task set, the roles priced, the wage sources, and the human-baseline
   method, before timing anything.
2. **Time the agent org** on each task, wall-clock from kickoff to the deploy gate, and **log every run**
   (task, start, end, agent hours) to your workspace so the number is auditable and re-runnable.
3. **Establish the human baseline** per task (timed or cited, labeled).
4. **Compute hours saved** = human baseline hours minus agent hours, per task, then summed.
5. **Convert to dollars** = hours saved times the loaded hourly cost of the matching role.
6. **Project** to a quarter and a year using a stated task cadence (how often the company does each task);
   state the cadence assumption explicitly.
7. **Report intervals**, not a point: a conservative, expected, and best case built from honest low/high
   bounds on hours and wages. Call out the biggest source of uncertainty.
8. **Rerun on a cadence** (re-time as the agents improve) and keep the prior runs so the trend is visible.

## Integrity rules (inherited, non-negotiable)

- Never fabricate a time or a wage. No task without a logged run; no wage without a cited source and date.
- Prediction is not causation: this measures effort saved, not revenue caused. Do not dress it up as a
  revenue or results claim.
- Decision-support only: the number informs marketing/proof; the owner and Gus decide what gets published.

---

**How the agent uses this file:** pre-register the run, time the fixed task set to the deploy gate against
a cited human baseline, compute hours-saved times loaded salary, report it as an honest interval, log every
run so it reproduces, and route any customer-facing version of the claim through Gus.
