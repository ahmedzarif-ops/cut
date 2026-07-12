# Opportunity Score (product opportunities)

Score each input 1-5, then:

```
Opportunity Score = (evidence_strength x severity x frequency x strategic_fit
                     x expected_impact x reversibility)
                    / (effort x operational_complexity)
```

Outcomes: build now / prototype-test first / solve via onboarding or docs / solve via messaging /
route to Customer Success / route to Marketing / monitor / reject. Explain the score narrative and what
data would change it.

Compute this from the eight 1-5 inputs. When any input is missing/invalid or a denominator is 0, the score
is undefined — record "not enough to score" rather than inventing a number, so honest uncertainty
propagates instead of a fake figure. Assign the inputs per this method.

## Instant-win weighting (persistent)

Many buyers judge value by what they feel this week, so instant-gratification wins rank structurally above
delayed or background value. Apply a persistent `win_immediacy` multiplier to the score:
- **Instant win, felt in week one** (a caught call, a chased lead, a booked job, a recovered lead): ×1.5
- **Mixed**, some week-one payoff and the rest compounds: ×1.0
- **Compounding or background** (SEO content, brand, long-horizon nurture, infrastructure that pays off over
  months): ×0.7

This is a tie-break toward speed-to-value, not a license to skip evidence: it never overrides the evidence,
reversibility, or effort inputs, it only re-ranks two otherwise-comparable opportunities toward the one the
customer feels first. Record the immediacy tier and why in the score narrative, and apply the multiplier
in the narrative on top of the base score.
