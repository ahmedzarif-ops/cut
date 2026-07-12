# References

The Customer Success skill + agent read these directly:
- **Frameworks:** `references/frameworks.md` (health dimensions, activation pattern, churn taxonomy,
  lifecycle playbooks, at-risk triggers, intervention hierarchy) — map its generic signals to your
  product.
- **Health formula:** `ops/scripts/health-score.mjs` (zero-dep, returns null on any missing dimension so a
  partial score is never faked).
- **Customer truth:** `company.yml` -> `icp.research_doc` (run ICP research first if missing; never
  invent customer facts). Product: `company.yml` -> `offer.summary`.
- **Metric definitions:** defer to the revops-finance engine (it owns the metric dictionary).
- **Defers to:** revops-finance (finance), product-voc (product), email-marketing (sends),
  growth-marketing (acquisition).
- **Feeds:** the Chief of Staff cockpit. **The analyst:** `.claude/agents/customer-success.md`.
