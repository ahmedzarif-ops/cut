# Measurement and Optimization

Track downstream business outcomes, not only opens and clicks. The strategist instances this into
a run-specific measurement plan; the canonical metric set + experimentation rules live here.

## Metrics by stage

### Newsletter and content
- New-subscriber conversion; welcome-flow completion.
- Click rate and click-to-open used cautiously (not opens alone).
- Content-topic engagement; free-thing starts/completions FROM email.
- Subscriber-to-customer conversion; unsubscribes, complaints, inactive-segment size.
- Conversion by segment.

### Free thing and entry offer
- Diagnostic/free completion rate; results-to-entry-offer conversion.
- Revenue per recipient; time to purchase.
- Conversion by weak factor and segment.
- Entry-offer purchase-to-start and start-to-completion; time-to-first-action.
- Completion-to-core-offer upgrade; refund and support burden.

### Core offer and consultation
- Product-interest-to-subscription conversion; checkout recovery.
- Activation and time-to-first-value; feature adoption.
- First-month and three-month retention; churn/cancellation reasons.
- CAC, payback, LTV, revenue per recipient.
- Consultation booking, show, qualification, and close rates.

### Deliverability
- Delivery rate; hard/soft bounce rate; complaint rate.
- Inbox placement where measurable; sender reputation where available.
- Unsubscribe rate; re-permission rate.

## Experimentation rules

Every test must contain: business question, segment, lifecycle stage, hypothesis, control,
treatment, a SINGLE variable, primary metric, guardrail metric, sample/duration considerations,
decision rule, and the next action.

Do NOT declare a winner based on tiny samples, open rate alone, clicks without downstream value,
or without reviewing unsubscribes, complaints, lead quality, and customer conversion.

When volume is low (the likely case early), use qualitative signals: replies, surveys,
founder-call notes, interviews, support tickets, activation blockers, cancellation reasons, and
conversion-path review. A handful of real replies often beats a statistically meaningless A/B.

## Dashboard spec (what the hub reports)

Per run, the command-center hub shows: the lifecycle map, the programs in this run, the
segmentation, the measurement plan (the metrics above scoped to the run), the 90-day roadmap +
ranked first-20, and a pointer to the sequences. Keep platform-reported numbers and the neutral
source (your analytics / the ESP analytics) side by side; never take a single platform's number
as truth.
