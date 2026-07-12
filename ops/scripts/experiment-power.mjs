// Zero-dep experiment power / sample-size math for the Head of Data experimentation workflow.
// Two-proportion test, normal approximation. "Size it first" — refuse underpowered tests.
// Repo convention: return null on invalid input so "no data" propagates honestly.

// Inverse standard-normal CDF (Acklam's rational approximation; abs error < 1.15e-9).
export function invNorm(p) {
  if (!(p > 0 && p < 1)) return null;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const plow = 0.02425, phigh = 1 - plow;
  let q, r;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Sample size per arm to detect a change from baselineRate by `mde`.
// mdeType "absolute" (default): p2 = p1 + mde. "relative": p2 = p1 * (1 + mde).
export function sampleSizePerArm({ baselineRate, mde, mdeType = "absolute", power = 0.8, alpha = 0.05 } = {}) {
  if (!(baselineRate > 0 && baselineRate < 1)) return null;
  if (!(mde > 0)) return null;
  if (!(power > 0 && power < 1) || !(alpha > 0 && alpha < 1)) return null;
  const p1 = baselineRate;
  const p2 = mdeType === "relative" ? p1 * (1 + mde) : p1 + mde;
  if (!(p2 > 0 && p2 < 1)) return null;
  const zA = invNorm(1 - alpha / 2);
  const zB = invNorm(power);
  if (zA === null || zB === null) return null;
  const pBar = (p1 + p2) / 2;
  const num = zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const n = (num * num) / ((p2 - p1) * (p2 - p1));
  return Math.ceil(n);
}

export function weeksToComplete({ nPerArm, weeklyTrafficPerArm } = {}) {
  if (!(nPerArm > 0) || !(weeklyTrafficPerArm > 0)) return null;
  return Math.ceil(nPerArm / weeklyTrafficPerArm);
}

export function canFinish({ baselineRate, mde, mdeType = "absolute", weeklyTrafficPerArm, maxWeeks, power = 0.8, alpha = 0.05 } = {}) {
  const nPerArm = sampleSizePerArm({ baselineRate, mde, mdeType, power, alpha });
  if (nPerArm === null) return null;
  const weeks = weeksToComplete({ nPerArm, weeklyTrafficPerArm });
  if (weeks === null) return null;
  return { nPerArm, weeks, feasible: weeks <= maxWeeks };
}
