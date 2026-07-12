# Segmentation: Personas and Segment Matrix

Who you target and how the message shifts by buyer and by segment. Ground every audience
pick in your ICP research (`company.yml -> icp.research_doc`) — if it does not exist yet,
run ICP research first; never invent customer facts. This file is the METHOD for building
your persona set and segment matrix, not a filled-in one.

## Split the ICP into demand families first

Most markets split into two demand families. Naming them clarifies channel and message:

- **Urgent / emergency demand** — the buyer needs it now; speed-to-response, local
  search visibility, and being the first to answer win. Pain: opportunities go to
  whoever responds first; overpaying rented channels; invisible in local search.
- **Considered / high-ticket demand** — long cycles; trust, portfolio/proof, reviews,
  and nurture win. Pain: losing on price, referral-dependent pipeline that dries up,
  leads going cold with no nurture, premium work paired with an amateur presence.

Place each of your offers and angles against the right family.

## Build 3-4 personas (one template, cloned)

For each persona give:

- **Name + one-line identity** (segment, size band, team size).
- **Belief / pain** — their starting thought and the real leak, in their own words.
- **Awareness stage** (from `awareness-and-frameworks.md`) — and where they sometimes
  sit instead.
- **Buys when** — the real trigger event.
- **Objections** — the 3-4 real ones (pull from voice-of-customer).
- **Best offer + best channel** — which rung of the ladder and where to reach them.

Also name your **anti-persona** — the buyer you do NOT chase first (lowest urgency,
longest to convince). Address them eventually with trust and proof; skip them for the
first paid pushes.

## Build the segment matrix (one row per segment)

For each meaningful segment in your ICP, capture the columns below. This is what makes
targeting specific instead of generic. Fill every cell from your ICP research and live
research (`research-playbook.md`); label directional figures as Hypothesis until a KB
confirms them.

| Column | What it holds |
|---|---|
| Keyword clusters | The real search terms this segment uses |
| Buyer urgency | High / medium / low, and why |
| Seasonal triggers | Real demand peaks and troughs |
| Typical deal value | Directional; label Hypothesis unless confirmed |
| Top objections | The real 3-4, in the buyer's words |
| Strongest proof type | What proof actually moves this segment |
| Best offer | Which ladder rung to sell |
| Best angle | Which angle(s) from `creative-angles.md` lead |
| CTA | The single primary action |
| Landing page | The destination that message-matches |
| Retargeting message | The follow-up line for engaged non-converters |
| Negatives | Wrong-buyer / DIY / employment exclusions for search |
| Compliance notes | Any regulated-claim rules for this segment (see `company.yml -> legal.regulated_claims`) |

### Compliance-per-segment discipline

Some segments carry claim rules — savings/ROI claims, licensing/safety language,
financing, guarantees. Record the rule in the matrix row and enforce it at the
`compliance-review` gate. When your `legal.regulated_claims` names a rule, no ad in that
segment ships without honoring it. Never make a guaranteed-outcome, guaranteed-ranking,
or unsubstantiated-savings claim in any segment (see `guardrails.md`).
