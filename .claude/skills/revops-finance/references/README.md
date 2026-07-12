# References

The RevOps skill + agent read these directly:
- Metric definitions (owned here): `ops/company/metric_dictionary.yml`
- Canonical formulas: `ops/scripts/revops-calc.mjs` (a zero-dependency pure module you supply in this skill dir;
  keep it paired with a test)
- KPI tree + goals: `ops/company/kpi_tree.yml`, `ops/company/company_goals.yml`
- Prices: your product catalog module (or `company.yml` -> `offer.pricing_notes`)
- Cash inputs (git-ignored): `ops/company/cash.local.yml` (shape in `cash.example.yml`)
- Consumer: the Chief of Staff cockpit (the `company-operating-system` skill) reads the RevOps brief
- The analyst: the `revops-finance-analyst` agent
Data tools (skill, in-session): a billing/payments MCP (read only, e.g. Stripe), your product database
(read, e.g. Supabase/Postgres), manual analytics (e.g. GA4/Search Console). Tools are examples of each lane,
not company facts - swap in whatever you have wired.
