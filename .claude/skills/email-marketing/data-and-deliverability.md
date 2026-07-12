# Data, Personalization, Automation, and Deliverability

The platform-neutral data model and the rules for sustainable, permission-based sending. The
engine OUTPUTS the schema + the flow logic; a human wires the ESP (`company.yml` →
`integrations.esp`, e.g. HubSpot, Customer.io, Klaviyo, ActiveCampaign, Mailchimp, Resend). If a
transactional provider already powers the product, the MARKETING ESP is still the owner's choice.

## Contact-property and event schema (platform-neutral)

Recommended fields:
- Email, first name, company/business name
- Segment, primary interest, city / region, company size
- Lead source, newsletter topic interest
- Free-thing start, free-thing completion, diagnostic score, primary weak factor
- Entry-offer purchase, entry-offer progress
- Core-offer page view, subscription, activation milestones
- Consultation booked, consultation outcome
- Current tools, existing CRM
- Marketing maturity, engagement score
- Frequency preference
- Consent source/date, unsubscribe, suppression status, customer success/risk status

Events (the triggers flows listen for): newsletter_subscribed, content_subscribed,
free_thing_started, free_thing_completed, entry_offer_viewed, entry_offer_checkout_started,
entry_offer_purchased, entry_offer_step_completed, core_offer_viewed,
core_offer_checkout_started, core_offer_subscribed, core_offer_feature_activated,
consultation_booked, consultation_attended, review_left, referral_made, unsubscribed.

The schema is platform-neutral; map these field/event names to the chosen ESP's properties.

## Automation standards

For every flow, define: entry trigger, eligibility, exclusions, suppression, exit/re-entry, wait
times, branch conditions, required data, fallback logic (what to send if a personalization field
is missing), CTA, global frequency cap interaction, sales/founder handoff conditions, and the
measurement events it fires. A flow that cannot define its exit and its frequency-cap interaction
is not ready to ship.

## Consent, deliverability, and compliance

Require:
- Documented consent where applicable; accurate sender identity; a required business address.
- A working, one-click unsubscribe for bulk promotional sending; functional unsubscribe
  processing; a preference center where practical.
- No purchased or scraped lists. No deceptive headers, sender names, subjects, or reply cues.
- SPF, DKIM, and DMARC authentication; bounce/complaint/engagement monitoring;
  sender-reputation protection.
- Separation of transactional and marketing streams where practical.
- Current Gmail / Yahoo / mailbox-provider requirements, including one-click unsubscribe for bulk
  promotional sending when applicable.
- A privacy and data-handling review before using sensitive data (see the `legal` skill and
  `company.yml` → `legal.*`).

Do NOT treat open rate as a reliable standalone metric (privacy protections distort it).

Never recommend purchased lists, scraped outreach masquerading as consented marketing, hidden
unsubscribe methods, deceptive urgency, fake testimonials, fabricated case studies, unsupported
rankings/revenue claims, or manipulative opt-out language.
