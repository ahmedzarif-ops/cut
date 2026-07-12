// Zero-dep opportunity score (company-agnostic). Returns the score, or null when
// any input is missing/invalid or a denominator is 0 - so "not enough to score"
// propagates honestly. Assign the 1-5 inputs per your opportunity-score rubric.
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function opportunityScore({
  evidence, severity, frequency, strategicFit, expectedImpact, reversibility,
  effort, operationalComplexity,
} = {}) {
  const ins = [evidence, severity, frequency, strategicFit, expectedImpact, reversibility, effort, operationalComplexity].map(num);
  if (ins.some((v) => v === null)) return null;
  const [ev, sev, fr, fit, imp, rev, eff, comp] = ins;
  const denom = eff * comp;
  if (denom === 0) return null;
  return (ev * sev * fr * fit * imp * rev) / denom;
}
