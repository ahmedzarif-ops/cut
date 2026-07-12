# Outbound Sequence Template

A multi-touch, multi-channel sequence for reaching your ICP's decision-makers — built **value-first** (lead
with your lowest-friction offer and its most tangible win, not a pitch), **personalized for real** (no fake
"loved your post" lines), and **compliance-gated** before it ever sends. Your buyer is busy, skeptical of
slick marketers, and responds to concrete, specific, no-BS messages. Keep it short, lead with a relevant
observation, and make the ask tiny.

> **Before any send:** compliance-review checks the copy (claims/disclosures), the `legal` skill confirms
> the channel rules (CAN-SPAM for email; TCPA/DNC for calls/texts — see `references/outbound-compliance.md`),
> it goes out on a **warmed, separate sending domain**, and the owner approves the campaign. Reply rate is
> the KPI — not opens (Apple inflates those).

## Personalization tokens
`{first_name}` · `{company}` · `{segment}` · `{city}` · `{observation}` (a real, specific signal — e.g.
"your site doesn't show up for '{segment} {city}' on Google," "you've got 11 reviews vs competitors at
200+," "no online booking on your site"). The `{observation}` is the heart of it — pull it from real
research (the `market-radar` skill's radar, a quick site/Maps check), never fabricate it. The offer and CTA
come from `company.yml` → `offer.summary` / `offer.booking_link`.

---

## Step 1 — Email (Day 1)
**Subject options (short, specific, no spammy caps/punctuation):**
- `quick thought on {company}'s {city} leads`
- `{first_name} — {segment} in {city}`

> Hi {first_name} — I help {segment} owners stop losing business they already worked to earn, and I noticed
> {observation}.
>
> We built a free 2-minute diagnostic that shows exactly where {company} is leaking opportunity — the fast,
> tangible gaps first, plus the slower-burn stuff like showing up online. No call required — you just get
> the results.
>
> Want me to send the link?
>
> [Name], [Company]
> [physical mailing address] · [one-click unsubscribe]

*(CAN-SPAM: real From name/address, truthful subject, physical postal address, working opt-out.)*

## Step 2 — LinkedIn connect (Day 2–3, optional)
Personalized connection note (no pitch):
> {first_name}, I help {segment} owners around {city} get found and booked online — came across {company}
> and wanted to connect.

## Step 3 — Email follow-up (Day 4)
> Hi {first_name} — following up. The diagnostic is genuinely just 2 minutes and shows where your {city}
> {segment} opportunities are slipping (most owners are surprised by #1). Happy to send it over — yes?
>
> [Name] · [address] · [unsubscribe]

## Step 4 — Call (Day 5–7, only if number is not on the DNC registry and TCPA-cleared)
Short, value-first, reference the prior touches:
> "Hi {first_name}, this is [Name] — I emailed about a quick diagnostic for {company}. I won't take your
> time; I noticed {observation} and thought it was worth a heads-up. Want me to email you the 2-minute
> breakdown?"

*(Calls implicate DNC/TCPA — scrub against the registry and confirm with the `legal` skill before dialing.
Do NOT cold-text without the consent the law requires.)*

## Step 5 — Email breakup (Day 10)
> {first_name} — I'll close this out so I'm not cluttering your inbox. If getting more {city} {segment}
> results ever moves up the list, the free diagnostic is here: [link]. All the best — [Name].
>
> [address] · [unsubscribe]

---

## Rules baked into this template
- **Value before ask** — the offer is your lowest-friction value-first offer (`offer.summary`), not "book a
  30-min call." Frame it around the **fastest, most tangible win** your offer delivers, with the slower-burn
  work as background rather than the lead. Keep it to diagnostic / process language, never a results claim
  (see the proof ladder in `references/messaging-and-sequences.md`).
- **Real personalization only** — `{observation}` must be true and specific; fabricated flattery kills trust
  and is the opposite of the brand.
- **Short** — buyers skim on a phone between tasks. 3–5 sentences max.
- **Easy out, always** — every email has a working one-click unsubscribe + physical address; opt-outs
  honored within 48 hours (sequence stops immediately on any reply or opt-out).
- **No manipulation** — no fake scarcity, no false "re: our conversation" subjects, no guarantees of results
  (that's also a legal / FTC line).
- **Hand off, don't oversell** — the goal is to start a conversation and book the diagnostic/discovery, then
  hand off with context. Don't promise things the close can't deliver.
