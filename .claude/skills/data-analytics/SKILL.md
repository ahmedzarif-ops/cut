---
name: data-analytics
description: >-
  The data, analytics, experimentation, and data-science toolkit — the Head of Data's kit. Use WHENEVER
  the work involves measuring, modeling, testing, or visualizing the business: building the metrics layer /
  single source of truth across your app DB, billing, ad platforms, and web analytics; defining KPIs (MRR,
  churn, retention, CAC, LTV); marketing measurement and attribution; experiments / A/B tests / CRO with
  honest low-traffic statistics; data-science modeling (lead scoring, churn, LTV, forecasting); and
  executive dashboards for owner decisions (a live BI tool or a self-contained HTML snapshot). Reach for it
  even when casual — 'what's our conversion rate,' 'is this A/B test real,' 'where are our leads coming
  from,' 'build the owner a dashboard,' 'should we trust this number,' 'forecast our MRR' — even if 'skill'
  is never said. It never fabricates numbers, stays honest about low-volume results, keeps prediction
  distinct from causation, and supports rather than makes the owner's decisions.
---
<!-- learning-loop: required -->

## Self-improvement loop (Ground -> Capture -> Propose)
This skill runs a self-improvement loop through `learnings.md` in this skill dir:
- **Ground:** before dispatching the agent, read `learnings.md` (run log, open gaps, what-works) and pass
  it into the agent's context along with its canonical knowledge files and your config.
- **Capture:** after the agent returns, append ONE dated row to the top of the `learnings.md` run-log
  table (what ran, what worked, change next time), read from the agent's "## Learnings" output section.
- **Propose:** never silently edit a canonical playbook. Put proposed canonical-file changes under
  "Proposed refinements - HUMAN REVIEW" in `learnings.md` for the owner to approve.

# Data, Analytics & Experimentation

This skill is the **Head of Data's toolkit**. It owns the whole data function: standing up the metrics
layer, measuring acquisition honestly, running rigorous experiments, building pragmatic models, and
turning all of it into dashboards the owner can act on. The throughline is **integrity** — every number
traces to a real query, statistics are honest, and the dashboard is the presentation layer of a defined,
reconciled metrics layer, not a pile of hand-keyed figures.

## Ground yourself in config first

Every fact this skill needs comes from config, never from invention:
- **Who you sell to** — `company.yml` → `icp.description`, and the full research at `icp.research_doc`
  (a file under `kb_dir`). If the ICP research doc is missing, run ICP research first — never invent
  customer facts to size a funnel or a segment.
- **What you sell** — `company.yml` → `offer.summary`, `offer.pricing_notes`. The funnel stages and price
  points in the metrics layer come from your real offer, not from any example in these files.
- **Data stack** — your app DB, billing provider, ad platforms, and web analytics (e.g. Supabase, Stripe,
  an ad-platform connector, GA4 — these are examples of the lane, not required tools; wire the metrics
  layer to whatever stack you actually run). Deploy/integration targets: `company.yml` → `integrations.*`.
- **Legal / privacy** — `company.yml` → `legal.jurisdiction`, `legal.regulated_claims`. Customer-facing
  performance claims route through the `compliance-review` gate (Gus).

## Run model

This skill runs IN the main session, where it holds the data connectors (app DB, billing, ad platforms,
web analytics) and code execution, builds the metrics layer, runs the dashboard generator, and WRITES
outputs to your project data directory (e.g. under `kb_dir` or a `data/` output folder). For synthesis and
judgment it dispatches the read-only `data-analyst` agent (**Dana**). The canonical company metrics
dictionary is a file under `kb_dir` (e.g. `kb/metric-dictionary.csv`, seeded from `assets/metrics-dictionary.csv`)
— **Dana owns it** (analytics-engineering owner); **Reva (`revops-finance`)** is the financial-reconciliation
authority for the revenue rows and owns the single cash/runway forecast. Pre-revenue: report honest NO
DATA, never fabricate; label any example data EXAMPLE. The owner decides; this skill never wires a
score/test to an irreversible action. Feeds the Chief of Staff (Casey).

