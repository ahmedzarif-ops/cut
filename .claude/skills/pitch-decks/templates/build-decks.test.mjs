import assert from "node:assert/strict";
import { resolveDest, escapeHtml, fillLeadTokens, resolveDestLinks } from "./build-decks.mjs";

// A sample destinations map (in real runs this comes from deck.json, filled from company.yml).
const DESTS = {
  primary: "https://example.com/start",
  booking: "https://example.com/book",
  home: "https://example.com/",
};

// resolveDest: known keys resolve, unknown throws.
assert.equal(resolveDest("primary", DESTS), "https://example.com/start");
assert.equal(resolveDest("booking", DESTS), "https://example.com/book");
assert.throws(() => resolveDest("nope", DESTS), /unknown dest/, "unknown dest errors");

// escapeHtml protects text.
assert.equal(escapeHtml("A & B < C"), "A &amp; B &lt; C");

// fillLeadTokens fills provided values and falls back when missing/empty.
const filled = fillLeadTokens("Hi {{OWNER_NAME}} at {{COMPANY}} in {{CITY}} ({{SEGMENT}})",
  { owner_name: "Dana", company: "Summit Co", city: "Austin", segment: "clinics" });
assert.equal(filled, "Hi Dana at Summit Co in Austin (clinics)");
const fb = fillLeadTokens("Hi {{OWNER_NAME}} at {{COMPANY}}", {});
assert.equal(fb, "Hi there at your business", "missing tokens fall back");

// resolveDestLinks replaces {{DEST:key}} with the resolved URL; unknown throws.
assert.match(resolveDestLinks('<a href="{{DEST:primary}}">x</a>', DESTS),
  /href="https:\/\/example\.com\/start"/);
assert.throws(() => resolveDestLinks("{{DEST:bogus}}", DESTS), /unknown dest/);

console.log("build-decks task1: passed");

import { SCENARIO_LABEL, renderScenario } from "./build-decks.mjs";

// The mandatory label is ALWAYS rendered, even if the scenario object omits everything.
const emptyScenario = renderScenario({});
assert.ok(emptyScenario.includes(SCENARIO_LABEL), "label present even when scenario is empty");
assert.match(SCENARIO_LABEL, /simulation/, "label says simulation");
assert.match(SCENARIO_LABEL, /Not a real client/, "label disclaims a real client");

// Beats render and escape.
const s = renderScenario({
  company: "a 6-person shop", before: ["slow callbacks"],
  applied: [{ piece: "Follow-up flow", does: "works every quote" }],
  after: ["recovers a few quotes a month"], numbersNote: "illustrative",
});
assert.ok(s.includes("a 6-person shop"));
assert.ok(s.includes("slow callbacks"));
assert.ok(s.includes("Follow-up flow"));
assert.ok(s.includes("recovers a few quotes a month"));
assert.ok(s.includes("illustrative"));
console.log("build-decks task2: passed");

import { renderDemo } from "./build-decks.mjs";
const demo = renderDemo({
  appName: "Command Center",
  scoreValue: 86, scoreDelta: "+12 this month",
  lenses: [{ label: "Get found", value: 90 }, { label: "Follow-up", value: 92 }],
  moves: ["Follow up on 3 quotes worth $18,400", "Request 2 reviews", "Publish weekly post"],
  followUp: { quote: "Sample open quote", value: 14200, recovered: 12600 },
  proofLine: "4.9 from 38 reviews",
  review: "Hi Dana, thanks for trusting us with your install.",
});
assert.ok(demo.includes("Command Center"), "app name injected");
assert.ok(demo.includes("Get found") && demo.includes("90"), "lens injected");
assert.ok(demo.includes("Follow up on 3 quotes worth $18,400"), "move injected");
assert.ok(demo.includes("14,200") || demo.includes("14200"), "follow-up value injected");
assert.ok(demo.includes("12,600") || demo.includes("12600"), "recovered value injected");
assert.ok(demo.includes("Hi Dana"), "review injected");
assert.match(demo, /Sample/, "carries the Sample label");
assert.match(demo, /<script>/, "includes the scroll-animation script");
console.log("build-decks task3: passed");

import { composeDeck } from "./build-decks.mjs";
const deck = {
  segment: "clinics",
  destinations: { primary: "https://example.com/start" },
  cover: { headline: "{{COMPANY}}: stop losing {{SEGMENT}} jobs", subhead: "For {{OWNER_NAME}} in {{CITY}}" },
  pain: { headline: "Where the jobs leak", points: ["missed calls", "thin reviews"] },
  diagnosis: { headline: "Six factors", factors: [{ name: "Get found", line: "show up in search" }] },
  scenario: { company: "a 6-person shop", before: ["slow callbacks"], applied: [{ piece: "Follow-up flow", does: "works quotes" }], after: ["recovers quotes"], numbersNote: "illustrative" },
  demo: { appName: "Command Center", scoreValue: 86, lenses: [{ label: "Get found", value: 90 }], moves: ["m1"], followUp: { quote: "q", value: 14200, recovered: 12600 }, review: "Hi Dana" },
  offer: { headline: "Ways in", note: "Three ways in", tiers: [{ name: "Starter plan", price: "$49", line: "your do-this-next plan" }] },
  proof: { headline: "Who built this", who: "Built by the founder.", guarantee: "30-day money-back guarantee." },
  cta: { headline: "Start the free check", primaryLabel: "Run my free check", primaryDest: "primary" },
};
const shell = "<main>{{COVER}}|{{PAIN}}|{{DIAGNOSIS}}|{{SCENARIO}}|{{DEMO}}|{{OFFER}}|{{PROOF}}|{{CTA}}</main>";
const out = composeDeck(deck, shell, { company: "Summit & Co", owner_name: "Dana", city: "Austin", segment: "clinics" });
assert.ok(out.includes("Summit &amp; Co: stop losing clinics jobs"), "cover lead tokens filled");
assert.ok(out.includes("For Dana in Austin"), "subhead filled");
assert.ok(out.includes("missed calls") && out.includes("Get found"), "pain + diagnosis rendered");
assert.ok(out.includes("simulation"), "scenario label present");
assert.ok(out.includes("Command Center"), "demo rendered");
assert.ok(out.includes("Starter plan") && out.includes("$49"), "offer ladder rendered from tiers");
assert.ok(out.includes("30-day money-back guarantee"), "proof rendered from data");
assert.match(out, /href="https:\/\/example\.com\/start"/, "cta dest resolved");
assert.ok(!out.includes("{{"), "no leftover tokens");
assert.throws(() => composeDeck(deck, "{{MISSING}}", {}), /unresolved token/, "leftover token throws");
console.log("build-decks task4: passed");
