---
name: deploy-and-verify
description: Run the post-deploy live-verify smoke battery against a just-deployed surface to confirm each page is healthy and correctly indexed or hidden. Use AFTER an owner-gated production deploy, whenever the user mentions verifying, smoke-testing, or checking a shipped page — even if they don't say "skill". Triggers include "verify the deploy", "smoke test the site", "did the deploy go through", "check noindex", "is the page live", "confirm the ship". Encodes the per-surface checks (200s, X-Robots noindex on hidden pages, anchors, sitemap presence, self-canonical, no Review/Rating JSON-LD, redirect codes). Never deploys — deploy stays owner-gated.
---

# /deploy-and-verify

The deploy itself is **owner-gated** (the owner authorizes; the agent runs the deploy command only on their
go — target read from `company.yml` → `integrations.deploy_target`). This skill is the step **after**: confirm
the live result with the encoded battery instead of re-typing curl checks by hand. It VERIFIES, never deploys.

## Run it

For each surface you touched, run the battery:

```
node .claude/skills/deploy-and-verify/ops/scripts/deploy-verify.mjs <url> <surface-type> [flags]
```

Surface types and what each protects against:

| Surface type | Use for | Checks | Protects against |
| --- | --- | --- | --- |
| `public-indexed` | indexed marketing pages (a landing page, a pricing page) | 200 · self-canonical · in sitemap · no Review/Rating JSON-LD · `--anchor` ids present · `--image` urls return 200 | broken page, missing canonical, fabricated-review schema, dead anchors, broken images |
| `internal` | hidden pages under a private path prefix (e.g. `/internal/*`) | 200 · X-Robots noindex · disallowed in robots.txt · NOT in sitemap | the "forgot the noindex" leak |
| `go` | paid-funnel / campaign pages under a noindex prefix (e.g. `/go/*`) | 200 · X-Robots noindex · disallowed in robots · NOT in sitemap | indexing a paid funnel page |
| `redirect` | retired routes that should redirect | `--redirect-status` matches · `--redirect-to` matches Location | a redirect that 200s or points wrong |

The `internal`/`go` split is by intent, not path name — use `internal` for any hidden page you never want
indexed and `go` for any noindex paid-traffic page. Match the path prefixes to whatever your site actually
uses (pass `--robots-prefix` if the robots.txt entry differs from the URL path).

Examples (substitute your own domain from `company.yml` → `company.domain`, and your own paths/anchors):

```
node .claude/skills/deploy-and-verify/ops/scripts/deploy-verify.mjs https://example.com/pricing public-indexed --anchor faq --anchor plans --image /images/hero.webp
node .claude/skills/deploy-and-verify/ops/scripts/deploy-verify.mjs https://example.com/internal/board internal
node .claude/skills/deploy-and-verify/ops/scripts/deploy-verify.mjs https://example.com/old-page redirect --redirect-status 308 --redirect-to /new-page
```

The script prints PASS/FAIL per check and exits non-zero on any failure.

## After running

Paste the PASS/FAIL summary into the session handoff (the `handoff-refresh` "deployed + verified" slot),
with the deployment id. If anything FAILs, fix-forward and re-verify before declaring the deploy done.

## Verify the RENDERED page, not just asset responses

Asset URLs can each return 200 while the page renders broken in a browser (relative asset paths that 404 on a
slashless URL, blocked local fonts, a missing route rewrite for a static directory page). This battery is the
header/schema/index layer — for any surface a human will look at, ALSO load the live URL once in a real
browser (a Playwright/headless screenshot) and confirm it renders. Verify routed static pages against a real
app server (`next start` / your framework's production server), never a plain static file server, which serves
directory indexes and trailing slashes that mask a missing rewrite.

## Notes

- Plain Node + `fetch`, no dependencies.
- It only fetches the URLs you pass it. It does not deploy, mutate, or call any owner-gated action.
- The check logic is a pure evaluator, unit-tested at `scripts/deploy-verify.test.mjs` (run `node --test`
  in the `scripts/` dir). The surface profiles encode the verbatim battery a ship session should run.
