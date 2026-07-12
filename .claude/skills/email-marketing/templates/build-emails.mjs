import { readFileSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

// Crash-atomic write (zero-dep, inlined so this script is self-contained). Writes to a
// same-directory temp file and renameSync()s it over the target; rename(2) is atomic within a
// filesystem, so a reader ever only sees the OLD file or the complete NEW file, never a partial.
let _tmpCounter = 0;
function atomicWriteFileSync(path, data) {
  const tmp = join(dirname(path), `.${basename(path)}.tmp-${process.pid}-${_tmpCounter++}`);
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, path);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* temp may not exist; ignore */ }
    throw err;
  }
}

// Destination key -> base URL comes from the RUN's sequence JSON (sequence.destinations), built
// from your config (company.yml -> company.domain, offer.booking_link). NEVER hardcode a company
// URL here — this script is company-agnostic. See link-and-tracking.md for the key set.
export function buildUtmUrl(destMap, destKey, seqSlug, emailSlug) {
  const base = destMap && destMap[destKey];
  if (!base) throw new Error(`unknown dest: ${destKey}`);
  const u = new URL(base);
  u.searchParams.set("utm_source", "email");
  u.searchParams.set("utm_medium", "lifecycle");
  u.searchParams.set("utm_campaign", seqSlug);
  u.searchParams.set("utm_content", emailSlug);
  return u.toString();
}

// Resolve inline {{LINK:<key>}} tokens inside body/secondary HTML to a UTM-tagged URL for the
// canonical destination key. ESP merge tags (e.g. {{first_name | fallback: "..."}}) do NOT match
// this pattern and pass through untouched for the sending platform to fill. An unknown key throws
// (via buildUtmUrl), the same fail-fast as the primary CTA.
export function resolveLinks(destMap, html, seqSlug, emailSlug) {
  return String(html).replace(/\{\{LINK:(\w+)\}\}/g, (_m, key) =>
    buildUtmUrl(destMap, key, seqSlug, emailSlug));
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function fillShell(template, tokens) {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    if (!Object.prototype.hasOwnProperty.call(tokens, key)) {
      throw new Error(`missing token: ${key}`);
    }
    return String(tokens[key]);
  });
}

export function buildSequence(seqJson, template) {
  const seq = seqJson.sequence;
  const destMap = seq.destinations || {};
  return seqJson.emails.map((e) => {
    const ctaUrl = buildUtmUrl(destMap, e.cta.dest, seq.slug, e.slug);
    const tokens = {
      SUBJECT: escapeHtml(e.subject),
      PREHEADER: escapeHtml(e.preheader),
      HEADLINE: escapeHtml(e.headline),
      BODY_HTML: resolveLinks(destMap, e.bodyHtml || "", seq.slug, e.slug),
      CTA_LABEL: escapeHtml(e.cta.label),
      CTA_URL: ctaUrl,
      SECONDARY_HTML: resolveLinks(destMap, e.secondaryHtml || "", seq.slug, e.slug),
      BUSINESS_NAME: escapeHtml(seq.businessName ?? ""),
      BUSINESS_ADDRESS: escapeHtml(seq.businessAddress ?? ""),
      UNSUB_URL: "%%UNSUBSCRIBE_URL%%",
      VIEW_IN_BROWSER_URL: "%%VIEW_IN_BROWSER_URL%%",
    };
    return { slug: e.slug, html: fillShell(template, tokens) };
  });
}

// CLI: node build-emails.mjs <sequence.json> <shell.html> <outDir>
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [seqPath, shellPath, outDir] = process.argv.slice(2);
  if (!seqPath || !shellPath || !outDir) {
    console.error("usage: node build-emails.mjs <sequence.json> <shell.html> <outDir>");
    process.exit(1);
  }
  const seqJson = JSON.parse(readFileSync(seqPath, "utf8"));
  const template = readFileSync(shellPath, "utf8");
  const built = buildSequence(seqJson, template);
  mkdirSync(outDir, { recursive: true });
  for (const b of built) {
    atomicWriteFileSync(join(outDir, `${b.slug}.html`), b.html);
  }
  const preview = `<!doctype html><meta charset="utf8"><title>${seqJson.sequence.slug} preview</title>` +
    `<h1>${seqJson.sequence.slug} - ${built.length} emails</h1><ul>` +
    seqJson.emails.map((e) => `<li><a href="./${e.slug}.html">${e.slug}</a> - ${e.subject}</li>`).join("") +
    `</ul>`;
  atomicWriteFileSync(join(outDir, "preview.html"), preview);
  console.log(`built ${built.length} emails + preview into ${outDir}`);
}
