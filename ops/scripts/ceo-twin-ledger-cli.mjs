#!/usr/bin/env node
// CEO Twin ledger CLI — the fs layer over the tested pure core (ceo-twin-ledger.mjs).
// ALL ledger writes go through here; hand-authored JSONL is a convention violation.
// The ledger file is APPEND-ONLY: this tool ONLY ever appends a new line; it never
// edits or rewrites an existing one.
//
// Usage:
//   node ceo-twin-ledger-cli.mjs append '<json>'          validate v2 + append
//   node ceo-twin-ledger-cli.mjs resolve <id> <ruling>    append a supersede closing <id>
//   node ceo-twin-ledger-cli.mjs pending                  list still-open (unresolved) pendings
//   node ceo-twin-ledger-cli.mjs promotions               list ratchet-eligible classes
//
// Paths are resolved at call time so tests can point CEO_TWIN_LEDGER / CEO_TWIN_CLASSES
// at a scratch file. Defaults live under the project's ops/ directory.
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseLedger, appendLine, normalizeEntry, validateEntry, parseClasses, RULING_ENUM,
} from "./ceo-twin-ledger.mjs";
import { computePromotions } from "./ceo-twin-ratchet.mjs";

function ledgerPath() { return process.env.CEO_TWIN_LEDGER || "ops/decisions/ledger.jsonl"; }
function classesPath() { return process.env.CEO_TWIN_CLASSES || "ops/decision-classes.yml"; }

function loadClasses() {
  const p = classesPath();
  return existsSync(p) ? parseClasses(readFileSync(p, "utf8")) : [];
}
function loadEntries() {
  const p = ledgerPath();
  return existsSync(p) ? parseLedger(readFileSync(p, "utf8")) : [];
}
function appendEntry(entry) {
  const p = ledgerPath();
  // O_APPEND, not read-modify-write: two concurrent sessions appending must never
  // clobber each other's entries (lost-update race). If the existing file lacks a
  // trailing newline, heal it with an appended newline first (still append-only;
  // never rewrite prior bytes).
  if (existsSync(p)) {
    const tail = readFileSync(p, "utf8").slice(-1);
    if (tail && tail !== "\n") appendFileSync(p, "\n");
    appendFileSync(p, appendLine("", entry));
  } else {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, appendLine("", entry));
  }
}

// Append a validated v2 entry.
export function cmdAppend(json, opts = {}) {
  const entry = typeof json === "string" ? JSON.parse(json) : json;
  const classes = opts.classes || loadClasses();
  const { ok, errors } = validateEntry(entry, { classes });
  if (!ok) throw new Error("invalid v2 entry:\n  - " + errors.join("\n  - "));
  if (!opts.dryRun) appendEntry(entry);
  return entry;
}

// Close a decision: append a `type: supersede` entry referencing the original.
// Never mutates the original line.
export function cmdResolve(id, ruling, opts = {}) {
  if (!RULING_ENUM.includes(ruling)) throw new Error(`ruling must be one of ${RULING_ENUM.join("|")} (got ${ruling})`);
  const all = opts.entries || loadEntries();
  const original = all.find((e) => e.id === id);
  if (!original) throw new Error(`no ledger entry with id: ${id}`);
  const oc = normalizeEntry(original).conf;
  const entry = {
    v: 2,
    id: `${id}-resolved`,
    ts: new Date().toISOString(),
    type: "supersede",
    status: "resolved",
    ruling,
    source: "handoff",
    conf: Number.isFinite(oc) ? oc : 0,
    refs: [id],
    summary: `Resolve ${id}: owner verdict ${ruling}.`,
    ...(original.class ? { class: original.class } : {}),
  };
  const { ok, errors } = validateEntry(entry, { classes: opts.classes || loadClasses() });
  if (!ok) throw new Error("resolve produced an invalid entry:\n  - " + errors.join("\n  - "));
  if (!opts.dryRun) appendEntry(entry);
  return entry;
}

// Still-open pendings: status pending AND not referenced/closed by a later entry
// (the reader treats a referenced original as closed).
export function cmdPending(opts = {}) {
  const all = (opts.entries || loadEntries()).map(normalizeEntry);
  const closed = new Set();
  for (const e of all) {
    for (const r of (e.refs || [])) closed.add(r);
    if (e.supersedes) closed.add(e.supersedes);
    if (e.superseded_by) closed.add(e.id);
  }
  return all.filter((e) => e.status === "pending" && !closed.has(e.id));
}

// Ratchet-eligible classes over the ledger (never hard-line; see the ratchet).
export function cmdPromotions(opts = {}) {
  const all = opts.entries || loadEntries();
  return computePromotions(all, opts.alreadyPromoted || []);
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === "append") {
      const e = cmdAppend(args[0]);
      console.log("appended " + e.id);
    } else if (cmd === "resolve") {
      const e = cmdResolve(args[0], args[1]);
      console.log(`resolved ${args[0]} -> ${e.id} (${args[1]})`);
    } else if (cmd === "pending") {
      const p = cmdPending();
      console.log(p.length ? p.map((e) => e.id).join("\n") : "(no open pendings)");
    } else if (cmd === "promotions") {
      const pr = cmdPromotions();
      console.log(pr.length ? pr.join("\n") : "(no eligible classes)");
    } else {
      console.error("usage: append '<json>' | resolve <id> <ruling> | pending | promotions");
      process.exit(2);
    }
  } catch (err) {
    console.error("ERROR " + err.message);
    process.exit(1);
  }
}
