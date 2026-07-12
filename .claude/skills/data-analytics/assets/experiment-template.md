# Experiment Template

Fill this out **before** running any experiment, then complete the readout after. It enforces the
discipline in `references/experimentation.md`: size it first, pre-register the decision, name the
guardrails, and report uncertainty honestly. If the power check says the test can't finish in a reasonable
window, **don't run it** — pick an alternative (usually a holdout) and note that here instead.

---

## 1. Hypothesis
- **Change:** (what exactly is different in the variant)
- **Expected effect & why:** (e.g., "clearer offer → +X% completion, because…")
- **Surface & traffic:** (which page/sequence; roughly how much weekly volume)

## 2. Metrics
- **Primary metric:** (the one decision metric)
- **Guardrail metrics:** (must NOT degrade — e.g., refunds, churn, lead quality, downstream conversion)
- **Definitions:** (point to your canonical metric dictionary — same canonical definitions)

## 3. Power & sizing (do this FIRST)
- **Baseline rate:**
- **Minimum detectable effect (MDE):** (smallest lift worth shipping)
- **Power / significance:** (default 80% / 95%)
- **Required sample per arm:** (compute with `ops/scripts/experiment-power.mjs`)
- **Estimated duration at current traffic:**
- **Feasible?** (If no → STOP. Alternative chosen: holdout / painted-door / before-after-with-caveats / judgment. Explain.)

## 4. Design
- **Randomization unit:** (visitor / session / lead)
- **Allocation:** (e.g., 50/50)
- **Pre-registered decision rule:** (what result → ship / kill / iterate, decided now)
- **Planned run length:** (pre-committed; cover full weekly cycles; NO peek-and-stop)
- **Method:** (frequentist fixed-horizon / Bayesian / sequential with alpha-spending / CUPED)

## 5. Quality checks (during/after)
- **Sample ratio mismatch (SRM):** (did allocation land as planned? if not, test is broken)
- **Novelty effect watch:** (did early lift fade?)
- **No post-hoc segment hunting:** (analyze the pre-registered metric, not a fishing expedition)

## 6. Readout
- **Result on primary metric:** (effect size **with confidence/credible interval** — not just a point)
- **Guardrails:** (held / degraded — and by how much)
- **Statistically significant?** / **Practically meaningful?** (these are different — state both)
- **Honest conclusion:** (ship / kill / iterate / **inconclusive** — and a null is a legitimate, useful
  result; say so plainly)
- **What we learned & next test:**

---

**Reminder:** an underpowered, peeked-at "win" is noise, not evidence. The value of this template is the
discipline it forces *before* the data comes in. Present results for the owner's decision — the experiment
informs the call; it doesn't make it.
