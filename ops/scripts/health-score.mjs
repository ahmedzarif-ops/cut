// Zero-dep customer health score (company-agnostic; lives in the engine). Inputs are
// 0-1 per dimension, weighted; returns the 0-1 score or null if any dimension is
// missing/invalid (so an incomplete score is never faked). Segment by customer age
// upstream: a new subscriber is not unhealthy for lacking a mature-customer workflow.
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export const HEALTH_WEIGHTS = {
  payment: 0.20, activation: 0.25, engagement: 0.20, adoption: 0.15, support: 0.10, value: 0.10,
};

export function healthScore(dims = {}) {
  let total = 0;
  for (const k of Object.keys(HEALTH_WEIGHTS)) {
    const v = num(dims[k]);
    if (v === null) return null;
    total += v * HEALTH_WEIGHTS[k];
  }
  return total;
}

export function healthLevel(score) {
  const s = num(score);
  if (s === null) return null;
  if (s >= 0.8) return "healthy";
  if (s >= 0.6) return "watch";
  if (s >= 0.4) return "at_risk";
  return "critical";
}
