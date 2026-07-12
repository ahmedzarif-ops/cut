import assert from "node:assert/strict";
import { buildUtmUrl, escapeHtml, fillShell, buildSequence } from "./build-emails.mjs";

// A run-supplied destination map (in real runs it comes from sequence.destinations, built from
// company.yml). Kept neutral here so the test carries no company facts.
const DESTS = {
  free_thing: "https://example.com/go/free-thing",
  core_offer: "https://example.com/go/core",
  consult: "https://example.com/book",
};

// buildUtmUrl appends the fixed UTM scheme to the run's base URL.
const url = buildUtmUrl(DESTS, "free_thing", "welcome", "welcome-01-core-insight");
assert.ok(url.startsWith("https://example.com/go/free-thing?"), "base preserved");
assert.match(url, /utm_source=email/, "utm_source");
assert.match(url, /utm_medium=lifecycle/, "utm_medium");
assert.match(url, /utm_campaign=welcome/, "utm_campaign = sequence slug");
assert.match(url, /utm_content=welcome-01-core-insight/, "utm_content = email slug");
assert.throws(() => buildUtmUrl(DESTS, "nope", "welcome", "x"), /unknown dest/, "unknown dest errors");

// escapeHtml protects text tokens.
assert.equal(escapeHtml("A & B < C"), "A &amp; B &lt; C", "escapes & and <");

// fillShell replaces provided tokens and errors on a missing one.
assert.equal(fillShell("Hi {{NAME}}", { NAME: "Dana" }), "Hi Dana", "fills token");
assert.throws(() => fillShell("Hi {{NAME}}", {}), /missing token: NAME/, "missing token errors");

// buildSequence renders each email, UTM-tagging the CTA and leaving no raw {{ token.
const seq = {
  sequence: { slug: "welcome", businessName: "Acme", businessAddress: "1 Main St",
              fromName: "Owner", destinations: DESTS },
  emails: [{
    slug: "welcome-01-core-insight", subject: "S & T", preheader: "P",
    headline: "H", bodyHtml: "<p>body</p>",
    cta: { label: "Run my free check", dest: "free_thing" }, secondaryHtml: ""
  }],
};
const tpl = "<title>{{SUBJECT}}</title>{{PREHEADER}}{{HEADLINE}}{{BODY_HTML}}" +
  "<a href=\"{{CTA_URL}}\">{{CTA_LABEL}}</a>{{SECONDARY_HTML}}{{BUSINESS_NAME}}" +
  "{{BUSINESS_ADDRESS}}{{UNSUB_URL}}{{VIEW_IN_BROWSER_URL}}";
const built = buildSequence(seq, tpl);
assert.equal(built.length, 1, "one email built");
assert.ok(!built[0].html.includes("{{"), "no raw tokens left");
assert.match(built[0].html, /utm_campaign=welcome/, "cta is UTM-tagged");
assert.match(built[0].html, /S &amp; T/, "subject escaped in output");
assert.match(built[0].html, /%%UNSUBSCRIBE_URL%%/, "unsub placeholder injected");

// buildSequence resolves inline {{LINK:<key>}} tokens in body/secondary to UTM'd urls,
// while leaving ESP merge tags (e.g. {{first_name | fallback: "there"}}) untouched.
const seq2 = {
  sequence: { slug: "upgrade", businessName: "Acme", businessAddress: "1 Main St", fromName: "Owner", destinations: DESTS },
  emails: [{
    slug: "upgrade-04-crm-setup", subject: "S", preheader: "P", headline: "H",
    bodyHtml: "<p>keep {{first_name | fallback: \"there\"}}</p>",
    cta: { label: "See the core offer", dest: "core_offer" },
    secondaryHtml: "<p>Or <a href=\"{{LINK:consult}}\">book a call</a>.</p>"
  }],
};
const built2 = buildSequence(seq2, tpl);
assert.match(built2[0].html,
  /href="https:\/\/example\.com\/book\?[^"]*utm_content=upgrade-04-crm-setup/,
  "secondary LINK token resolves to a UTM-tagged consult url");
assert.ok(!built2[0].html.includes("{{LINK:"), "no raw LINK token left");
assert.match(built2[0].html, /\{\{first_name \| fallback: "there"\}\}/, "ESP merge tag preserved");
assert.throws(
  () => buildSequence({ sequence: seq2.sequence,
    emails: [{ ...seq2.emails[0], secondaryHtml: "{{LINK:bogus}}" }] }, tpl),
  /unknown dest/, "unknown LINK key errors");

console.log("build-emails: all assertions passed");
