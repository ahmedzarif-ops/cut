# Corporate & IP — Triage & Route

> **Not legal advice.** `legal` / `legal-aid` ("Lex") is an AI advisory function, **not a licensed
> attorney**, and using it does **not** create an attorney-client relationship. It surfaces issues, applies
> known frameworks, and flags when to consult a licensed attorney — it does not give binding legal advice.
> Law changes; verify current law before relying on anything here.

**Triage-and-route only.** This is the one area where Lex is deliberately shallow: corporate, securities, and
IP law are high-stakes and specialist. Lex's job here is to **recognize the issue, explain why it needs a
specialist, and route** — not to advise.

## Entity & corporate

- **Entity basics:** LLC vs C-corp affects liability, taxes, and fundraising. If the company plans to raise
  priced equity, investors typically expect a Delaware C-corp — but that's a **counsel + tax-advisor**
  decision. (See `company.yml` → `company.legal_entity` for the current entity, if formed.)
- **Corporate housekeeping** (cap table, board/operating agreements, equity grants, 83(b) elections) → counsel.

## Fundraising / securities — high alert

- **A SAFE or any priced-equity round is a securities instrument**, and selling securities implicates
  **federal + state securities law** (exemptions like Reg D, accredited-investor rules, blue-sky filings).
  **This is squarely "use a licensed attorney" territory** — Lex does not opine on securities terms. Any
  fundraising material should label proposed terms as "proposed, to confirm with counsel before use."
- Any solicitation of investment → flag securities-law exposure + route to counsel.

## Intellectual property

- **Trademark:** the company's brand name/marks (`company.yml` → `company.name`) — consider clearance +
  registration; don't assume rights. Routine triage; registration strategy → counsel/agent.
- **Copyright / content ownership:** company-generated content is generally the company's, but **work made by
  contractors needs a written IP-assignment** (see `contracts-and-tos.md`) — otherwise the contractor may
  retain rights.
- **Third-party IP:** don't use others' copyrighted content, trademarks, or images without rights/license.
  AI-generated assets have evolving IP/ownership questions — flag for anything material (see
  `ai-governance-and-ip-clearance.md`).
- **Patents:** generally out of scope; route if it ever comes up.

## Route to counsel when… (almost always, here)

- **Any securities/fundraising** action (a SAFE, any investor solicitation).
- **Entity formation/conversion**, cap-table, equity grants.
- **Trademark registration/disputes**, IP-assignment drafting, or any **third-party IP** concern with real
  exposure.
- Effectively: treat this whole file as "spot it and route it."

---

**How the agent uses this file:** recognize corporate/securities/IP issues early, **explain the risk in plain
terms, and route to a licensed attorney (and tax advisor where relevant)** — do not give corporate,
securities, or IP advice. A SAFE in particular is securities law: flag, don't opine.
