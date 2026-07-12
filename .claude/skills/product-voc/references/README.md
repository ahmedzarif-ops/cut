# References

The Product + VOC skill + agent read these directly (`<kb_dir>` = `company.yml` → `kb_dir`, default `kb/`):
- Method: `references/discovery-ost-jtbd.md` (Opportunity Solution Tree + JTBD switch interview)
- Scoring: `references/opportunity-scoring.md` (method + formula)
- Output shapes: `templates/{evidence-card,opportunity-brief,prd-lite}.md`
- Seeded frameworks: `<kb_dir>/product/{segments,jobs-to-be-done,evidence-taxonomy}.yml` — seed as
  hypotheses if they don't exist yet
- Customer truth: `company.yml` → `icp.research_doc` + `<kb_dir>/message-spine.md`
- Defers to: market-radar (market research), revops-finance (economics), customer-success (interventions)
- Feeds: the Chief of Staff cockpit (company-operating-system)
- The analyst: the read-only `product-voc` agent (dispatch if wired up; else run inline)
