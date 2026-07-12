# The Metrics Layer — Your Single Source of Truth

This is **job #1.** Most companies have data flowing from a few pipes — an app DB (e.g. Supabase/Postgres),
a billing provider (e.g. Stripe), ad platforms (via a connector), web analytics (e.g. GA4) — but **no
unified layer** tying them together. Until there is one, every number is re-derived ad hoc, "MRR" means
three different things in three places, and dashboards can't be trusted. Before any analysis, experiment,
or dashboard, the Head of Data builds the metrics layer: **one canonical definition per metric, modeled
once, reconciled to source.**

## The principle: define once, canonically

Every metric gets **one definition** — name, plain-English meaning, exact formula, grain (per what,
over what period), and source of record — captured in your canonical metric dictionary under `kb_dir`
(seed it from `assets/metrics-dictionary.csv`). A metric without a definition doesn't go on a dashboard.
The enemies are **metric drift** (the same name computed differently in different places) and **vanity
metrics** (numbers that look good but tie to no decision). Rule of thumb: *if a metric wouldn't change a
decision, it doesn't belong in the layer.*

## Architecture (modern data stack, small-business sized)

Keep it lightweight — this is a small growth-stage company, not an enterprise. The tools below are
**examples of each lane**; substitute whatever your stack actually uses (`company.yml` → `integrations.*`):

1. **Land** raw data: app events in your **app DB / Postgres**; **billing** revenue (direct or via a
   connector); marketing platforms (paid social/search, CRM, SEO tools) via an **ad-platform connector**;
   **web-analytics** raw events via a **warehouse export** (e.g. the free GA4 → BigQuery export) when you
   need unsampled behavior.
2. **Model** it into clean, documented marts — **views in your DB/warehouse** that join and standardize the
   raw tables. This is where the transformation lives.
3. **Expose** the defined metrics as **named views** (one per canonical metric / metric set), so the
   metrics layer is literally queryable objects, not formulas living in someone's head.
4. **Serve** to consumers: a **live BI tool** reads the modeled views; the **HTML dashboard generator**
   reads computed metric values. (See `dashboards-and-reporting.md`.)

**Warehouse-first, always.** Don't trust any single platform's self-reported numbers in isolation — ad
platforms systematically over-count (each claims credit for the same conversion). Route to the modeled
layer and **reconcile** (platform-reported vs warehouse vs billing vs CRM). The warehouse is the truth;
platforms are inputs.

## Your core metric set (internal-first)

Define these rigorously in the dictionary. Build internal first; the same definitions extend to
client-facing later. The exact funnel stages and price points come from your real offer
(`company.yml` → `offer.*`) — the stages below are the generic shape, not fixed values:

**Acquisition funnel** (top-of-funnel → low-ticket → subscription → high-touch):
- Top-of-funnel entries *started* and *completed* → **completion rate** = completed / started
- **Low-ticket / tripwire purchases** and the **top-of-funnel → tripwire** rate
- **Subscription starts** and the **tripwire → subscription** rate
- **High-touch / services** engagements
- Each step at a defined grain (per period, per source/channel). *At low volume, conversion rates between
  deep steps are noisy — label them directional, not precise.*

**Revenue & retention** (coordinate with **Reva (RevOps & Finance)** — the books are the financial truth;
the data layer must reconcile to them, not invent a second MRR):
- **MRR** = recurring subscription revenue only. **Exclude** one-off / low-ticket and services revenue from
  MRR; track those as separate one-off revenue lines. Decompose MRR into **new / expansion / contraction /
  churned.**
- **ARR**, and one-off revenue tracked separately.
- **Logo churn** (subscribers lost / start-of-period subscribers) vs **revenue churn**; **GRR** and
  **NRR** (NRR < 100% means the base shrinks before any new sales).
- **Cohort retention** curves by signup month.

**Unit economics** (model honestly; flag uncertainty at low volume):
- **CAC** — blended and by channel (acquisition spend / new subscribers)
- **LTV** — modeled from churn + gross margin; **wide confidence band at low volume — say so**
- **LTV : CAC** (healthy > 3) and **CAC payback** (months)

**Product/engagement** — usage signals that act as **leading indicators of churn** (feeds the churn model
in `data-science.md`).

## Discipline that keeps the layer trustworthy

- **Definitions live in the metric dictionary** — name, definition, formula, source, product line,
  cadence, target, owner. Update it when a metric changes; it's the contract.
- **Naming conventions** — consistent, unambiguous metric and field names across views.
- **Freshness/SLAs** — every metric has a known refresh cadence and lag; surface it on dashboards.
- **Reconciliation** — the layer's MRR must equal the billing provider and Reva's books (RevOps & Finance
  is the reconciliation authority); a dashboard number that doesn't reconcile to source is a bug, not a
  metric.
- **Privacy** — lead/customer data in the warehouse follows data-minimization discipline (consent, no
  misuse of sensitive data, no PII beyond need). If there is no dedicated legal/privacy department yet —
  flag legal questions for the owner (`company.yml` → `legal.*`); client-facing claims go through the
  `compliance-review` gate (Gus).

---

**How the agent uses this file:** before analysis/experiments/dashboards, stand up (or extend) the
metrics layer — model the pipes into documented views, define each metric once in the dictionary,
reconcile to source. Never compute a headline metric ad hoc when a canonical definition should exist;
build the definition instead. Every number the agent reports traces to this layer and to a real query —
**no fabricated or hand-waved figures.**
