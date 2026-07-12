# Outbound Compliance

Cold outreach is the most legally loaded thing the SDR does, and the penalties are real — especially on
calls and texts. This file is the SDR's working guardrail. **The `legal` skill is the authoritative source
on the current law; this file is the operational summary and routes the hard calls to it.** When in doubt,
don't send — ask the `legal` skill. Confirm the primary jurisdiction in `company.yml` → `legal.jurisdiction`
(these rules are written for US-style opt-out email; other jurisdictions differ).

> Two anchors: (1) **compliance is a precondition, not a nicety** — non-compliant outreach gets rejected by
> mailbox providers and can carry per-message legal damages; (2) **verify current law at runtime** via the
> `legal` skill — these rules shift.

## Email — CAN-SPAM (the workable channel for cold B2B)

US commercial email runs on an **opt-out** model (unlike GDPR/CASL's opt-in), which is why cold B2B email
is viable when done right. Every message must:
- Use **truthful From / header info** and a **non-deceptive subject line**.
- Include a **valid physical postal address**.
- Provide a **clear, working opt-out** and **honor it within ~48 hours** (stop the whole sequence on any
  opt-out or reply).
- Not use harvested/illegally-obtained address lists.
Penalties are **per email**, so a sloppy blast is expensive. International recipients raise the bar
(GDPR/CASL can require consent) — flag any non-US sending to the `legal` skill.

## Calls — TCPA + DNC (high-risk; scrub first)

Cold *calling* business prospects implicates the **TCPA** and the **National Do-Not-Call Registry**:
- **Scrub numbers against the DNC registry** before dialing; respect any prior opt-out.
- **No autodialer / prerecorded / artificial-voice** marketing calls without the consent the law requires.
- **Quiet hours** — generally **8am–9pm in the prospect's local time.**
- Keep call outcomes and opt-outs logged. Damages run **$500–$1,500 per violation.**
Route the call plan past the `legal` skill before launching any calling motion.

## Texts — TCPA (don't cold-text)

Marketing **texts** are treated as "calls" under the TCPA and require **prior express written consent
(PEWC)** — which you don't have for a cold prospect. **Do not cold-text prospects.** Texting only enters the
picture **after** a prospect has opted in (e.g., replied/agreed to texts). Per-message damages make cold
texting a fast way to a class action.

## Deliverability rules that are also "compliance" (mailbox-provider level)

Google, Yahoo, and Microsoft now **reject** non-compliant bulk mail (5,000+/day to a provider). Treat these
as mandatory regardless of volume (details in `deliverability.md`):
- **SPF + DKIM + DMARC** authentication with **DMARC alignment**.
- **One-click unsubscribe** (RFC 8058 List-Unsubscribe headers) on marketing mail.
- **Spam complaints < 0.3%** (target ≤0.1%) and **bounces < 2%.**

## The SDR's standing compliance posture

- **Permission- and provider-aware by default** — email opt-out done right; **no cold texts**; calls only
  DNC-scrubbed and TCPA-cleared.
- **Honor opt-outs instantly and permanently** — one reply/opt-out stops the sequence and flags the contact
  in your CRM; never re-add.
- **No deception** — no fake "re: our last conversation" subjects, no spoofed identity, no fabricated
  personalization, no guaranteed-results claims (that's also an FTC/compliance line).
- **Gate before launch** — every campaign passes **compliance-review** (content), the **`legal` skill**
  (channel law), and the **owner** (approval) before the first send, on a warmed separate domain.
- **When unsure, ask the `legal` skill** — especially for calling/texting, multi-state outreach, or
  anything novel. A blocked send is cheaper than a TCPA suit.

---

**How the agent uses this file:** treat it as the pre-flight checklist for any outreach — confirm the
channel's rules are met, route calling/texting and anything ambiguous to the `legal` skill, and **never let
a campaign send without the compliance gate and owner approval.** Authoritative law lives in the `legal`
skill.
