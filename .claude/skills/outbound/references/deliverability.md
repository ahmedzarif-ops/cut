# Deliverability — Protecting the Channel

None of the targeting or copy matters if the email never reaches the inbox. Deliverability is **technical
and unforgiving**: Google, Yahoo, and Microsoft now **reject** non-compliant bulk mail outright (permanent
SMTP rejections, not just spam-foldering), and even perfectly authenticated mail lands in spam 30%+ of the
time because providers weigh **engagement** above authentication once identity is confirmed. So
deliverability is two jobs: clear the **authentication gate**, then earn **engagement**. Verify current
provider rules at runtime — they change.

## Protect the primary domain — send cold from a separate one

**Never run cold outreach from your primary domain** (`company.yml` → `domain`). A reputation hit on the
cold domain would contaminate the domain you use for clients, billing, and real mail. Use a **separate
sending domain** (e.g., a `.co`/`.com` variant or a dedicated subdomain), warmed and isolated. Reputation is
tracked at the subdomain level, so isolation actually works.

## The authentication gate (mandatory, regardless of volume)

The "bulk sender" threshold is 5,000+/day to a provider, but cold programs across multiple inboxes cross it
easily — and the requirements improve deliverability at any volume, so **just meet them always**:
- **SPF, DKIM, and DMARC** all configured (DMARC at minimum `p=none`; progress toward `quarantine`/`reject`
  for a stronger reputation).
- **DMARC alignment** — the visible `From:` domain matches the SPF- or DKIM-authenticated domain.
- **One-click unsubscribe** (RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post`) on marketing mail.
- **TLS**, valid **PTR/reverse DNS**, RFC-compliant headers.
*(Authentication setup is an IT/DNS task; get it right before the first send — it's step one, not an
afterthought.)*

## Warmup & volume discipline

- **Warm new domains/inboxes** — start ~5–10 emails/day and ramp over ~2–6 weeks; keep warmup running
  between campaigns.
- **Predictable, steady daily volume** — no spikes. Spread sends; use multiple warmed inboxes rather than
  blasting one.
- **Ramp into a list** — start with the most-engaged/highest-fit segment, watch the first 24 hours, slow
  down if deferrals/rejections rise.

## List hygiene (bounces and complaints are the killers)

- **Verify emails before sending** — keep **bounce rate < 2%** (hard bounces as low as possible).
- **Keep spam complaints < 0.3%** — target **≤0.1%**. Exceeding 0.3% loses you provider deliverability
  support.
- **Remove non-responders and bad addresses** — don't keep mailing people who never engage; it drags
  reputation into a hole.
- **Easy opt-out everywhere** — making leaving easy *protects* deliverability (a spam complaint hurts far
  more than an unsubscribe).

## Monitoring (fly with instruments)

- **Google Postmaster Tools** — Pass/Fail compliance status; check **weekly**.
- **Yahoo Sender Hub / Complaint Feedback Loop** and **Microsoft SNDS** for the other providers.
- **Seed/placement tests** across Gmail/Outlook/Yahoo to see actual inbox vs spam placement.
- **Guardrails / auto-pause** — pause a mailbox if bounces exceed ~2% on a send, the complaint rate climbs
  toward 0.3%, or placement dips; fix, re-warm, resume.

## Engagement is the real lever (post-gate)

Once authenticated, **what keeps you in the inbox is mailing people who want to hear from you**: tight ICP,
real personalization, low complaints, easy opt-out, and pruning the disengaged. This is why "relevance over
volume" isn't just brand-safety — it's deliverability strategy. (Ties straight to `icp-and-targeting.md` and
`messaging-and-sequences.md`.)

---

**How the agent uses this file:** insist on a separate warmed sending domain, full SPF/DKIM/DMARC +
one-click unsubscribe, verified lists, steady ramped volume, and weekly monitoring — and treat **bounce
<2% / complaints <0.3%** as hard guardrails that pause sending when breached. Deliverability is a
precondition for everything else the SDR does.