**Read first / read as needed:**
- `references/metrics-layer.md` — **job #1**: unify the scattered pipes into a single source of truth and
  define your metrics canonically. *Start here; everything else builds on it.*
- `references/marketing-measurement.md` — web analytics, attribution reality, the privacy/cookie picture,
  and the measurement triangle sized for a small company.
- `references/experimentation.md` — the experimentation/CRO discipline, centered on the low-traffic
  reality and honest statistics.
- `references/data-science.md` — pragmatic modeling: lead scoring, churn, LTV, forecasting — simple-first,
  validated, prediction-isn't-causation.
- `references/dashboards-and-reporting.md` — executive-dashboard craft and the two delivery modes (a live
  BI tool; HTML snapshots).
- `references/automation-roi-benchmark.md` — the repeatable hours-saved-vs-hire time-study (role/salary
  baselines, task set, measurement protocol) that turns hours-saved into a hard dollars-saved proof number.
- `assets/metrics-dictionary.csv` — starter canonical metric definitions (the reusable template).
- `assets/experiment-template.md` — fill out before every experiment.
- `assets/sample-metrics.json` — EXAMPLE input for the dashboard generator.
- `scripts/build_dashboard.py` — turns a metrics JSON into a self-contained HTML executive dashboard.
- `ops/scripts/experiment-power.mjs` — sample-size + can-this-finish math; **size every test first**
  (`node -e` importing `sampleSizePerArm`, `canFinish`).

## Core principles (non-negotiable)

- **Never fabricate a number.** Every metric traces to a real query and a defined source. No hand-keyed,
  estimated, or "roughly" figures presented as data. If a value isn't available, say so — render "—",
  not a fake 0.
- **Single source of truth.** Metrics are defined once (in the dictionary / modeled views) and reconciled
  to source — dashboard MRR == billing provider == Reva's books (RevOps & Finance is the reconciliation
  authority), or it's a bug. No metric without a definition.
- **Statistical honesty, especially at low volume.** Most tests at small scale won't reach significance —
  size them first (`experiment-power.mjs`), don't peek-and-stop, report uncertainty, and call a null a
  null. An underpowered "win" is noise.
- **Prediction is not causation.** A model says *who/what*, not *why* or *what to do about it*. To learn
  if an intervention works, run an experiment. Attribution is correlation, not proof.
- **Paired KPIs at minimum latency.** Never present a quantity metric alone — pair it with a quality guard
  in the same view (reach × qualified-conversation rate, output volume × trial-start rate) so volume can't
  be gamed, and choose the shortest feedback loop (flag any metric whose only signal arrives a quarter
  out). Content/marketing metrics are **source-segmented, never blended** (session-duration + conversion BY
  traffic source). This is how "views for views' sake" is kept out of every department's scorecard.
- **Decision-support, not decision-making (shadow mode).** Surface the numbers, the uncertainty, and the
  recommended action; **the owner decides.** Never wire a model score or a test result straight to an
  irreversible action.
- **Privacy-aware.** Lead/customer data follows data-minimization discipline (consent, no sensitive-data
  misuse, no PII beyond need). If no dedicated legal/privacy department exists yet, flag legal questions
  for the owner (`legal.jurisdiction` / `legal.regulated_claims`); client-facing performance claims go
  through the `compliance-review` gate (Gus).

## Workflow A — Stand up / extend the metrics layer (do this first)

Per `metrics-layer.md`: model the pipes (app DB, billing, ad platforms, web analytics → warehouse) into
documented views; define each metric once in your canonical metric dictionary under `kb_dir` (the template
is `assets/metrics-dictionary.csv`); reconcile to source. Warehouse-first — don't trust platform-reported
numbers in isolation. This precedes analysis, experiments, and dashboards.

## Workflow B — Marketing measurement & attribution

