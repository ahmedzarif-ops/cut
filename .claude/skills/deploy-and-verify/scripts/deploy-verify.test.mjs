// Unit tests for the pure evaluator half of deploy-verify.mjs. Zero-dep; run: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasNoindex, isDisallowed, inSitemap, hasReviewSchema, selfCanonical, hasAnchor, evaluateSurface,
} from "./deploy-verify.mjs";

test("hasNoindex reads x-robots-tag", () => {
  assert.equal(hasNoindex({ "x-robots-tag": "noindex, nofollow" }), true);
  assert.equal(hasNoindex({ "x-robots-tag": "all" }), false);
  assert.equal(hasNoindex({}), false);
});

test("isDisallowed matches a robots prefix", () => {
  const robots = "User-agent: *\nDisallow: /internal/\nDisallow: /go/";
  assert.equal(isDisallowed(robots, "/internal/secret-page"), true);
  assert.equal(isDisallowed(robots, "/blog/post"), false);
});

test("inSitemap substring-matches path or url", () => {
  const xml = "<url><loc>https://example.com/pricing</loc></url>";
  assert.equal(inSitemap(xml, "/pricing"), true);
  assert.equal(inSitemap(xml, "/internal/x"), false);
});

test("hasReviewSchema catches fabricated-review JSON-LD", () => {
  assert.equal(hasReviewSchema('{"@type": "AggregateRating"}'), true);
  assert.equal(hasReviewSchema('{"@type": "Organization"}'), false);
});

test("selfCanonical requires the canonical to point at this url", () => {
  const body = '<link rel="canonical" href="https://example.com/pricing">';
  assert.equal(selfCanonical(body, "https://example.com/pricing"), true);
  assert.equal(selfCanonical(body, "https://example.com/other"), false);
});

test("hasAnchor finds an id attribute", () => {
  assert.equal(hasAnchor('<section id="faq">', "faq"), true);
  assert.equal(hasAnchor("<section>", "faq"), false);
});

test("public-indexed surface fails on missing canonical + review schema", () => {
  const r = evaluateSurface({
    surfaceType: "public-indexed", status: 200,
    body: '{"@type":"Review"}', sitemapXml: "", expect: { url: "https://example.com/p", path: "/p" },
  });
  assert.equal(r.allPass, false);
});

test("internal surface fails without noindex", () => {
  const r = evaluateSurface({
    surfaceType: "internal", status: 200, headers: {}, robotsTxt: "", sitemapXml: "",
    expect: { path: "/internal/x" },
  });
  assert.equal(r.checks.find((c) => c.name === "X-Robots-Tag noindex").pass, false);
});

test("redirect surface checks status and Location", () => {
  const r = evaluateSurface({
    surfaceType: "redirect", status: 308, headers: { location: "/new-home" },
    expect: { redirectStatus: 308, redirectTo: "/new-home" },
  });
  assert.equal(r.allPass, true);
});

test("unknown surfaceType throws", () => {
  assert.throws(() => evaluateSurface({ surfaceType: "nope", status: 200 }));
});
