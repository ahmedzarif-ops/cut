#!/usr/bin/env node
// build-social-slides.mjs — render slides.json into per-slide self-contained HTML the
// social engine screenshots to PNG. Zero-dep, pure string templating. All brand values
// (colors, fonts, wordmark, logo SVG) live in social-slide.template.html — swap them for
// your own. This module only injects text content.
import { readFileSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(here, "social-slide.template.html"), "utf8");
const RATIOS = new Set(["1x1", "9x16"]);

// atomic write: write to a temp sibling then rename, so a crash mid-write never leaves a
// half-written slide file.
function atomicWriteFileSync(path, data) {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function content(s) {
  switch (s.type) {
    case "cover": return `<div class="eyebrow">${esc(s.eyebrow)}</div><h1 class="title">${esc(s.title)}</h1>`;
    case "point": return `<div class="num">${esc(s.num)}</div><h2 class="title">${esc(s.title)}</h2><p class="body">${esc(s.body)}</p>`;
    case "stat":  return `<div class="figure">${esc(s.figure)}</div><p class="caption">${esc(s.caption)}</p>`;
    case "cta":   return `<h2 class="title">${esc(s.title)}</h2><div class="cta-line">${esc(s.cta)}</div>`;
    default: throw new Error(`unknown slide type: ${s.type}`);
  }
}

export function renderSlide(s) {
  if (!RATIOS.has(s.ratio)) throw new Error(`bad ratio: ${s.ratio}`);
  return TEMPLATE
    .replace(/\{\{RATIO\}\}/g, s.ratio)
    .replace(/\{\{TYPE\}\}/g, s.type)
    .replace("{{CONTENT}}", content(s));
}

export function build(slidesJsonPath, outDir) {
  const { deck } = JSON.parse(readFileSync(slidesJsonPath, "utf8"));
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (f.endsWith(".html")) unlinkSync(join(outDir, f));
  return deck.map((s, i) => {
    const name = `${String(i + 1).padStart(2, "0")}-${s.type}.html`;
    atomicWriteFileSync(join(outDir, name), renderSlide(s));
    return name;
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , slidesPath, outDir] = process.argv;
  if (!slidesPath || !outDir) { console.error("usage: build-social-slides.mjs <slides.json> <outDir>"); process.exit(1); }
  const files = build(slidesPath, outDir);
  console.log(`built ${files.length} slides -> ${outDir}`);
}