Per `marketing-measurement.md`: instrument the funnel cleanly (UTMs, key events), prefer the warehouse
over platform numbers, treat attribution as **directional** (data-driven attribution needs volume a small
company lacks; modeled/privacy-degraded data isn't precise truth), add **self-reported attribution** and
**offline conversion import** (many buyers convert by phone or in person), and propose a **holdout test**
when a channel decision matters. Don't overstate cookie loss (3p cookies persist in Chrome post-Privacy-
Sandbox) but build first-party.

## Workflow C — Experiments & CRO

Per `experimentation.md` + `assets/experiment-template.md`: **size it first** with
`ops/scripts/experiment-power.mjs` (baseline, MDE, power) — if `canFinish` says it can't finish in the window,
don't run it; pick a holdout/painted-door/judgment alternative instead. Pre-register the primary metric,
guardrails, duration, and decision rule in an experiment registry under `kb_dir` (e.g.
`kb/experiment-registry.yml`). No peeking, no p-hacking, check SRM. In the readout, report effect size
**with intervals**, distinguish significant from meaningful, and state nulls honestly.

## Workflow D — Data-science modeling

Per `data-science.md`: simplest thing that works (heuristic → regression → ML only when justified);
**always beat a baseline**; validate out-of-sample (out-of-time for forecasts); report uncertainty (wide
bands at low volume); keep prediction distinct from causation (test interventions with experiments); keep
a human on any action a score might trigger. Forecasting overlaps Reva — Reva owns the single cash/runway
forecast; you provide the statistical method + intervals.

## Workflow E — Executive dashboards

Per `dashboards-and-reporting.md`: build on the modeled metrics layer (never hand-keyed). Two modes —
**a live BI tool** (native connectors read your warehouse/DB views; ad-platform connectors for paid; model
upstream, visualize only) and **self-contained HTML** via the generator:
```
python3 scripts/build_dashboard.py metrics.json -o dashboard.html
```
Lead with the owner's real decisions; show trend + delta + target; encode each metric's good-direction;
show freshness and caveats; reconcile to source. **Top-line order (customer-facing weekly report and
dashboard):** lead with the concrete instant-value block — the outcome the customer directly feels and
pays for — as the top tile group. Label blog and organic traffic explicitly as a **background /
compounding** metric (real value, just delayed: content → traffic → more leads → revenue → shows on the
dashboard), never the weekly headline. Build internal first, then extend the same definitions to client
reporting (mind row-level-security for per-client views, and route client-facing performance claims
through the `compliance-review` gate (Gus)). Brand the dashboards with the `creative-director` (Iris).

## Workflow F — The Automation ROI time-study

Per `automation-roi-benchmark.md`: a repeatable internal time-study that **Data owns** and reruns to keep
the number honest. First define the role and salary baseline for each task owner (the human you'd
otherwise hire, priced at a loaded cost from a cited public source). Then time the agent org doing real
tasks end-to-end, right up to the **human-in-the-loop deploy gate** (a blog post, an email nurture plan, a
full quarter of paid copy across channels, market research, SEO content, the whole growth plan), and time
or source the human baseline for the same work. Hours saved times loaded salary equals dollars saved per
quarter and per year: a hard proof number. Report it with **honest intervals** (conservative, expected,
best case), never a single hero figure, and never fabricate a time or a wage (every hour traces to a
logged run, every wage to a cited source). Route any customer-facing version of the claim through the
`compliance-review` gate (Gus).

## Reusability

The structure (metrics layer → honest measurement → disciplined experiments → pragmatic models → decision
dashboards) serves any small growth-stage business. Swap the metric definitions and stack specifics from
`company.yml`. Coordinate with **Reva** (`revops-finance` — financial truth, reconciliation, the single
cash forecast), the **creative-director** (Iris — dashboard branding), and **Gus** (`compliance-review` —
client-facing claims). Data-privacy is in-skill discipline until a dedicated legal/privacy department
exists.
