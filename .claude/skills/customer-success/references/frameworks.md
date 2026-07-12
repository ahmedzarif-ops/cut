# Customer Success frameworks

The customer-success skill + agent read this file directly. It carries the reusable CRAFT (health
dimensions, activation pattern, churn taxonomy, lifecycle playbooks, intervention hierarchy). The
signal names below are GENERIC placeholders — map each one to your own product's real workflows and
outcomes (ground the product specifics in `company.yml` -> `offer.summary`) before first use. Never
invent customer facts; if a signal cannot be measured yet, mark it N/A honestly.

---

## Health score (mirrors `ops/scripts/health-score.mjs`)

Transparent, explainable. Inputs 0-1 per dimension; **segment by customer age before scoring** (a new
subscriber is not unhealthy for lacking a mature-customer workflow).

| Dimension | Weight | Signals (map to your product) | Note |
| --- | --- | --- | --- |
| payment | 0.20 | active / failed_payment / cancellation_pending | hard risk factor |
| activation | 0.25 | setup + first-value milestones | strong early-stage hypothesis |
| engagement | 0.20 | reviews outputs, gives approvals, workflow activity | avoid raw-login dependence |
| adoption | 0.15 | your product's core value-producing actions | |
| support | 0.10 | repeated blockers / unresolved tickets / negative feedback | severity over volume |
| value | 0.10 | survey responses / customer comments / outcome evidence | verified signals only |

- **Levels:** healthy, watch, at_risk, critical, cancelled, reactivated.
- **Bands:** healthy `>=0.8`, watch `0.6-0.8`, at_risk `0.4-0.6`, critical `<0.4`.
- **Age segments:** days_0_7, days_8_30, days_31_60, days_61_90, days_91_plus.
- **Rule:** every status states why + evidence + recommended intervention + owner + what moves it back
  to healthy.

## Activation (per product feature)

Activation = **MEANINGFUL outcomes, not logins**. Milestones are HYPOTHESES until validated against
30/60/90-day retention cohorts — keep them labelled `hypotheses` until a cohort confirms them.

Pattern per product/feature:
- `activated_when`: the list of first meaningful actions that prove the customer got real value.
- `leading_indicators`: earlier, cheaper-to-measure signals that predict activation.
- `setup_milestones` / `first_value_milestones`: for a product with a setup phase, separate "configured"
  from "produced a first real result".
- `operating_rhythm`: e.g. a 30-day rhythm with >=1 recurring core workflow active + evidence of
  reviewing or acting on the outputs.

Example (replace with your product's real milestones): a self-serve tool activates when the user
completes the core action, sees the result, understands the primary problem it surfaced, and takes one
next step; a done-with-you tier activates when an objective is documented, a scoped plan is agreed,
access is provisioned safely, a first deliverable lands, and next steps are accepted.

## Churn taxonomy

Separate **voluntary** reasons from **involuntary** (payment). Per reason capture:
`evidence_needed`, `save_offer_appropriate`, `product_or_onboarding_handoff`, `enters_winback`,
`targeting_or_positioning_change`.

- **Voluntary:** no_perceived_value, no_time_to_implement, product_confusing_or_too_difficult,
  missing_needed_feature, wrong_customer_poor_fit, switched_to_competitor_or_diy, budget_pressure,
  seasonal_slowdown, business_closed_or_paused, trust_or_ai_control_concern, integration_issue,
  support_issue, unknown.
- **Involuntary:** payment_failure — recommend a recovery sequence but hand execution to the
  email-marketing / billing owner; never alter payment methods, retries, or subscriptions yourself.

## Lifecycle playbooks (new subscriber, illustrative)

- **days_0_3** — objective: complete setup + first value. Success: setup done + first meaningful output
  approved. Escalate: if setup incomplete after N days, low-friction nudge; route any email need to the
  email-marketing engine.
- **days_4_14** — objective: activate >=1 core workflow. Success: >=1 workflow enabled with a completed
  meaningful action.
- **days_15_30** — objective: recurring operating rhythm + value perception. Evidence: recurring
  activity approved, knows current priority, blockers resolved.
- **days_31_90** — objective: protect retention + show recurring value. Actions: review adoption,
  surface outcomes, identify missing workflows, route high-fit accounts to a higher tier when
  appropriate, identify advocates ONLY after real verified value.

## At-risk triggers (validate as hypotheses)

incomplete_setup_after_N_days, no_first_approved_output_after_N_days, no_core_workflow_after_N_days,
no_meaningful_activity_for_defined_period, repeated_support_blocker_unresolved_72h,
cancellation_page_visit_or_request, payment_failure, explicit_dissatisfaction,
says_too_busy_or_cannot_see_value, high_support_low_adoption, core_outputs_not_reviewed_in_interval.

**Severity rule:** weight by severity AND customer age; never treat every trigger as equal.

## Intervention hierarchy (least-intrusive first)

1. product_nudge_or_checklist
2. in_context_education
3. targeted_lifecycle_email_request_to_email_marketing
4. customer_success_human_outreach_recommendation
5. product_or_integration_troubleshooting
6. founder_or_strategic_intervention_for_high_value
7. billing_or_payment_recovery_recommendation
8. cancellation_or_winback_logic
