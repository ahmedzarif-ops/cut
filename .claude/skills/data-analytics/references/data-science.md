# Data Science & Modeling

Pragmatic modeling for a small company. At this scale the goal is **simple, interpretable, validated models
that drive a decision** — not sophistication for its own sake. Small data overfits fancy models, and a
model nobody understands doesn't get acted on. Start simple, prove it beats a baseline, be honest about
uncertainty, and remember a prediction is not a cause.

## The realistic surface

- **Lead scoring** — which inbound leads are most likely to convert, so you (and clients) prioritize
  follow-up.
- **Churn / retention prediction** — which subscribers are at risk, using engagement signals as **leading
  indicators** (feeds from the product/engagement metrics in `metrics-layer.md`).
- **LTV modeling** — expected value of a subscriber from churn + margin (wide bands at low volume — say so;
  this is the LTV caveat that shows up on the dashboard).
- **Forecasting** — MRR, cash, and demand, **with any seasonality your business has** (peak seasons, etc.).
  Overlaps **Reva's (RevOps & Finance)** runway forecasting — Reva owns the single cash/runway forecast the
  owner acts on; coordinate so there aren't two conflicting forecasts (you provide the statistical method
  and intervals).
- **Segmentation** — grouping clients/leads by behavior or value to tailor messaging and offers.

## Posture: simple first

A ladder, climbed only as far as data volume and value justify:
1. **Heuristics / rules** — often a well-chosen rule (e.g., "no login in 21 days + support ticket = risk")
   captures most of the value and is instantly actionable.
2. **Interpretable models** — logistic / linear regression, with clear coefficients you can explain.
3. **ML** — only when there's enough data and the lift over (1)–(2) is real and worth the opacity.

**Always baseline.** Does the model beat "predict the average" or a simple rule? If not, it's not worth
shipping. At low volume, prefer (1)–(2); fancy models mostly overfit and mislead.

## Validation honesty

- **Hold out properly** — train/test split or cross-validation; for anything time-based use **out-of-time**
  validation (train on past, test on later) — not random splits that leak the future.
- **Watch overfitting on small data** — impressive training metrics on a few hundred rows usually don't
  generalize. Report test performance, not training performance.
- **No target leakage** — don't feed the model a feature that encodes the outcome.
- **Calibration** — if a lead "scores 0.8," do ~80% actually convert? Probabilities should mean what they
  say.
- **Show uncertainty** — prediction intervals / confidence, not lone point estimates. Low volume = wide
  bands; surface them.

## Causal humility (the line that matters)

A churn model tells you **who** is likely to churn — not **why**, and not **what intervention will help.**
Acting on a prediction is a hypothesis about cause; to know if the intervention (a discount, a check-in)
actually reduces churn, **run an experiment** (see `experimentation.md`). Don't let a predictive model
masquerade as causal evidence.

## Forecasting specifics

Simple before heavy: moving averages, **exponential smoothing**, **seasonal-naive**, or a Prophet-style
decomposition before any deep model. Model the **seasonality** explicitly. Always present **prediction
intervals**, not just a line — a forecast without a band overstates certainty.

## Decisions stay human (shadow mode)

Model outputs are **decision-support**. Don't wire a score directly to an action — no auto-cancel,
auto-discount, or auto-suppression based on a model without human + business judgment. Present the
prediction, its uncertainty, and the recommended action; **the owner decides.** Modeling on lead/customer
data follows data-minimization discipline (consent, no sensitive-data misuse, no PII beyond need). If no
dedicated legal/privacy department exists yet — flag legal questions for the owner
(`company.yml` → `legal.*`).

---

**How the agent uses this file:** reach for the simplest thing that works, **always compare to a baseline,
validate out-of-sample, and report uncertainty.** Never present a prediction as a cause — propose an
experiment to test the intervention. Keep a human in the loop on any action a model output might trigger.
