# Funnel KPI Dashboard Spec

The metrics to track across the funnel, and how to instrument them. Map the generic metrics below to
your own offer ladder and analytics stack.

## Track at minimum

- Entry-step starts (the diagnostic / free step, if any)
- Entry-step completions
- Contact capture rate (at the step where you ask for it)
- Low-tier purchase rate
- Preview-to-purchase conversion
- Low-tier → higher-tier upgrade rate
- Higher-tier checkout starts
- Higher-tier paid conversions
- Consultation bookings (if you offer a consult tier)
- Show rate (for booked calls)
- Qualified consultation rate
- CAC
- Cost per entry-step completion
- Cost per low-tier customer
- Trial-to-paid (if applicable)
- Subscriber retention
- Monthly recurring revenue (MRR), if subscription
- Payback period
- Customer support burden
- Refund rate
- Cancellation rate

## Instrumentation (wire to your own stack)

- Fire `generate_lead` (lead/contact/entry start), `begin_checkout` (cart + subscribe), `purchase` (real, not comped) at the real seams in your analytics (GA4 or equivalent) so the analytics and ad platforms can optimize. If you run a paid-ads pixel, mirror the same three events to it once it is armed.
- Verify your site is indexed/verified in your search console.
- Cost metrics (CAC, cost-per, payback, show rate, qualified rate, refund/cancel) usually are not in web analytics — pull them from your ad platform + payment processor and paste them into a funnel report.

## How to use

- Per campaign, define which 2-3 KPIs are the success metrics up front (e.g. an entry page: completion rate + cost per completion; a subscription page: subscribe rate + downsell take rate).
- A page is not "done converting well" on vanity metrics (clicks, time on page). Judge on the most-wanted action and cost per that action.

## Cold paid-traffic split

Cold paid traffic behaves differently from warm / retargeting traffic, so do not blend the two. For
any cold paid campaign, segment by first-touch (cold vs warm) and track these two rates SEPARATELY
for the cold segment:

- Entry-completion rate (cold): of cold clicks, how many finish the entry/diagnostic step. This is the engagement / friction read.
- Buy rate (cold): of cold clicks, how many actually purchase. This is the money read.

Keeping them separate stops a healthy entry-completion rate from hiding a weak cold buy rate (or the
reverse). Judge cold campaigns on both, not on a single blended number.

Lower-friction cold-entry fallback test: if the cold buy rate lags while the completion rate is fine
(cold visitors engage but do not buy), test a lower-friction cold entry — e.g. lead with a genuine
free step (no price and no contact ask up front, captured at results) or a lighter first ask —
against the current entry. Measure both rates on each arm; the winner is the arm with the higher cold
BUY rate, not the higher completion rate. Honest urgency and the ethics guardrails still apply.
