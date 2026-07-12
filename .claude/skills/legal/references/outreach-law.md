# Outreach Law — CAN-SPAM, TCPA, DNC, Sender Rules

> **Not legal advice.** `legal` / `legal-aid` ("Lex") is an AI advisory function, **not a licensed
> attorney**, and using it does **not** create an attorney-client relationship. It surfaces issues, applies
> known frameworks, and flags when to consult a licensed attorney — it does not give binding legal advice.
> Law changes; verify current law before relying on anything here.

The legal backbone for the company's own outbound (the `outbound` / SDR function defers here for channel
law) and for any customer-facing outreach guidance. US-focused. Sources cited inline with the date checked;
these rules shift — re-verify at runtime.

## Email — CAN-SPAM (15 U.S.C. §7701 et seq.; FTC enforced)

US commercial email is an **opt-out** regime (unlike GDPR/CASL opt-in), which is why cold B2B email is
viable when done right. **No B2B exemption** — every commercial message must comply. Each message must:
- **Truthful header / From / Reply-To / routing** info — no deceptive domain or concealed identity.
- **Non-deceptive subject line** that reflects the message.
- **Identify the message as an ad** (clear & conspicuous) where applicable.
- **Valid physical postal address** (street, registered PO box, or CMRA mailbox).
- **Clear, working opt-out**, **honored within ~10 business days** (operationally: honor within ~48h; stop the
  whole sequence on any opt-out or reply).
- Don't use harvested/illegally-obtained lists.

**Penalty: up to $51,744 per non-compliant email** (2025 inflation-adjusted), no cap on total — a sloppy
blast is expensive. International recipients raise the bar (GDPR/CASL can require consent — see
`privacy-and-data.md`).
Source: [FTC, CAN-SPAM Act: A Compliance Guide for Business](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) (verify current at runtime).

## Calls — TCPA + National Do-Not-Call Registry (FCC enforced; private right of action)

- **Scrub against the National DNC Registry** before dialing; honor prior opt-outs / internal DNC.
- **No autodialer / prerecorded / artificial-voice** marketing calls without the consent the TCPA requires.
- **Quiet hours**: generally **8am–9pm in the called party's local time**.
- **Damages: $500–$1,500 per violation** — and the TCPA has a private right of action (class-action magnet).
- **Consent state (note a recent change):** the FCC's **"one-to-one consent" rule was VACATED** by the
  Eleventh Circuit on **Jan 24, 2025** (*Insurance Marketing Coalition v. FCC*). It never took effect;
  **bundled prior express consent remains permissible**, and the prior TCPA consent framework still governs.
  Do **not** treat one-to-one consent as required. Re-verify, as the FCC may revisit.
  Sources: [Eleventh Circuit Vacates TCPA One-to-One Consent Rule (Nat'l Law Review)](https://natlawreview.com/article/eleventh-circuit-vacates-tcpa-one-one-consent-rule-immediately-after-fcc-postpones) · [Perkins Coie analysis](https://perkinscoie.com/insights/update/fccs-one-one-consent-rule-vacated-whats-next-tcpa-compliance) (verify current at runtime).

Route any **calling motion** past Lex/counsel before launch.

## Texts — TCPA (do NOT cold-text)

Marketing **SMS** is treated as a "call" under the TCPA and requires **prior express written consent (PEWC)**
— which you don't have for a cold prospect. **Do not cold-text prospects.** Texting enters only **after** a
prospect opts in. Per-message damages make cold texting a fast route to a class action.

## Sender requirements (Gmail / Yahoo / Microsoft — also a compliance gate)

Mailbox providers **reject** non-compliant bulk mail. Treat as mandatory at any volume (the "bulk" line is
5,000+/day to a provider, which multi-inbox cold programs cross easily):
- **SPF + DKIM + DMARC** (DMARC at least `p=none`) with **DMARC alignment** (visible `From:` aligns with the
  authenticated domain).
- **One-click unsubscribe** (RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post`) on marketing mail,
  **honored within 2 days**.
- **Spam complaint rate < 0.3%** (Postmaster Tools); target **< 0.1%**. **Bounces < 2%.**
Effective Feb 1, 2024 (Google/Yahoo); Microsoft Outlook adopted equivalent requirements in 2025.
Source: [Google Email sender guidelines](https://support.google.com/a/answer/81126) · [dmarcian: Yahoo & Google DMARC required](https://dmarcian.com/yahoo-and-google-dmarc-required/) (verify current at runtime). See the `outbound` skill's deliverability playbook for the operational detail.

## Data sourcing & scraping — the logged-out line

Where the data comes from is its own legal question, separate from the send. Two rules govern any
research or list-building input to outreach:
- **Logged-in / session-cookie scraping of any ToS-bound platform is NO-GO pending counsel.** Using a
  logged-in session, stored cookies, or an account to pull data from a platform breaches its terms and
  raises CFAA / breach-of-contract exposure. Only **logged-out public-data reads + official-API reads**
  clear WITHOUT counsel. (This is the boundary the `web-research` skill enforces in code — logged-out
  public only, social platforms denylisted; social listening stays on a sanctioned, sanctioned-tool path.)
- **Never build an outreach contact list from scraped personal data.** Harvesting names/emails/phones
  from web pages or platforms to seed cold outreach is exactly what CAN-SPAM prohibits (harvested lists,
  §7704(b)) and, for any phone number, feeds TCPA/DNC exposure. Outreach stays **warm-first** (opt-in
  lead-magnet lists), never scrape-to-cold-list. Route any list-sourcing that is not plainly opt-in to counsel.

## Route to counsel when…

- Any **calling or texting** motion (TCPA/DNC is the highest-damage area; PRA + class actions).
- **Non-US / multi-jurisdiction** sending (GDPR/CASL consent — see `privacy-and-data.md`).
- A **complaint, demand letter, or regulator inquiry** about outreach.
- Anything novel (new channel, new consent model, gray-area list sourcing).

---

**How the agent uses this file:** as the channel-law gate for outbound. Confirm the channel's rules are met
(CAN-SPAM for email; TCPA/DNC for calls; no cold texts; sender-auth for deliverability), cite the current
authority + date, and **route calling/texting, multi-state, and anything ambiguous to counsel.** Pair with
**Gus** (content) + the **owner** (approval) before any send.
