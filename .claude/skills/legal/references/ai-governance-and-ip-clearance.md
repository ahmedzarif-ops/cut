# AI Governance & IP Clearance — the checklist Lex runs

> **Not legal advice.** `legal` / `legal-aid` ("Lex") is an AI advisory function, **not a licensed
> attorney**, and using it does **not** create an attorney-client relationship. It surfaces issues, applies
> known frameworks, and flags when to consult a licensed attorney — it does not give binding legal advice.
> Law changes; verify current law before relying on anything here.

A **process checklist, not legal advice** — the ordered steps Lex runs when the work involves AI-generated
content, an AI persona, a product name to clear, or an AI vendor handling data. This is the newest and
fastest-moving area of the law; **every item ends in "verify at runtime + route material calls to counsel."**
US-focused; sources inline. Complements — does not repeat — `advertising-and-claims.md` (the FTC
endorsement/substantiation law behind Gus) and `corporate-and-ip.md` (the triage-and-route posture on
trademark/entity/securities).

**For each item: the *question to answer* · the *red flag* · *when to route to a licensed attorney.***

---

## Part A — AI-disclosure governance

The exposure: (1) **"AI washing"** — overstating what the AI does; and (2) **deception-by-omission** — a
consumer materially misled about whether they're dealing with a human or an AI, or about AI-generated proof.
The FTC's core §5 deception standard applies to AI the same as anything else; there is no AI safe harbor.

- **AI-capability claims ("autonomous," "agentic," "AI does X").**
  *Q:* Can we substantiate every capability claim the way we'd substantiate any objective ad claim (real basis,
  before it runs)? *Red flag:* "fully autonomous / replaces your team / 10x" stated as fact, not as an
  aspiration or a labelled simulation. *Route:* any capability/earnings claim tied to paid spend or a
  regulator-visible surface. The FTC's **Operation AI Comply** sweep (Sept 25, 2024) targets exactly
  overstated AI claims. Source: [FTC, "Keep your AI claims in check"](https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check) (verify current at runtime).

- **AI-generated proof (reviews, testimonials, endorsements, results).**
  *Q:* Is any testimonial/review/results figure AI-generated or unsubstantiated? *Red flag:* fabricated or
  AI-authored testimonials/reviews — now separately **illegal** under the FTC **Rule on Consumer Reviews and
  Testimonials** (16 CFR Part 465, effective Oct 21, 2024), on top of the Endorsement Guides. *Route:* before
  any such asset goes live with paid traffic. (Same standing risk as the fabricated-proof rule in
  `advertising-and-claims.md`; AI generation makes it worse, not better.) Source: [FTC final Reviews & Testimonials Rule](https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials) (verify current at runtime).

