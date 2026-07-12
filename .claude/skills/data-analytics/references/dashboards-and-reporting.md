# Dashboards & Reporting

Dashboards are the **presentation layer of the metrics layer** — so the same rules carry through: no
fabricated numbers, defined metrics, visible freshness and caveats, and decisions left to the owner. This
file covers the craft and the two delivery modes: **a live BI tool** (connector-fed) and **self-contained
HTML** (portable snapshots, via `scripts/build_dashboard.py`).

## Executive-dashboard craft

An owner dashboard answers a few real questions — *are we growing, profitably, and is it sustainable?* —
not "here is every number we have."

- **Lead with decisions, not vanity metrics.** Every tile should inform an action. If a metric wouldn't
  change a decision, cut it.
- **A north star + a few supporting metrics**, grouped (revenue/retention, funnel, unit economics). Few
  metrics that matter beat many that don't. One scannable screen.
- **Show context, not point values** — trend (sparkline), **delta vs prior**, and **progress to target**.
  A number alone ("MRR $8,910") is far less useful than "$8,910, ▲16% vs prior, 74% of target."
- **Direction-aware** — churn going *down* is good; the visual must encode each metric's good direction so
  a bad move never looks like a win. (The HTML generator enforces this; configure your BI tool's
  conditional formatting the same way.)
- **Freshness + caveats visible** — show "as of," the sync lag, and label low-volume metrics
  **directional**. Honesty about uncertainty is part of the design, not a footnote to hide.

## Mode 1 — A live BI tool (connector-fed)

Use a free, browser-based BI tool (e.g. Looker Studio — formerly "Google Data Studio," renamed in 2022;
not to be confused with enterprise "Looker" at ~$3k/mo) for always-current, shareable dashboards.

- **Connectors:** most such tools have native connectors for common warehouses and DBs (GA4, Search
  Console, BigQuery, Sheets, Cloud SQL, MySQL, **PostgreSQL**) — so the tool can hit your app DB directly
  via a Postgres connector (point it at modeled views). For paid-social/CRM and other non-native sources,
  use a **partner connector** (e.g. an ad-platform connector). Community connectors cover any API.
- **Architecture rule:** a BI tool is **not** a transformation or warehouse tool — modeling inside the
  report makes it slow and brittle. **Model upstream** (DB/warehouse views) and use the BI tool purely to
  visualize. This is exactly why the metrics layer comes first.
- **Web-analytics connector caveat:** native web-analytics connectors are often subject to **sampling, row
  limits, and thresholding**; for unsampled accuracy connect to the **warehouse export** instead.
- **Known limits:** many free BI tools have no native alerting; data blending unreliable beyond ~3–4
  sources; often **no row-level security** (every viewer sees the same data); no version control. The
  row-level-security gap matters for client-facing reporting → see below.

## Mode 2 — Self-contained HTML (portable snapshots)

`scripts/build_dashboard.py` turns a metrics JSON into a **single, dependency-free HTML file** (inline CSS
+ inline-SVG sparklines) that opens anywhere, offline, and can be **emailed or archived.** Use it for a
point-in-time owner/board snapshot, a printed/PDF'd monthly, or when you want full design control and no
login or connector. Data is baked in at generation time — feed it **computed values from the metrics
layer.** The generator enforces the integrity rules automatically: shows "as of" + freshness, renders
missing values as "—" (never a fake 0), colors deltas by each metric's good-direction, and footnotes the
sources.

## Choosing a mode

- **Live exploration, always fresh, shareable link** → a live BI tool.
- **Portable, designed, point-in-time, no login, emailable/printable** → HTML.
- **Often both:** the BI tool as the live internal cockpit; the HTML generator for the **monthly emailed
  owner/board snapshot.**

## Internal-first → client-facing extension

Build your **internal** dashboards first (funnel, MRR/retention, unit economics). Then extend the *same
metric definitions* to **client reporting** (the results you deliver for clients). Two notes for
client-facing:
- **Row-level security gap** → in a BI tool without RLS, give each client their **own report or a
  filtered/parameterized link**; you can't safely show one report where each client sees only their row.
  (Or generate a per-client HTML snapshot.)
- **Brand it** (work with the **creative-director**, Iris), and if a client report states performance
  results, route it through the **`compliance-review` gate (Gus)** — **substantiate, no guaranteed-results
  claims.**

## Cadence & automation

Weekly internal review; **monthly owner/board snapshot.** Automate refresh — the BI tool stays live off the
views; regenerate the HTML snapshot on a schedule from the metrics layer. **Reconcile every dashboard to
source** — dashboard MRR must equal the billing provider must equal Reva's books (RevOps & Finance), or
it's a bug.

---

**How the agent uses this file:** pick the mode that fits the need, **always build on the modeled metrics
layer (never hand-keyed numbers), show freshness and caveats, encode good-direction, and reconcile to
source.** Lead with the decisions the owner actually faces — and remember the dashboard supports the
decision; it doesn't make it.
