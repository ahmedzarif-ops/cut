// Zero-dep finance calcs for RevOps (company-agnostic). Pure functions; return
// null when any input is missing or invalid, so "no data" propagates honestly
// instead of fabricating a number. Treat these as the canonical formula
// definitions your metric dictionary references.
const num = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);

export function contributionMargin({ revenue, directCosts } = {}) {
  const r = num(revenue), d = num(directCosts);
  if (r === null || d === null) return null;
  return r - d;
}

export function cac({ spend, newCustomers } = {}) {
  const s = num(spend), n = num(newCustomers);
  if (s === null || n === null || n === 0) return null;
  return s / n;
}

export function cacPayback({ cac, monthlyContributionMargin } = {}) {
  const c = num(cac), m = num(monthlyContributionMargin);
  if (c === null || m === null || m === 0) return null;
  return c / m;
}

export function churnRate({ churned, startCount } = {}) {
  const c = num(churned), s = num(startCount);
  if (c === null || s === null || s === 0) return null;
  return c / s;
}

export function retention({ churned, startCount } = {}) {
  const cr = churnRate({ churned, startCount });
  return cr === null ? null : 1 - cr;
}

export function ltv({ arpu, grossMarginRate, monthlyChurnRate } = {}) {
  const a = num(arpu), g = num(grossMarginRate), m = num(monthlyChurnRate);
  if (a === null || g === null || m === null || m === 0) return null;
  return (a * g) / m;
}

// ---- Forward / plan primitives. These compute PROJECTIONS, which callers must
// label as such. Prices/benchmarks are passed in, never hardcoded, so nothing
// rots.

// SaaS Magic Number = current-period Net New ARR / prior-period S&M spend.
export function magicNumber({ netNewArr, priorSmSpend } = {}) {
  const a = num(netNewArr), s = num(priorSmSpend);
  if (a === null || s === null || s === 0) return null;
  return a / s;
}

// Rule of 40 = revenue growth % + profit margin % (pass both as raw numbers).
export function ruleOf40({ growthPct, marginPct } = {}) {
  const g = num(growthPct), m = num(marginPct);
  if (g === null || m === null) return null;
  return g + m;
}

// Burn Multiple = Net Burn / Net New ARR (lower is better; a growth-efficiency lens).
export function burnMultiple({ netBurn, netNewArr } = {}) {
  const b = num(netBurn), a = num(netNewArr);
  if (b === null || a === null || a === 0) return null;
  return b / a;
}

// Break-even customers = Fixed Costs / contribution-margin-per-customer.
export function breakEvenCustomers({ fixedCosts, contributionMarginPerCustomer } = {}) {
  const f = num(fixedCosts), c = num(contributionMarginPerCustomer);
  if (f === null || c === null || c === 0) return null;
  return f / c;
}

// Runway (months) = cash on hand / monthly net burn. null when burn <= 0 (no
// finite runway: a cash-positive month is "not applicable", not a big number).
export function runwayMonths({ cashOnHand, monthlyNetBurn } = {}) {
  const cash = num(cashOnHand), burn = num(monthlyNetBurn);
  if (cash === null || burn === null || burn <= 0) return null;
  return cash / burn;
}

// Per-unit token COGS = input$ + output$. Millions of tokens x price-per-MTok,
// split because LLM input/output prices differ. The caller supplies the current
// real prices so nothing hardcodes a drifting number.
export function tokenCost({ inputMTok, outputMTok, inputPrice, outputPrice } = {}) {
  const inTok = num(inputMTok), outTok = num(outputMTok);
  const inPrice = num(inputPrice), outPrice = num(outputPrice);
  if (inTok === null || outTok === null || inPrice === null || outPrice === null) return null;
  return inTok * inPrice + outTok * outPrice;
}

// Gross margin RATE = (revenue - cogs) / revenue. 1.0 max; negative when cogs >
// revenue. For per-unit token margin: revenue = unit price, cogs = tokenCost
// (+ other direct).
export function grossMargin({ revenue, cogs } = {}) {
  const r = num(revenue), c = num(cogs);
  if (r === null || c === null || r === 0) return null;
  return (r - c) / r;
}
