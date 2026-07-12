// Deterministic blog-draft integrity detector. Zero-dependency, pure function.
// Catches two mechanically-detectable draft defects that model critics prove
// unreliable at both catching AND repairing: (1) internal links left with EMPTY
// anchor text ("[](url)"), and (2) a named source/report/statistic cited in the
// prose whose name never appears in sources[]. A writer can fold these findings
// into an auto-fix pass (quoting the exact snippet) so drafts arrive gate-clean;
// the same pure detector is endpoint-ready as a defense-in-depth backstop.
//
// Precision is the explicit design priority. A FALSE positive would hold a good
// post and jam the machine (worse than the disease), so the unsourced-citation
// check only fires on high-confidence citation shapes -- "<Capitalized Name>
// Report/Study/Survey/Index" or "according to <Capitalized Name>" -- and clears
// as soon as any significant word OR the acronym of the cited name appears in a
// source label (so an org spelled out in prose but cited by its acronym is not
// falsely held). A model reviewer remains the authority for the judgment cases
// this deliberately skips; this file is only the mechanical layer.

const EMPTY_ANCHOR_SRC = "\\[\\s*\\]\\([^)]*\\)";

// A capitalized name run: a word starting uppercase, optionally continued by
// more capitalized words or interior numbers, joined by single spaces. Kept
// case-sensitive on purpose (no /i flag) so ordinary lowercase prose is never
// mistaken for a proper name.
const NAME = "[A-Z][A-Za-z0-9.&'’-]*(?:\\s+(?:[A-Z][A-Za-z0-9.&'’-]*|\\d[\\d,]*))*";
const TITLED_WORK_SRC = NAME + "\\s+(?:[Rr]eport|[Ss]tudy|[Ss]urvey|[Ii]ndex)\\b";

// The attributed ("according to <X>") pattern captures a fuller ORG name that may
// contain internal lowercase connectors ("American Library Association") so the
// acronym check below can spell it correctly and clear an acronym-sourced
// citation (prose spells out the org; sources[] cites it by acronym, e.g. ALA).
const CONNECTOR = "(?:of|the|and|for|on|in|de)";
const ORG = "[A-Z][A-Za-z0-9.&'’-]*(?:\\s+(?:" + CONNECTOR + "\\s+)?(?:[A-Z][A-Za-z0-9.&'’-]*|\\d[\\d,]*))*";
const ATTRIBUTED_SRC = "[Aa]ccording to\\s+(?:the\\s+|a\\s+|an\\s+)?(" + ORG + ")";

// Words never treated as the distinctive part of a citation name: the citation
// keywords themselves plus common connectives. Excluding the keywords matters --
// "report"/"study" appear in many source labels, so counting them would falsely
// clear an unrelated citation as if it were sourced.
const STOP = new Set([
  "report", "reports", "study", "studies", "survey", "surveys", "index",
  "the", "and", "for", "with", "from", "that", "this", "into", "your", "our",
  "according", "found", "most", "more", "than",
]);

// Drop a leading article so it does not pollute the acronym ("The ALA Report"
// -> "ALA Report").
function stripArticle(phrase) {
  return String(phrase).replace(/^(?:the|a|an)\s+/i, "");
}

function significantWords(phrase) {
  return stripArticle(phrase)
    .split(/[^A-Za-z]+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 4 && !STOP.has(w));
}

// The acronym of a multi-word name: first letter of each Capitalized word,
// skipping lowercase connectors and numbers. "American Library Association" ->
// "ALA". Used to clear a citation whose source lists it by acronym.
function acronym(phrase) {
  return stripArticle(phrase)
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Every public text field, for the empty-anchor scan (an empty link renders as a
// blank clickable slot wherever it appears, not only in the body).
function textFields(post) {
  const p = post && typeof post === "object" ? post : {};
  const out = [];
  for (const k of ["title", "eyebrow", "excerpt", "description"]) {
    if (typeof p[k] === "string") out.push(p[k]);
  }
  if (Array.isArray(p.keyTakeaways)) for (const k of p.keyTakeaways) if (typeof k === "string") out.push(k);
  for (const b of Array.isArray(p.body) ? p.body : []) {
    if (!b || typeof b !== "object") continue;
    if (typeof b.text === "string") out.push(b.text);
    if (typeof b.label === "string") out.push(b.label);
    if (Array.isArray(b.items)) for (const it of b.items) if (typeof it === "string") out.push(it);
  }
  return out;
}

// The reading prose we scan for citations: body paragraphs/headings/quotes/list
// items plus the excerpt and key takeaways (all render publicly and can carry a
// stat). Title/eyebrow/cta labels do not carry full citations, so they are
// skipped to keep precision high.
function proseFields(post) {
  const p = post && typeof post === "object" ? post : {};
  const out = [];
  if (typeof p.excerpt === "string") out.push(p.excerpt);
  if (Array.isArray(p.keyTakeaways)) for (const k of p.keyTakeaways) if (typeof k === "string") out.push(k);
  for (const b of Array.isArray(p.body) ? p.body : []) {
    if (!b || typeof b !== "object") continue;
    if ((b.type === "p" || b.type === "h2" || b.type === "h3" || b.type === "quote") && typeof b.text === "string") {
      out.push(b.text);
    }
    if ((b.type === "ul" || b.type === "ol") && Array.isArray(b.items)) {
      for (const it of b.items) if (typeof it === "string") out.push(it);
    }
  }
  return out;
}

export function draftIntegrity(post) {
  const findings = [];

  // (1) Empty-anchor links in any public text field.
  for (const s of textFields(post)) {
    const re = new RegExp(EMPTY_ANCHOR_SRC, "g");
    if (re.test(s)) findings.push({ tell: "empty-anchor", severity: "block", snippet: s.trim().slice(0, 120) });
  }

  // (2) Named citations in the prose that are absent from sources[].
  const sourcesText = (Array.isArray(post && post.sources) ? post.sources : [])
    .map((s) => (s && typeof s.label === "string" ? s.label : ""))
    .join(" | ")
    .toLowerCase();

  const seen = new Set();
  const consider = (phrase) => {
    const cited = String(phrase).trim();
    const key = cited.toLowerCase();
    if (!cited || seen.has(key)) return;
    seen.add(key);
    const words = significantWords(cited);
    const ac = acronym(cited);
    // Cleared if: the name has no distinctive word; OR its acronym (>= 3 letters)
    // appears as a whole word in a source label; OR ANY distinctive word shows up
    // in a source label. This is the precision-biased choice -- never hold on a
    // maybe -- so a well-sourced post is not falsely held (the model reviewer owns recall).
    const acSourced = ac.length >= 3 && /^[A-Z]+$/.test(ac) && new RegExp("\\b" + ac.toLowerCase() + "\\b").test(sourcesText);
    const sourced = words.length === 0 || acSourced || words.some((w) => sourcesText.includes(w));
    if (!sourced) findings.push({ tell: "unsourced-citation", severity: "block", snippet: cited.slice(0, 120) });
  };

  for (const s of proseFields(post)) {
    let m;
    const titled = new RegExp(TITLED_WORK_SRC, "g");
    while ((m = titled.exec(s)) !== null) consider(m[0]);
    const attributed = new RegExp(ATTRIBUTED_SRC, "g");
    while ((m = attributed.exec(s)) !== null) consider(m[1]);
  }

  return {
    findings,
    counts: {
      emptyAnchor: findings.filter((f) => f.tell === "empty-anchor").length,
      unsourcedCitation: findings.filter((f) => f.tell === "unsourced-citation").length,
    },
  };
}