- **An AI persona / avatar + a cloned voice — the disclosure question (if the company uses one).**
  *Q:* Must we disclose that a public host/persona is AI-generated and uses a synthetic (cloned) voice, and if
  so, **how**? *Standard to apply:* there's no blanket US rule labelling every AI persona, but §5 deception +
  the FTC's **"Chatbots, deepfakes, and voice clones"** guidance say a disclosure is needed **where a
  reasonable consumer would otherwise be materially misled into thinking they're dealing with a specific real
  human**. Layer on **state bot-disclosure law** (California **B.O.T. Act** (SB 1001), Bus & Prof Code
  **§§17940–17943**, operative disclosure duty at **§17941** — disclose a bot in commercial/electoral
  contexts) and emerging gen-AI-disclosure statutes (e.g., the **Utah AI Policy Act**, in force May 1, 2024,
  **amended 2025 (SB 226/SB 332), which narrowed the general disclosure duty — verify current scope at
  runtime**). *Red flag:* the persona presents as a flesh-and-blood person with no AI disclosure anywhere, or
  narrates first-person credit for work it didn't do. *Lex's recommended posture:* disclose that the host is
  an **AI-generated persona with a synthetic voice**, keep it **clear-and-conspicuous** on the surface itself
  (not buried in a ToS), and keep the persona in a **narrator** frame (it recounts a real person's documented
  work, it does not claim to have personally done it). *Route:* advertising-counsel sign-off on the exact
  disclosure wording + placement **before the first public post** (Lex is advisory only).
  Source: [FTC, "Chatbots, deepfakes, and voice clones: AI deception for sale"](https://www.ftc.gov/business-guidance/blog/2023/03/chatbots-deepfakes-voice-clones-ai-deception-sale) (verify current at runtime).

- **Platform synthetic-media rules.**
  *Q:* Does each platform (Meta, TikTok, YouTube, LinkedIn) require an AI-generated / synthetic-media label on
  upload? *Red flag:* skipping the platform's own AI-content toggle — a policy (account) risk on top of the
  legal one. *Route:* not counsel — this is a **per-upload operational** check; Gus/Iris enforce it at publish.

- **Labelled-simulation honesty (demos, example scenarios, pitch decks).**
  *Q:* Is every demo/scenario that isn't a real customer clearly labelled as an **Example Scenario /
  simulation**? *Red flag:* a simulated result reads as a real one. *Route:* only if a simulation is doing the
  work of a substantiating proof-claim — then it's a claims question for Gus/Lex.

- **Non-US flag (EU/UK).**
  *Q:* Will the persona's content or the product reach the **EU**? If so, **EU AI Act Art. 50** transparency
  duties apply — systems that interact with people, and AI-generated/synthetic audio-visual content
  ("deepfakes"), must be **disclosed as AI** (Art. 50 obligations apply **from Aug 2, 2026**). *Red flag:*
  EU-facing AI-persona content with no AI disclosure. *Route:* any EU/UK exposure → counsel; US-default otherwise.

---

## Part B — IP clearance

### B1 · Trademark clearance (product / persona names)

Run in order; **do not skip to filing.**
1. **Knockout search.** *Q:* Any obvious identical/near-identical live federal mark in the same class? Free
   USPTO search first. *Red flag:* a live registration or pending app for a confusingly similar mark in the
   same goods/services. Note: **descriptive or crowded roots carry higher knockout risk.**
2. **Comprehensive clearance search.** *Q:* Federal + state + common-law + domain/social — is the field clear
   for the **actual goods/services**? This is a **counsel / professional-search-firm** step, not a Lex step.
3. **Application, incl. Intent-to-Use (ITU).** *Q:* File an **ITU application (Lanham Act §1(b))** to lock
   priority **before public use**? Classes for a software product: **Class 9** (downloadable software) **+
   Class 42** (SaaS / non-downloadable software). *Red flag:* going public on a name with zero clearance and
   no application on file. *Route:* the comprehensive search + the filing + class strategy are **counsel/agent
   work** — Lex recognizes the need and routes (per `corporate-and-ip.md`). Source: [USPTO, Trademark basics / search](https://www.uspto.gov/trademarks) (verify current at runtime).

### B2 · Likeness + voice rights (an AI avatar built on a real person + a cloned voice)

- *Q:* Is there a **signed written assignment/license of name, likeness, image, AND voice** from the person to
  the entity? An authorized clone of a consenting person's own voice is the **lower-risk** case — but the
  **grant to the entity must still be documented (and use-scoped; see the digital-replica note below).**
  *Red flag:* the company using a person's face/voice with only a verbal OK. *Law to note:* right of publicity
  is **state law** (e.g., Cal. Civ. Code §3344, NY Civ. Rights §§50–51) and **voice specifically** is now
  protected against AI cloning by statutes like **Tennessee's ELVIS Act** (in force July 1, 2024). Note
  **California AB 2602 (eff. Jan 1, 2025)**: a contract licensing a **digital replica** of a person's
  voice/likeness is **unenforceable** unless it gives a **reasonably specific description** of the intended
  uses AND the individual had counsel or union representation — so the grant to the entity must be **specific
  and use-scoped, not open-ended**. Right-of-publicity/digital-replica law is a fast-growing **state
  patchwork** (e.g., the Illinois Right of Publicity Act digital-replica amendments), so counsel scopes by
  every state of use. *Also verify:* the **voice-tool account tier permits commercial use** of the cloned
  voice. *Route:* the signed likeness+voice assignment to the entity + the tier check are **residual lawyer
  items before first public post**.

### B3 · Content IP + training-data / asset provenance

- *Q:* Who **owns** the AI-generated brand assets, and are they **registrable**? The US Copyright Office holds
  that **purely AI-generated output isn't protected by copyright** — only human-authored selection/arrangement
  is (Copyright Office AI report **Part 2: Copyrightability**, Jan 2025; affirmed in *Thaler v. Perlmutter*,
  D.C. Cir. Mar 2025). *Red flag:* treating a generated logo/character as a fully-owned registrable asset.
  *Route:* for any **material** brand asset where exclusivity matters.
- *Q:* Does any generated image/video/music **reproduce third-party protected work** (a recognizable style,
  mark, character, or track), and can we **evidence provenance** (which model, which inputs)? *Red flag:*
  generated output that echoes an identifiable third-party work, or generated music without a clear commercial
  license. *Route:* anything material or challenged. Source: [U.S. Copyright Office, Copyright & Artificial Intelligence](https://www.copyright.gov/ai/) (verify current at runtime).
- *Q:* Does each **generation tool's ToS** (image / video / voice tools) grant **commercial use + ownership of
  outputs** and any **IP indemnity**, and do we **retain a generation log** (model, prompt, inputs, date)?
  *Red flag:* a tool whose ToS reserves output rights or bars commercial use, or generated assets with no
  provenance record. *Route:* any tool-ToS ambiguity on commercial rights or indemnity → counsel. (Note: many
  consumer tiers forbid **multi-tenant resale** of outputs — check before any paying tenant generates on the
  company's account.)

### B4 · Work-for-hire + employment IP-assignment

- *Q — contractors:* Does every contractor who touched product/brand IP have a **written IP-assignment**?
  ("Work made for hire" alone doesn't transfer everything — see `contracts-and-tos.md`.) *Red flag:* a
  contributor who could retain rights.
- *Q — the founder's day-job:* If a founder built anything **while still employed elsewhere**, could that
  employer's **invention-assignment / duty-of-loyalty / moonlighting clauses** capture it? Does the **entity
  hold clean title** to everything created in that window? *Red flag:* company-owned IP that an ex-employer
  could claim. *Route:* **counsel** — invention-assignment interpretation against specific facts is squarely
  attorney work (UPL line; see `disclaimers-and-escalation.md`).

---

## Part C — AI-vendor / data governance (a multi-tenant product)

If the product processes **customers' data** (a multi-tenant / white-label posture), this is a **processor**
posture, and the contracts must say so.

- **DPA + sub-processor list.**
  *Q:* Is there a **Data Processing Agreement** with every AI vendor/sub-processor that touches customer data,
  and a **maintained sub-processor list** the customer MSA references? *Red flag:* customer PII flowing to a
  model vendor with no DPA and no disclosed sub-processor. *Route:* DPA drafting / any change to the
  processor-controller structure → counsel (contract = binding; see `contracts-and-tos.md` +
  `privacy-and-data.md`).

- **PII-in-prompts.**
  *Q:* Before customer PII goes into a prompt, is there a **DPA + purpose limitation**, and does the vendor
  **train on our inputs** (is there a **zero-retention / no-train** setting, and is it on)? *Red flag:*
  customer PII sent to a model that trains on inputs, or retained beyond purpose. *Route:* any novel data flow
  or a vendor without a no-train guarantee.

- **Cross-tenant data handling.**
  *Q:* Is each tenant's data **isolated** so nothing (including a shared model/context/cache) can leak across
  tenants? *Red flag:* one tenant's data reachable from another's session, or a shared embedding/cache mixing
  tenants. *Route:* the **technical** isolation (RLS, tenant scoping) is **Cyrus's security domain** (the
  `security` skill) — Lex owns the **contractual + privacy** dimension (the MSA/DPA data-handling promises)
  and routes the engineering control to Cyrus and any binding data-protection commitment to counsel.

---

## Route to counsel when…

- Any **AI-capability / earnings claim** goes to paid spend or a regulator-visible surface.
- **Fabricated or AI-generated** reviews/testimonials/results near any paid traffic.
- **Finalizing an AI-persona disclosure wording + placement** before first public post.
- **Trademark** comprehensive clearance, filing, class strategy, or any dispute (product/persona names).
- **Likeness + voice assignment** to the entity; **voice-tool commercial-tier** confirmation.
- **Ownership/registrability** of a material AI-generated brand asset, or any third-party-IP echo.
- A **founder's pre-departure employment IP-assignment** and clean title to the entity.
- Any **DPA / sub-processor / cross-tenant** commitment, or PII-in-prompts to a training vendor.
- A **digital-replica grant** to the entity that lacks a specific, use-scoped description (**CA AB 2602**).
- Any **EU/UK exposure** of the persona or product (**EU AI Act Art. 50** disclosure).
- Any **generation-tool ToS** ambiguity on commercial-use rights, output ownership, resale, or IP indemnity.

---

**How the agent uses this file:** run it as an **ordered checklist**, not a verdict engine — for each item
answer the question, name the red flag if present, cite the current authority + date (verify at runtime; this
area moves fast), and **route every material call to a licensed attorney.** The binding legal content (exact
disclosure wording, the trademark filing) stays with counsel and the owner. Pair with **Gus** (the specific
content/claims), **Cyrus** (technical tenant-isolation + secrets), and **Iris** (per-platform synthetic-media
labels at publish).
