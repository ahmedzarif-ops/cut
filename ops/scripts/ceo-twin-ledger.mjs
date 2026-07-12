// CEO Twin decision ledger: pure helpers over an append-only JSONL ledger.
// Zero-dependency, self-contained. The fs read/write lives at the CLI layer
// (ceo-twin-ledger-cli.mjs); this file is only the pure string/array core so it
// is fully unit-testable.

export function makeId(summary, seq) {
  const slug = String(summary || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `${slug}-${seq}`;
}

export function parseLedger(text) {
  return String(text || "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((l) => JSON.parse(l));
}

export function serializeEntry(entry) {
  return JSON.stringify(entry);
}

export function appendLine(text, entry) {
  const prefix = text && !text.endsWith("\n") ? text + "\n" : text || "";
  return prefix + serializeEntry(entry) + "\n";
}

export function query(entries, filter = {}) {
  const keys = Object.keys(filter);
  return (entries || []).filter((e) => keys.every((k) => e[k] === filter[k]));
}

// ---- Schema v2 -------------------------------------------------------------
// Splits a decision record into a lifecycle axis (`status`) + an owner-verdict
// axis (`ruling`), adds numeric `conf`, a taxonomy `class`, and `source`
// provenance. New entries carry "v": 2; normalizeEntry() maps older v1 entries
// on READ. The ledger file itself stays APPEND-ONLY — nothing here rewrites
// history.
//
// "analysis": an evidence/measurement record (e.g. cost-per-run), not a
// decision — recorded for provenance and never feeds the autonomy ratchet.
export const TYPE_ENUM = ["decision", "auto", "held", "escalated", "grant", "supersede", "promotion", "execution", "analysis"];
export const STATUS_ENUM = ["pending", "decided", "executing", "executed", "parked", "superseded", "resolved"];
export const RULING_ENUM = [
  "approve", "approve_with_conditions", "override", "edit", "decline", "pending", "n/a",
  "constraint",    // set a binding boundary on a proposal (e.g. a hard price/comp ceiling)
  "direction",     // set strategic direction / re-anchor (not a verdict on one proposal)
  "rescind",       // withdraw a prior ruling (its premise changed)
  "gate_cleared",  // a blocking gate cleared by evidence (e.g. a measurement)
];
export const SOURCE_ENUM = [
  "terminal_pick", "yap", "away_mode", "governor", "handoff", "gate_override",
  "owner_direct", // the owner decided directly in a working session (not an inline tap / away-mode)
  "measurement",  // recorded from a data measurement rather than a decision surface
];

// The `type` axis drift a ledger organically grows, folded into the closed enum.
const TYPE_NORMALIZE = { hold: "held", decided: "decision", executed: "execution" };
export function normalizeType(t) {
  const s = String(t || "");
  return TYPE_NORMALIZE[s] || s;
}

// v1 smeared lifecycle + verdict into one `ruling`. Split them on read:
//  - STATUS_FROM_V1 recovers the lifecycle axis
//  - RULING_FROM_V1 recovers ONLY a real owner-verdict; lifecycle-only values map
//    to "n/a" so they never feed the ratchet as false matches.
const STATUS_FROM_V1 = {
  pending: "pending", held: "pending", held_for_owner: "pending", escalated: "pending",
  decided: "decided", approved: "decided", recorded: "decided",
  executing: "executing", "executed-partial": "executing",
  executed: "executed", done: "executed",
  parked: "parked", superseded: "superseded", resolved: "resolved",
};
const RULING_FROM_V1 = {
  approve: "approve", approved: "approve",
  approve_with_conditions: "approve_with_conditions",
  override: "override", decline: "decline", declined: "decline", edit: "edit",
  pending: "pending",
};

// Pull the leading numeric confidence out of a display string ("8.5/10 [75-95]" -> 8.5).
export function parseConf(confidence) {
  const m = /(-?\d+(?:\.\d+)?)/.exec(String(confidence ?? ""));
  return m ? Number(m[1]) : null;
}

// Read-side: return a v2-shaped VIEW of any entry (v1 or v2). Never throws, never
// mutates the input, never rewrites history — a pure read projection.
export function normalizeEntry(entry) {
  const e = entry || {};
  const type = normalizeType(e.type);
  const conf = Number.isFinite(e.conf) ? e.conf : parseConf(e.confidence);
  if (e.v === 2) return { ...e, type, conf };
  const oldRuling = String(e.ruling ?? "");
  const status = STATUS_FROM_V1[oldRuling] || (oldRuling ? "decided" : undefined);
  const ruling = RULING_FROM_V1[oldRuling] || "n/a";
  return { ...e, v: 1, type, status, ruling, conf };
}

// Write-side: validate a v2 entry before it is appended (the CLI `append` gate).
// `opts.classes` (the decision-classes.yml list) enables the taxonomy drift guard.
// `class` is required for decision samples but optional on `supersede` (pure
// resolution bookkeeping that references another entry).
export function validateEntry(entry, opts = {}) {
  const e = entry || {};
  const classes = opts.classes || null;
  const errors = [];
  if (e.v !== 2) errors.push("v must be 2 (new entries are schema v2)");
  if (!e.id || typeof e.id !== "string") errors.push("id is required (string)");
  if (!e.summary || typeof e.summary !== "string") errors.push("summary is required (string)");
  const type = normalizeType(e.type);
  if (!TYPE_ENUM.includes(type)) errors.push(`type must be one of ${TYPE_ENUM.join("|")} (got ${e.type})`);
  if (!STATUS_ENUM.includes(e.status)) errors.push(`status must be one of ${STATUS_ENUM.join("|")} (got ${e.status})`);
  if (!RULING_ENUM.includes(e.ruling)) errors.push(`ruling must be one of ${RULING_ENUM.join("|")} (got ${e.ruling})`);
  if (!SOURCE_ENUM.includes(e.source)) errors.push(`source must be one of ${SOURCE_ENUM.join("|")} (got ${e.source})`);
  if (typeof e.conf !== "number" || !Number.isFinite(e.conf)) errors.push(`conf must be a finite number (got ${e.conf})`);
  const classNeeded = type !== "supersede";
  if (classNeeded && (!e.class || typeof e.class !== "string")) {
    errors.push("class is required (a string from decision-classes.yml)");
  } else if (e.class && classes && !classes.includes(e.class)) {
    errors.push(`class must be one of decision-classes.yml (got ${e.class})`);
  }
  return { ok: errors.length === 0, errors };
}

// Parse the decision-classes.yml `classes:` list (pure; the CLI does the file read).
export function parseClasses(text) {
  const block = String(text || "").split(/^classes:/m)[1] || "";
  return [...block.matchAll(/^\s*-\s*([a-z0-9_.]+)/gm)].map((m) => m[1]);
}
