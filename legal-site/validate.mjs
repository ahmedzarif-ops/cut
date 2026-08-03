#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  findBlockedReleaseCopy,
} = require("../artifacts/cut-os/server/legal-publication-gate.js");

const directory = dirname(fileURLToPath(import.meta.url));
const pages = ["index.html", "privacy.html", "terms.html", "support.html"];
const assets = ["styles.css", "README.md"];
const args = new Set(process.argv.slice(2));
const mode = args.has("--release") ? "release" : "draft";

if (args.has("--draft") && args.has("--release")) {
  console.error("Choose either --draft or --release, not both.");
  process.exit(2);
}

const files = new Map();
const errors = [];

for (const name of [...pages, ...assets]) {
  try {
    files.set(name, await readFile(join(directory, name), "utf8"));
  } catch (error) {
    errors.push(
      `${name}: could not be read (${error.code ?? "unknown error"})`,
    );
  }
}

const htmlDocuments = pages
  .map((name) => [name, files.get(name)])
  .filter(([, content]) => typeof content === "string");

for (const [name, html] of htmlDocuments) {
  const requiredFragments = [
    '<html lang="en">',
    '<meta charset="utf-8"',
    'name="viewport"',
    'href="styles.css"',
    'class="skip-link"',
    '<main id="main"',
    "<title>",
  ];

  for (const fragment of requiredFragments) {
    if (!html.includes(fragment)) {
      errors.push(`${name}: missing required fragment ${fragment}`);
    }
  }

  for (const localTarget of [
    ...html.matchAll(/href="((?:index|privacy|terms|support)\.html)"/g),
  ]) {
    if (!pages.includes(localTarget[1])) {
      errors.push(`${name}: broken local link ${localTarget[1]}`);
    }
  }
}

const combinedHtml = htmlDocuments.map(([, html]) => html).join("\n");
const placeholderPattern = /\{\{[A-Z0-9_]+\}\}/g;
const placeholders = [...new Set(combinedHtml.match(placeholderPattern) ?? [])];

if (mode === "draft") {
  const requiredDraftMarkers = [
    "{{LEGAL_OPERATOR}}",
    "{{PUBLIC_DOMAIN}}",
    "{{SUPPORT_CONTACT}}",
    "{{RETENTION_SCHEDULE}}",
    "{{POLICY_EFFECTIVE_DATE}}",
    "{{GOVERNING_LAW_AND_VENUE}}",
    "{{COUNSEL_APPROVAL}}",
  ];

  for (const marker of requiredDraftMarkers) {
    if (!combinedHtml.includes(marker)) {
      errors.push(`draft safety marker is missing: ${marker}`);
    }
  }

  for (const [name, html] of htmlDocuments) {
    if (!html.includes('data-publication-status="draft"')) {
      errors.push(`${name}: draft publication status is missing`);
    }
    if (!html.includes('data-counsel-approved="false"')) {
      errors.push(`${name}: unapproved counsel status is missing`);
    }
    if (!html.includes("data-draft-banner")) {
      errors.push(`${name}: visible draft banner is missing`);
    }
    if (
      !html.includes('name="robots" content="noindex, nofollow, noarchive"')
    ) {
      errors.push(`${name}: noindex protection is missing`);
    }
  }
} else {
  if (placeholders.length > 0) {
    errors.push(`unresolved placeholders: ${placeholders.sort().join(", ")}`);
  }

  for (const [name, html] of htmlDocuments) {
    if (!html.includes('data-publication-status="approved"')) {
      errors.push(`${name}: publication status is not approved`);
    }
    if (!html.includes('data-counsel-approved="true"')) {
      errors.push(`${name}: counsel approval is not recorded`);
    }
    if (html.includes("data-draft-banner") || html.includes("data-blocker")) {
      errors.push(`${name}: draft banner or blocker remains`);
    }
    if (html.includes('content="noindex')) {
      errors.push(`${name}: noindex is still enabled`);
    }

    for (const blockedCopy of findBlockedReleaseCopy(html)) {
      errors.push(`${name}: ${blockedCopy} remains`);
    }

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/);
    if (!canonical || !/^https:\/\//.test(canonical[1])) {
      errors.push(`${name}: a public HTTPS canonical URL is required`);
    }
  }

  if (
    /https?:\/\/(?:localhost|127\.0\.0\.1|[^/]*\.example)(?:[/:]|$)/i.test(
      combinedHtml,
    )
  ) {
    errors.push("local or example URL remains in release pages");
  }
}

if (errors.length > 0) {
  console.error(
    `${mode} validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (mode === "draft") {
  console.log(
    `Draft validation passed. Publication remains blocked by ${placeholders.length} unresolved placeholder${placeholders.length === 1 ? "" : "s"}.`,
  );
  console.log("Run with --release only after owner and counsel approval.");
} else {
  console.log("Release validation passed.");
}
