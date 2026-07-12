# Experimentation & CRO

The job here is **trustworthy** experimentation — and the defining constraint at a small company is **low
traffic.** Most pages and sequences won't generate enough volume for a classic fixed-horizon A/B test to
reach significance in a reasonable time. The cardinal sin is calling an underpowered, peeked-at result a
"win." A good Head of Data is honest about what the data can and can't support, and proposes how to decide
anyway.

## Start with the math (before running anything)

Sample size is driven by **baseline rate**, the **minimum detectable effect (MDE)** you care about,
**power** (usually 80%), and **significance** (usually 95%). Run the power calc *first* with
`ops/scripts/experiment-power.mjs`. If the honest answer is "this needs 8,000 conversions per arm and you get
200/month," then **don't run that test** — it can't finish before the page/offer changes underneath it.
This single check prevents most bad experimentation.

Consequences of the low-traffic reality, made into rules:
- **Only test changes big enough to matter and to be detectable.** Headlines, offers, pricing, page
  structure — not button-color tweaks you can never power.
- **Pre-commit the duration and don't peek-and-stop.** Stopping the moment it looks significant inflates
  false positives dramatically. Decide the run length up front and hold to it (cover full weekly cycles).
- **Test higher-traffic surfaces** when possible (top-of-funnel) rather than deep, low-volume steps.

## Methods that help at low volume (not magic)

- **Bayesian A/B testing** — reports "probability B beats A" and expected loss; degrades more gracefully
  and is easier to communicate to an owner than p-values. Still needs data; it doesn't manufacture signal.
- **Sequential testing with proper alpha-spending** — lets you stop early *validly* (unlike naive
  peeking).
- **Variance reduction (CUPED / covariate adjustment)** — uses pre-period data to cut the noise, so you
  need less traffic for the same power. Worth it when you have pre-exposure history.
- **Pooling / longer windows** — accumulate across time when the change is stable.

## When you genuinely can't A/B test

Be honest that these are weaker causally, and say which one you're using and why:
- **Holdout / geo tests** — keep a control group/region unexposed; the most causally credible option at
  small scale (shared with `marketing-measurement.md`).
- **Painted-door / fake-door tests** — measure *demand* for an offer or feature before building it.
- **Before/after** — easy but **confounded** by time, seasonality, and everything else that changed; treat
  as weak evidence and caveat heavily (especially if your business is seasonal).
- **Qualitative + judgment** — sometimes the honest call is "we can't measure this cleanly; here's the
  reasoning and the risk," not a fabricated statistic.

## Design & analysis discipline

- **One hypothesis, stated up front** — what change, expected effect, why.
- **Primary metric + guardrail metrics** — don't celebrate a lift in signups while refunds, churn, or lead
  quality quietly degrade. Name the guardrails before launching.
- **Randomization unit** and assignment defined; check **sample ratio mismatch (SRM)** (a 50/50 split that
  lands 56/44 means the test is broken — don't trust it).
- **Pre-registered decision rule** — what result triggers ship / kill / iterate, decided before seeing
  data.
- **No p-hacking** — no hunting post-hoc segments for a significant slice (multiple comparisons), no
  re-cutting until something passes. Watch **novelty effects** (early lift that fades).
- **Report uncertainty** — confidence/credible intervals, not just a point estimate; distinguish
  **statistically significant** from **practically meaningful**.

The `assets/experiment-template.md` file operationalizes all of this — use it for every test, and record
the pre-registered test in your experiment registry under `kb_dir` (e.g. `kb/experiment-registry.yml`).

---

**How the agent uses this file:** size every experiment before running it; refuse to ship an underpowered
test as a result; pre-register the metric, guardrails, duration, and decision rule; and in the readout,
**report uncertainty honestly and call a null a null.** When the traffic isn't there, say so and propose
the best available alternative (usually a holdout) rather than forcing a noisy A/B test.
