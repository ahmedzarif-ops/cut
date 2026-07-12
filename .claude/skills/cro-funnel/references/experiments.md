# Experimentation Rules

A structured testing discipline. The hard rule: when traffic is low, do NOT call low-volume results
conclusive.

## Every test must define

- Page or funnel stage
- Audience
- Traffic source
- Hypothesis ("If we [change], then [primary metric] will [direction] because [reason].")
- Controlled variable (change ONE thing)
- Primary conversion metric
- Secondary metric
- Guardrail metric (what must not get worse)
- Decision rule (what result ships the change, what reverts it)
- Minimum sample considerations
- Notes on seasonality and buyer urgency
- Outcome documentation (logged in `learnings.md`)

## The low-volume rule (critical until traffic scales)

Where volume is too low for a valid A/B test (the usual case until paid traffic scales), do NOT
declare a winner from a handful of conversions. Instead prescribe QUALITATIVE methods:

- Usability testing (watch a few real buyers use the page)
- Surveys / a one-question exit poll
- Sales-call and consult review (what objections come up)
- Session recordings (where they drop)
- Customer interviews

Use these to form strong hypotheses, then validate with an A/B test only once traffic supports it. A
change backed by clear qualitative evidence plus sound reasoning can ship without a stat-sig test;
just label it a hypothesis, not a proven win.

## Trustworthy experimentation (Kohavi / Tang / Xu)

When you do run an A/B test: pre-register the hypothesis and decision rule, watch the guardrail
metric, beware peeking and false positives on small samples, and prefer one clear change per test so
the result is interpretable.
