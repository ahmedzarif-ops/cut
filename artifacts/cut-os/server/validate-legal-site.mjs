#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  APPROVAL_RECORD_FILENAME,
  findBlockedReleaseCopy,
  normalizeBasePath,
  validateApprovalRecord,
} = require("./legal-publication-gate.js");

const directory = dirname(fileURLToPath(import.meta.url));
const templateDirectory = join(directory, "templates");
const pages = ["privacy.html", "terms.html", "support.html"];
const EXPECTED_PUBLIC_OPERATOR = "Zarif Ahmed";
const EXPECTED_PUBLIC_CONTACT = "ahmed.zarif@gmail.com";
const args = new Set(process.argv.slice(2));
const mode = args.has("--release") ? "release" : "draft";
const errors = [];

if (args.has("--draft") && args.has("--release")) {
  console.error("Choose either --draft or --release, not both.");
  process.exit(2);
}

const documents = new Map();
for (const name of [...pages, "legal.css", APPROVAL_RECORD_FILENAME]) {
  try {
    documents.set(name, await readFile(join(templateDirectory, name), "utf8"));
  } catch (error) {
    errors.push(
      `${name}: could not be read (${error.code ?? "unknown error"})`,
    );
  }
}

let publicationApproval;
try {
  publicationApproval = JSON.parse(
    documents.get(APPROVAL_RECORD_FILENAME) ?? "",
  );
} catch {
  errors.push(
    `${APPROVAL_RECORD_FILENAME}: must contain a valid JSON approval record`,
  );
}

const htmlDocuments = pages
  .map((name) => [name, documents.get(name)])
  .filter(([, content]) => typeof content === "string");

for (const [name, html] of htmlDocuments) {
  for (const fragment of [
    '<html lang="en">',
    '<meta charset="utf-8"',
    'name="viewport"',
    "LEGAL_BASE_PATH_PLACEHOLDER/legal.css",
    'class="skip-link"',
    '<main id="main"',
    "<title>",
  ]) {
    if (!html.includes(fragment)) {
      errors.push(`${name}: missing required fragment ${fragment}`);
    }
  }

  if (/<script(?:\s|>)/iu.test(html)) {
    errors.push(`${name}: public legal pages must contain zero JavaScript`);
  }
  if (/\s(?:on\w+)\s*=/iu.test(html) || /javascript:/iu.test(html)) {
    errors.push(`${name}: inline script behavior is not allowed`);
  }
  if (!html.includes(EXPECTED_PUBLIC_OPERATOR)) {
    errors.push(`${name}: authorized public legal operator is missing`);
  }
  if (!html.includes(EXPECTED_PUBLIC_CONTACT)) {
    errors.push(`${name}: authorized public support contact is missing`);
  }
  for (const resolvedMarker of ["{{LEGAL_OPERATOR}}", "{{SUPPORT_CONTACT}}"]) {
    if (html.includes(resolvedMarker)) {
      errors.push(
        `${name}: resolved identity marker returned: ${resolvedMarker}`,
      );
    }
  }
}

const combinedHtml = htmlDocuments.map(([, html]) => html).join("\n");
const placeholderPattern = /\{\{[A-Z0-9_]+\}\}/gu;
const placeholders = [...new Set(combinedHtml.match(placeholderPattern) ?? [])];

if (mode === "draft") {
  for (const marker of [
    "{{PUBLIC_DOMAIN}}",
    "{{RETENTION_SCHEDULE}}",
    "{{POLICY_EFFECTIVE_DATE}}",
    "{{GOVERNING_LAW_AND_VENUE}}",
    "{{COUNSEL_APPROVAL}}",
  ]) {
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
    const counselApproved = html.includes('data-counsel-approved="true"');
    const ownerDeferred =
      html.includes('data-counsel-approved="false"') &&
      html.includes('data-owner-risk-accepted="true"') &&
      html.includes(
        'data-professional-review-status="owner-deferred-post-launch"',
      );
    if (!counselApproved && !ownerDeferred) {
      errors.push(
        `${name}: neither counsel approval nor the owner-deferred review disposition is recorded`,
      );
    }
    if (html.includes("data-draft-banner") || html.includes("data-blocker")) {
      errors.push(`${name}: a draft banner or blocker remains`);
    }
    if (html.includes('content="noindex')) {
      errors.push(`${name}: noindex is still enabled`);
    }
    if (!/<link rel="canonical" href="https:\/\//u.test(html)) {
      errors.push(`${name}: a public HTTPS canonical URL is required`);
    }
    for (const blockedCopy of findBlockedReleaseCopy(html)) {
      errors.push(`${name}: ${blockedCopy} remains`);
    }
  }

  if (
    /https?:\/\/(?:localhost|127\.0\.0\.1|[^/]*\.example)(?:[/:]|$)/iu.test(
      combinedHtml,
    )
  ) {
    errors.push("a local or example URL remains in the release pages");
  }

  if (publicationApproval) {
    const recordedBasePath = publicationApproval.rendering?.basePath;
    errors.push(
      ...validateApprovalRecord(
        publicationApproval,
        {
          legal: Object.fromEntries(
            htmlDocuments.map(([name, html]) => [
              `/${name.replace(/\.html$/u, "")}`,
              html,
            ]),
          ),
          legalCss: documents.get("legal.css") ?? "",
        },
        publicationApproval.rendering?.appName,
        typeof recordedBasePath === "string"
          ? normalizeBasePath(recordedBasePath)
          : "",
      ),
    );
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
  console.log(
    "Draft routes must return 503. Run with --release only after documented publication approval.",
  );
} else {
  console.log("Legal-site release validation passed.");
}
