# CRO & Funnel Build Registry

Append one entry per page build or CRO audit. Keep it short and reusable.

Per entry, record: date, the campaign slug + offer-ladder step, the segment + awareness stage, the
page type/blueprint, the offer + timed-offer config, what converted (the hook, the proof, the CTA
that worked), what to reuse next time, and any compliance/QA notes.

## Template

```
## [YYYY-MM-DD] /go/<slug> - <offer step> - <segment>
- Brief: <segment, geo, awareness stage>
- Blueprint: <A/B/C/D>
- Offer: <price + timed-offer config>
- What worked / what to reuse:
- Compliance + QA notes:
- KPIs to watch:
```

## Reusable-infrastructure notes

When a run builds funnel infrastructure meant to be reused (a shared section library, a timed-offer
engine, a tracking helper), record what was built and how the next campaign composes it, so future
pages assemble faster. Note any dev/verification gotchas (e.g. verify funnel client components
against a production build, not two dev servers at once).

## Log

(empty — append builds here)
