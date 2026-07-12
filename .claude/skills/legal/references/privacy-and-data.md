# Privacy & Data — CCPA/CPRA, the State Patchwork, GDPR, CASL

> **Not legal advice.** `legal` / `legal-aid` ("Lex") is an AI advisory function, **not a licensed
> attorney**, and using it does **not** create an attorney-client relationship. It surfaces issues, applies
> known frameworks, and flags when to consult a licensed attorney — it does not give binding legal advice.
> Law changes; verify current law before relying on anything here.

How the company handles personal data — its own prospects/customers and, where its product processes
end-user data on behalf of its customers, that data too. US-default, with non-US flags. Sources cited
inline; the state patchwork changes every legislative session — re-verify at runtime.

## US state privacy patchwork (no federal comprehensive law)

There is **no comprehensive US federal privacy law**; it's a **state patchwork**. **As of this writing, ~20
states have comprehensive consumer-privacy laws in effect** — California (CCPA/CPRA), Virginia, Colorado,
Connecticut, Utah, Iowa, Indiana, Tennessee, Montana, Oregon, Texas, Florida, Delaware, New Hampshire, New
Jersey, Kentucky, Nebraska, Minnesota, Maryland, Rhode Island — with more phasing in.
Source: [IAPP US State Privacy Legislation Tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker) · [MultiState privacy law tracker](https://www.multistate.us/) (verify the current count and effective dates at runtime).

Common baseline across these laws (the practical compliance floor):
- **Notice / a privacy policy** describing what you collect, why, who you share with, and consumer rights.
- **Consumer rights**: access, deletion, correction, portability, and **opt-out of sale/sharing & targeted
  advertising** (honor **Global Privacy Control** signals where required, e.g. CA/CO).
- **Data minimization & purpose limitation** — collect only what you need, use it for the stated purpose.
- **Sensitive data** gets extra protection (often opt-in consent).
- **Reasonable security**; **data-processing agreements** with vendors/processors.
California (CCPA/CPRA) is the strictest baseline; meeting CA + honoring opt-out signals covers much of the
field, but **thresholds and specifics vary by state** — confirm which states' laws apply (by where consumers
reside, plus revenue/volume thresholds).

## Non-US — flag immediately, route to counsel

- **GDPR (EU/UK)** — **opt-in** consent or another lawful basis, data-subject rights, DPAs, transfer
  mechanisms. Materially stricter than US. Any EU/UK personal data → flag + counsel.
- **CASL (Canada)** — **opt-in** consent for commercial electronic messages; stricter than CAN-SPAM. Any
  Canadian recipients → flag + counsel.

## Standing data posture (operational)

- **Minimize**: collect only the prospect/customer data a workflow needs; don't hoard.
- **Lawful sourcing**: no harvested/illegally-obtained lists (also a CAN-SPAM line — see `outreach-law.md`).
- **Honor deletion/opt-out** requests promptly and permanently; never re-add a suppressed contact.
- **A current privacy policy** on the site that matches actual practice (collection, cookies/analytics,
  sharing, rights, contact). Keep it truthful — a policy that misstates practice is itself an FTC
  "deceptive practice" risk.
- **Vendor/processor DPAs** for tools that touch personal data (CRM, email, analytics).
- **Customers' end-user data**: when the company's product handles a customer's end-user data, the company is
  often a **processor/service provider** — that needs the right contract terms (see `contracts-and-tos.md`).

## Route to counsel when…

- Any **non-US** personal data (GDPR/CASL).
- A **data subject / consumer rights request** you're unsure how to handle, or a **data breach**.
- Selling/sharing data, ad-tech/targeted advertising, or **sensitive data** processing.
- Drafting/changing the **privacy policy**, DPAs, or determining controller vs processor status.
- Operating across **many states** where thresholds/requirements diverge.

---

**How the agent uses this file:** apply the minimize / lawful-source / honor-opt-out / truthful-policy
posture; confirm which state laws apply by consumer residence + thresholds; **flag any non-US data and any
privacy-policy/DPA/breach/rights-request to counsel**; cite the current authority + date. Privacy questions
about outbound lists tie back to `outreach-law.md`.
