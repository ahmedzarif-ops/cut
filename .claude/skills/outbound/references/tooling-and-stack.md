# Tooling & Stack

The outbound stack the SDR works with, mapped by job — plus the **account-safety guardrails** that keep
LinkedIn automation from getting the account banned. (Tool names below are examples of each lane, not
mandates; pick whatever fills the job.) Tools are force-multipliers, not a license to spam: every one of
them is governed by the same rules in the rest of this skill (relevance over volume, real personalization,
deliverability discipline, and the compliance gate). Pick the tool *and the channel* to the prospect — see
the audience note below.

> **Two separate compliance domains — both gate a send:**
> 1. **The law** — CAN-SPAM (email), TCPA/DNC (calls/texts). Owned by the **`legal` skill** (authoritative).
> 2. **Platform terms** — the **LinkedIn User Agreement** prohibits automation/scraping, and enforcement is
>    real. This is an **account-safety risk the SDR manages operationally** (below). Don't conflate the two;
>    clearing one doesn't clear the other.

## The stack, by layer

**1. Data & targeting (who to reach)**
- **LinkedIn Sales Navigator** — advanced filters, saved lead lists, buyer-intent/alerts, InMail.
  **LinkedIn's own tool, so zero ban risk** — but it does **not** automate sending; it's the targeting/
  research layer.
- **ZoomInfo** — firmographics, verified contacts, intent data; strongest on mid-market/corporate.
- **Apollo.io** — combined contact data + sequencing; decent SMB coverage. **Clay** — enrichment/
  orchestration (waterfall enrichment across providers). Also **Cognism, Lusha, Seamless.AI**.
- **Local-business data** — **Google Maps / local search, Yelp, local databases.** Often *better coverage*
  than corporate-skewed ZoomInfo/Sales Nav for local/offline segments (see audience note).

**2. LinkedIn outreach automation (connection + follow-up)**
- **Dripify** — cloud-based LinkedIn drip campaigns (connection → message → profile visit → follow-up),
  dedicated IP + human-like pacing, configurable daily caps; LinkedIn-only (no email). **Expandi, HeyReach**
  (multi-account/agency), **Waalaxy** (beginner-friendly) are similar cloud tools. **Dux-Soup, Linked
  Helper 2** run as browser extensions.
- **Reality check:** **all third-party LinkedIn automation carries ban risk**, and the cloud-vs-extension
  safety debate is genuinely contested (vendors disagree, often self-servingly). **The behavioral signature
  matters more than the tool** — see guardrails. Sales Navigator is the safe targeting layer; the automation
  layer is where the risk lives.

**3. Email automation (the cold-email engine)**
- **Instantly, Smartlead** — built for cold email at scale: multi-inbox rotation, built-in warmup,
  multi-domain. Use these for cold sequences on the **separate warmed domain** (see `deliverability.md`).
- **lemlist** — multichannel sequences. **Apollo sequences** — fine for integrated outbound.
- **Your CRM's own sequences** (`company.yml` → `integrations.crm`) — better for **warm / 1:1** follow-up
  than cold blasting; the CRM stays the system of record regardless.

**4. Multichannel orchestration**
- **Smartlead, lemlist, La Growth Machine, HeyReach, Reply.io** coordinate LinkedIn + email (+ calls) so
  touches reinforce rather than collide. **The standard motion: LinkedIn opens the door, email drives the
  conversion** — sequence them deliberately, don't hit the same prospect redundantly across tools.

**5. Dialer / calls (lower priority for many audiences)**
- **Aircall, JustCall, Orum** etc. Calls are **DNC/TCPA-heavy** — scrub and clear with the `legal` skill
  first (see `outbound-compliance.md`).

**6. CRM — system of record**
- Your CRM (`company.yml` → `integrations.crm`). Every touch, reply, opt-out, and booked meeting logs here.
  No private shadow lists in a tool's dashboard.

## Match the tool (and channel) to the audience

Some buyers (many local/offline SMB owners) **are not active on LinkedIn**, and ZoomInfo/Sales Nav skew
corporate. So:
- For local/offline segments, **email + local-business data + phone are often the *primary* channels**;
  LinkedIn automation is **best for the larger, more sophisticated buyers** who actually live on the
  platform.
- Don't force a SaaS-style LinkedIn motion onto a segment that isn't there — **pick the channel to the
  prospect.** Use Sales Nav/ZoomInfo where the buyer is reachable on LinkedIn; lean on email + local data +
  calls where they aren't.

## LinkedIn account-safety guardrails (hard rules — the account is irreplaceable)

A LinkedIn ban means losing **every connection and the whole network** — appeals rarely succeed. Treat the
profile as an irreplaceable asset and **never run automation like a volume game.** LinkedIn doesn't publish
official caps; these are practitioner-consensus safe ranges:

- **Connection requests:** start **~20–25/day** per established account (up to ~30–40 only with strong
  acceptance). **New or reactivated accounts: 5–15/day, ramp +5/week over ~4 weeks.** Weekly de-facto
  ceiling ~**100**; **never max it** — if the ceiling is 100/week, send ~70. Consistently hitting the cap is
  itself a flag.
- **Acceptance rate is the #1 trust signal — keep it >25–40%.** Low acceptance triggers throttling and
  restrictions *faster than raw volume*. High acceptance comes from tight targeting + real personalization
  (ties straight to `icp-and-targeting.md` and `messaging-and-sequences.md`).
- **Total daily actions** (views + requests + messages): **80–200**, spread through business hours with
  **random 30–120s delays**; pause nights/weekends. Don't automate 24/7.
- **Personalize every invite (<300 chars), no pitch on the connect.**
- **Warm a new profile** with ~30 days of manual activity first; **mix action types** (likes, comments,
  profile views, posts) — not just outreach.
- **Pending-invite hygiene:** withdraw invitations older than ~3 weeks; keep total pending under ~500.
- **Watch SSI** (linkedin.com/sales/ssi) — higher Social Selling Index unlocks the higher end of the ranges.
- **Don't scrape LinkedIn in ToS-violating ways.** Some data tools have hit scraping-related restrictions;
  pull LinkedIn data through Sales Navigator's own features, not gray-area scrapers.
- **If restricted:** stop all automation immediately, go manual-only for ~2 weeks, then restart at ~50%
  volume and rebuild gradually. Don't try to push through a restriction.

## How the agent uses this file

Choose the **data tool** (Sales Nav / ZoomInfo / Apollo / local data) and the **automation tool** (Dripify
et al. for LinkedIn; Instantly/Smartlead for cold email) that fit the prospect and channel; run LinkedIn
within the **account-safety guardrails** above; coordinate channels so LinkedIn opens and email converts;
log everything in your CRM; and remember the two compliance domains — **the `legal` skill owns the law,
account-safety owns the platform terms, and both must clear before anything sends.**
