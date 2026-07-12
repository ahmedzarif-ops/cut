# Testing and Measurement

How to test creative without wasting spend, what to measure across the whole funnel, and
how to manage budget, scaling, and fatigue. Optimize toward qualified outcomes, not
vanity metrics (see `guardrails.md`).

## Concept-to-variation hierarchy

Do not test random rewrites. Test down a hierarchy so you learn what actually drives the
result. Tag every test by its level and type.

- Level 1, Market Problem: the core pains your ICP faces (e.g. invisible in search, weak
  proof/reviews, slow response, no follow-up, vendor frustration, inconsistent
  marketing).
- Level 2, Strategic Angle: cost of inaction, comparison, before/after, founder
  insight, customer story, diagnostic, visual audit, proof, myth-busting,
  segment-specific warning.
- Level 3, Hook: the scroll-stopping first line (see the hook bank in
  `creative-angles.md`).
- Level 4, Format: founder talking head, static in-context photo, screen-recorded
  diagnostic, testimonial (only when real), animated scorecard, before/after,
  comparison card, carousel.
- Level 5, Execution Variation: first three seconds, opening sentence, thumbnail, CTA,
  testimonial selection, lead image, caption length, proof order.

Test types to label each test: concept test, hook test, format test, offer test,
audience test, landing-page test, CTA test. Test the highest level that is still unknown
first; do not run execution-variation tests on a concept you have not validated.

## Experimentation rules

Every test must document:

- Business question
- Audience
- Platform
- Funnel stage
- Hypothesis
- Variable being tested
- Control
- Treatment
- Primary success metric
- Guardrail metric
- Sample-size and duration considerations
- Seasonality notes
- Creative fatigue risk
- Decision rule
- Next learning action

Do not:
- Call a winner based only on CTR.
- Call a winner from tiny volume.
- Optimize for cheap leads that do not buy.
- Assume platform attribution equals incremental value.
- Use fake urgency or misleading claims.
- Test too many variables at once when learning is the priority.

When volume is low, use qualitative review instead of forcing a false read: comments,
sales-call notes, diagnostic answers, survey data, heatmaps, session recordings,
landing-page behavior, founder interviews, customer-support conversations, and
cancellation reasons.

### Test-hypothesis template (clone per test)

```
- Business question:
- Audience:
- Platform:
- Funnel stage:
- Hypothesis:
- Variable:
- Control:
- Treatment:
- Primary success metric:
- Guardrail metric:
- Sample size / duration:
- Seasonality:
- Fatigue risk:
- Decision rule:
- Next learning action:
```

## Funnel measurement framework

Track the full acquisition and revenue funnel, not just ad-platform numbers.

- Top funnel: reach, impressions, frequency, video-view quality, thumb-stop rate, CTR,
  landing-page view rate, cost per landing-page view, engaged-visit rate.
- Lead / diagnostic stage: diagnostic start rate, diagnostic completion rate, cost per
  completed diagnostic, email-capture rate, quality-score distribution, segment mix,
  geographic fit, self-reported pain, diagnostic-to-entry-offer rate.
- Monetization stage: entry-offer purchase rate, cost per entry purchase, entry AOV,
  entry refund rate, entry-to-recurring upgrade rate, recurring checkout-start rate,
  recurring paid conversion, cost per subscriber, CAC, first-month and three-month
  retention, churn, gross margin, payback period, LTV/CAC, consultation booking rate,
  consultation show rate, consultation-to-close rate, revenue by segment and channel.
- Quality and attribution: lead-to-customer rate, qualified-lead rate, cost per
  qualified customer, incrementality where feasible, assisted conversion paths, new vs
  returning visitors, blended CAC, platform-attributed vs CRM-attributed conversion,
  lead-quality feedback from calls, segment-specific conversion rates, recurring-revenue
  cohort performance.

### Instrumentation honesty (be honest in reports)

- Confirm which analytics/pixel is actually live and which events fire before claiming a
  signal. Read the real funnel signals you have; do not imply optimization data you
  cannot yet read.
- If a pixel is BUILT but inert until an env var / ID is set, say so — until then there
  is no platform-side optimization or retargeting data.
- Where there is no live connector for a data source (e.g. Search Console), treat it as
  a paste-an-export, not a live pull.
- Mark any metric you cannot yet measure as "not instrumented yet" in the report rather
  than implying you have it.

## Reporting dashboard spec

A paid-media report should contain, top to bottom: a one-line read (what changed and
what to do), spend and blended CAC, the funnel table (top -> lead -> monetization ->
quality) with the period-over-period delta, the best and worst creative by qualified
outcome, channel splits, the active tests and their decision status, and the next
actions. Keep platform-reported numbers and CRM/analytics numbers side by side so the
gap is visible. No metric without its source and date.

## Measurement honesty rules (apply to any funnel)

### Activation = a VERIFIED WIN, never an opt-in
An "activation" is a verified win the buyer actually achieved (a real product result, a
first checkpoint completed), never a mere email opt-in or a page view. An opt-in is a
lead, not an activation. Count someone as activated only when the product produced a
real observable result for them.

### The reverse-funnel revenue model
Stand up a reverse-funnel model that works backward from the revenue goal:
`required_sales -> opportunities -> activations -> joins -> starts -> viewers ->
impressions`.
- Give each step low / base / high scenarios with editable assumption fields.
- Replace every assumption with real cohort data the moment the pilot produces it.
- NO invented benchmarks — an unmeasured step is labeled "not instrumented yet," never
  filled with a plausible-looking rate.
- Build the skeleton now, populate only from real numbers.

### Packaging A/B judged on downstream value, never CTR alone
Judge any title/thumbnail/creative-package A/B on downstream value (watch-time share +
lesson/step continuation, or lead-to-qualified-outcome), never on CTR alone — a package
that wins CTR but pulls the wrong audience and loses them is a failure.

### Attribution honesty rules
- Keep aggregate platform analytics separate from person-level web/product records — the
  two live in different tables and are never joined by identity.
- Never fake cross-platform identity resolution (do not pretend to stitch a platform
  viewer to a signed-in member).
- Use consistent UTMs, a membership-source question, and self-report for attribution;
  where a touch is unobservable, state the uncertainty explicitly rather than inferring
  it.
- Your data owner owns the event set and the attribution model.

### Stall-recovery taxonomy
When a buyer/learner stalls in a multi-step funnel, classify the failure into ONE class
and map it to ONE smaller restart action + the exact recovery resource. Never send a
vague "come back and finish" message. Build a small taxonomy for your own funnel — e.g.
setup failed -> re-run the one failing step; got the concept but did not attempt -> the
single first action for this step; lost their place -> the resume ritual; time
constraint -> the smallest single next micro-win; missing prerequisite -> the direct
link to it; unclear expected output -> the "here is exactly what you should see"
reference.

## Budget, scaling, cadence, fatigue

- Budget allocation: fund the proven lead engine first, then retargeting, then expansion
  tests. Cap any unproven channel at a small learning budget until it shows a
  cost-per-qualified-outcome it can hold.
- Optimization cadence: review daily for spend/delivery anomalies; make creative and
  budget decisions on a weekly cycle with enough volume; do not knee-jerk on a day.
- Scaling rules: scale the winner by raising budget in steps (not doubling overnight),
  duplicate into new audiences before forcing one ad set to overspend, and watch
  cost-per-qualified-customer, not CPC, as you scale.
- Creative fatigue: watch frequency and a rising cost-per-result on a tiring ad; rotate
  in fresh executions under the winning concept (Level 5) before the whole concept
  decays; keep a backlog of ready variants so you are never out of fresh creative.
