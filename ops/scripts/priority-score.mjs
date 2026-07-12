// Zero-dep priority score for initiatives/proposals (company-agnostic).
// Score each 1-5 input per your priority-score rubric. Returns null when any
// input is missing/invalid or the denominator is 0 - so "not enough to score"
// stays honest.
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function priorityScore({
  impact, confidence, strategicAlignment, reversibility, effort, timeSensitivity,
} = {}) {
  const ins = [impact, confidence, strategicAlignment, reversibility, effort, timeSensitivity].map(num);
  if (ins.some((v) => v === null)) return null;
  const [imp, conf, align, rev, eff, time] = ins;
  const denom = eff * time;
  if (denom === 0) return null;
  return (imp * conf * align * rev) / denom;
}
