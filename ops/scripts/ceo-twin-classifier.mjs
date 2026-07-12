// CEO Twin door classifier + 3-tier autonomy engine. Zero-dependency, pure.
// Tier C (escalate, never auto-act) is the immovable hard-line set: the
// owner-approval-required decision keys (keep these in parity with your own
// ops/decision-rights list if you keep one). Tier A = auto-do (or a promoted
// type); Tier B = decide-and-hold for async owner approval.
//
// The hard-line list below is a GENERIC STARTER SET. Edit it to match the calls
// that must always stay with the human owner in your company.

// Decisions that always require explicit owner sign-off (never auto-act).
const OWNER_APPROVAL_REQUIRED = [
  "pricing_or_packaging_changes",
  "paid_media_spend_above_threshold",
  "new_paid_channel_launch",
  "vendor_or_contract_commitments",
  "refunds_credits_billing_or_subscription_changes",
  "public_claims_outcomes_or_customer_performance",
  "major_positioning_changes",
  "production_deployment",
  "sensitive_customer_or_financial_data_access",
  "hiring_or_contractor_commitments",
  "policy_changes",
  "new_market_segment_commitments",
  "anything_with_material_cash_legal_or_reputational_risk",
  "acting_on_any_analysis_model_score_or_experiment_result",
  // Additional hard lines: any decision that reaches a live customer, is blocked
  // by a specialist gate, or would go out under the owner's own name/email.
  "touches_live_customer_directly",
  "specialist_gate_blocking",
  "sent_from_owner_name_or_email",
];

export const HARD_LINE_TAGS = [...OWNER_APPROVAL_REQUIRED];

export function typeSignature(d) {
  const tags = [...(d?.tags || [])].sort().join("|");
  return `${tags}::${d?.lane || ""}`;
}

export function isHardLine(d) {
  return (d?.tags || []).some((t) => HARD_LINE_TAGS.includes(t));
}

export function classify(decision, promotedTypes = []) {
  const reasons = [];
  if (isHardLine(decision)) {
    const hit = (decision.tags || []).find((t) => HARD_LINE_TAGS.includes(t));
    reasons.push(`hard-line: ${hit}`);
    return { tier: "C", reasons };
  }
  if (decision.door === "one_way" && decision.magnitude !== "low") {
    reasons.push("one-way door, non-trivial magnitude");
    return { tier: "C", reasons };
  }
  const sig = typeSignature(decision);
  if (promotedTypes.includes(sig) && decision.door === "two_way" && decision.reversible && decision.magnitude !== "high") {
    reasons.push("auto-promoted type (within reversible envelope)");
    return { tier: "A", reasons };
  }
  if (decision.door === "two_way" && decision.reversible && decision.magnitude === "low" && decision.lane) {
    reasons.push("reversible, low-stakes, two-way, in-lane");
    return { tier: "A", reasons };
  }
  reasons.push("medium / not auto-eligible -> hold for async approval");
  return { tier: "B", reasons };
}
