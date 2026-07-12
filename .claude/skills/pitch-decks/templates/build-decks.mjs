import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Zero-dependency, self-contained. No external company facts live here: every URL,
// price, and name comes in through the deck.json (which the writer agent fills from
// company.yml). Genericize by editing your deck.json / company.yml, never this file.

// Atomic write: write to a temp sibling then rename, so a crash mid-write never
// leaves a half-written file. Inlined to keep this script dependency-free.
export function atomicWriteFileSync(path, data) {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

// Destination keys are generic funnel slots. The real URLs come from the deck.json
// `destinations` map (filled from company.yml: offer.booking_link, company.domain).
// Keys are contract, URLs are config.
export function resolveDest(key, dests = {}) {
  const u = dests[key];
  if (!u) throw new Error(`unknown dest: ${key}`);
  return u;
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const LEAD_FALLBACKS = {
  COMPANY: "your business", OWNER_NAME: "there", CITY: "your area",
  SEGMENT: "your", SITUATION: "",
};

export function fillLeadTokens(html, lead) {
  return String(html).replace(/\{\{(COMPANY|OWNER_NAME|CITY|SEGMENT|SITUATION)\}\}/g, (_m, k) => {
    const v = lead && lead[k.toLowerCase()];
    return escapeHtml(v != null && v !== "" ? v : LEAD_FALLBACKS[k]);
  });
}

export function resolveDestLinks(html, dests = {}) {
  return String(html).replace(/\{\{DEST:(\w+)\}\}/g, (_m, key) => resolveDest(key, dests));
}

export const SCENARIO_LABEL =
  "Example Scenario - a simulation showing how the system works. Not a real client or a guaranteed result.";

export function renderScenario(scenario = {}) {
  const li = (arr) => (arr || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const applied = (scenario.applied || [])
    .map((a) => `<li><strong>${escapeHtml(a.piece)}:</strong> ${escapeHtml(a.does)}</li>`)
    .join("");
  const numbers = scenario.numbersNote
    ? `<p class="muted scenario-numbers">${escapeHtml(scenario.numbersNote)}</p>` : "";
  return `<div class="scenario">
  <p class="scenario-label">${SCENARIO_LABEL}</p>
  <h3>Example Scenario: ${escapeHtml(scenario.company || "a representative company")}</h3>
  <div class="scenario-beats">
    <div class="beat"><h4>Before</h4><ul>${li(scenario.before)}</ul></div>
    <div class="beat"><h4>The system applied</h4><ul>${applied}</ul></div>
    <div class="beat"><h4>After</h4><ul>${li(scenario.after)}</ul></div>
  </div>
  ${numbers}
</div>`;
}

// Generic animated product-dashboard mock. Every label is data-driven with a neutral
// fallback, so nothing here names a specific product. Keep the animation craft
// (IntersectionObserver reveal + rAF count-up + CSS bar transition) intact.
export function renderDemo(demo = {}) {
  const appName = escapeHtml(demo.appName || "Dashboard");
  const scoreLabel = escapeHtml(demo.scoreLabel || "Score");
  const scoreValue = Number(demo.scoreValue) || 0;
  const scoreDelta = escapeHtml(demo.scoreDelta || "");
  const movesLabel = escapeHtml(demo.movesLabel || "Your moves this week");
  const pipelineLabel = escapeHtml(demo.pipelineLabel || "Pipeline");
  const proofLabel = escapeHtml(demo.proofLabel || "Reviews");
  const proofLine = escapeHtml(demo.proofLine || "");
  const lenses = (demo.lenses || [])
    .map((l) => `<div class="lens"><div class="lens-row"><span>${escapeHtml(l.label)}</span><span class="lens-val">${Number(l.value) || 0}</span></div>`
      + `<div class="bar"><div class="bar-fill" style="--w:${Number(l.value) || 0}%"></div></div></div>`)
    .join("");
  const moves = (demo.moves || [])
    .map((m) => `<div class="move"><span class="tick">&#10003;</span><p>${escapeHtml(m)}</p></div>`).join("");
  const fu = demo.followUp || {};
  const fuValue = Number(fu.value) || 0;
  const recovered = Number(fu.recovered) || 0;
  const review = escapeHtml(demo.review || "");
  const deltaChip = scoreDelta ? `<span class="chip">${scoreDelta}</span>` : "";
  return `<div class="demo" data-demo>
  <div class="demo-bar"><span class="dots"><i></i><i></i><i></i></span>
    <span class="demo-title">${appName}</span><span class="tag-sample">Sample</span></div>
  <div class="demo-grid">
    <div class="panel"><p class="panel-h">${scoreLabel}</p>
      <div class="score"><span data-count="${scoreValue}">0</span>${deltaChip}</div>
      <div class="lenses">${lenses}</div></div>
    <div class="panel"><p class="panel-h">${movesLabel}</p><div class="moves">${moves}</div></div>
    <div class="panel"><p class="panel-h">${pipelineLabel}</p>
      <p class="fu-quote">${escapeHtml(fu.quote || "Open item")} &middot; $${fuValue.toLocaleString()}</p>
      <div class="touches"><span>Day 2 Sent</span><span>Day 6 Scheduled</span><span>Day 12 Scheduled</span></div>
      <p class="chip">Recovered this month (example): $<span data-count="${recovered}">0</span></p></div>
    <div class="panel"><p class="panel-h">${proofLabel}</p>
      <p class="stars">${proofLine}</p>
      <p class="review">${review}</p>
      <p class="muted">Drafted for you &middot; you approve and send</p></div>
  </div>
  <p class="demo-foot">Sample dashboard with example data. Real numbers populate as the system runs.</p>
  <script>(function(){var d=document.currentScript.closest('[data-demo]');if(!d)return;
    function run(){d.classList.add('in');d.querySelectorAll('[data-count]').forEach(function(el){
      var t=+el.getAttribute('data-count'),s=performance.now();function tk(n){var p=Math.min(1,(n-s)/1100);
      el.textContent=Math.round(t*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(tk);}requestAnimationFrame(tk);});}
    if('IntersectionObserver'in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){
      if(e.isIntersecting){run();io.disconnect();}});},{threshold:0.3});io.observe(d);}else{run();}})();</script>
</div>`;
}

export function renderCover(deck) {
  const c = deck.cover || {};
  return `<section class="slide cover"><h1>${escapeHtml(c.headline || "")}</h1>`
    + `<p class="subhead">${escapeHtml(c.subhead || "")}</p></section>`;
}
export function renderPain(deck) {
  const p = deck.pain || {};
  const pts = (p.points || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  return `<section class="slide"><h2>${escapeHtml(p.headline || "")}</h2><ul>${pts}</ul></section>`;
}
export function renderDiagnosis(deck) {
  const d = deck.diagnosis || {};
  const f = (d.factors || [])
    .map((x) => `<li><strong>${escapeHtml(x.name)}:</strong> ${escapeHtml(x.line)}</li>`).join("");
  return `<section class="slide"><h2>${escapeHtml(d.headline || "")}</h2><ul class="factors">${f}</ul></section>`;
}
// The offer ladder renders from deck.offer.tiers (name + line, optional price).
// The writer agent copies prices verbatim from company.yml -> offer.pricing_notes,
// so pricing has ONE source of truth and cannot drift inside a rendered deck.
export function renderOffer(deck) {
  const o = deck.offer || {};
  const note = escapeHtml(o.note || "");
  const tiers = (o.tiers || [])
    .map((t) => {
      const name = escapeHtml(t.name || "");
      const price = t.price ? ` (${escapeHtml(t.price)})` : "";
      const line = escapeHtml(t.line || "");
      return `<li><strong>${name}${price}</strong>: ${line}</li>`;
    })
    .join("");
  return `<section class="slide offer"><h2>${escapeHtml(o.headline || "Ways in")}</h2><p>${note}</p>
  <ol class="ladder">${tiers}</ol></section>`;
}
// Proof renders from deck.proof (who built it + guarantee), filled from company.yml
// owner + offer terms. Keep it honest: founder-led / product-as-proof only, no
// fabricated testimonials, reviews, counts, or results.
export function renderProof(deck) {
  const p = deck.proof || {};
  const who = escapeHtml(p.who || "");
  const guarantee = p.guarantee
    ? `<p class="guarantee">${escapeHtml(p.guarantee)}</p>` : "";
  return `<section class="slide proof"><h2>${escapeHtml(p.headline || "Who built this")}</h2>
  <p>${who}</p>
  ${guarantee}</section>`;
}
export function renderCta(deck) {
  const c = deck.cta || {};
  return `<section class="slide cta"><h2>${escapeHtml(c.headline || "")}</h2>
  <a class="btn" href="{{DEST:${escapeHtml(c.primaryDest || "primary")}}}">${escapeHtml(c.primaryLabel || "Get started")}</a></section>`;
}

export function composeDeck(deck, shellTemplate, lead) {
  const dests = (deck && deck.destinations) || {};
  const sections = {
    COVER: renderCover(deck), PAIN: renderPain(deck), DIAGNOSIS: renderDiagnosis(deck),
    SCENARIO: renderScenario(deck.scenario), DEMO: renderDemo(deck.demo),
    OFFER: renderOffer(deck), PROOF: renderProof(deck), CTA: renderCta(deck),
  };
  let html = String(shellTemplate).replace(/\{\{(COVER|PAIN|DIAGNOSIS|SCENARIO|DEMO|OFFER|PROOF|CTA)\}\}/g,
    (_m, k) => sections[k]);
  html = fillLeadTokens(html, lead);
  html = resolveDestLinks(html, dests);
  if (/\{\{/.test(html)) throw new Error(`unresolved token in composed deck: ${html.match(/\{\{[^}]*\}\}/)[0]}`);
  return html;
}

// CLI: node build-decks.mjs <deck.json> <shell.html> <outDir>
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [deckPath, shellPath, outDir] = process.argv.slice(2);
  if (!deckPath || !shellPath || !outDir) {
    console.error("usage: node build-decks.mjs <deck.json> <shell.html> <outDir>");
    process.exit(1);
  }
  const deck = JSON.parse(readFileSync(deckPath, "utf8"));
  const shell = readFileSync(shellPath, "utf8");
  const lead = deck.sampleLead || {};
  const html = composeDeck(deck, shell, lead);
  mkdirSync(outDir, { recursive: true });
  atomicWriteFileSync(join(outDir, "index.html"), html);
  console.log(`built deck for ${deck.segment || deck.vertical || "?"} into ${outDir}`);
}
