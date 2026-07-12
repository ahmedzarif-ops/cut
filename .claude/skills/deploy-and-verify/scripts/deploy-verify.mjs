// Per-surface live-verify smoke battery for production deploys. Zero-dep ESM.
// Pure evaluator (testable) + a thin fetch shell. Deploy stays owner-gated; this VERIFIES, never deploys.

const REVIEW_SCHEMA = /"@type"\s*:\s*"(Review|Rating|AggregateRating)"/i;

function header(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name.toLowerCase()] || "";
}

export function hasNoindex(headers) {
  return /noindex/i.test(header(headers, "x-robots-tag"));
}
export function isDisallowed(robotsTxt, prefix) {
  if (!robotsTxt || !prefix) return false;
  return robotsTxt
    .split(/\r?\n/)
    .filter((l) => /^\s*Disallow\s*:/i.test(l))
    .map((l) => l.replace(/^\s*Disallow\s*:/i, "").trim())
    .some((p) => p && prefix.startsWith(p));
}
export function inSitemap(sitemapXml, urlOrPath) {
  return !!sitemapXml && !!urlOrPath && sitemapXml.includes(urlOrPath);
}
export function hasReviewSchema(body) {
  return REVIEW_SCHEMA.test(body || "");
}
export function selfCanonical(body, url) {
  if (!body || !url) return false;
  const m = body.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  return !!m && m[0].includes(url);
}
export function hasAnchor(body, id) {
  return !!body && new RegExp(`id=["']${id}["']`).test(body);
}

export function evaluateSurface(input) {
  const { surfaceType, status, headers, body = "", robotsTxt = "", sitemapXml = "", expect = {} } = input;
  const checks = [];
  const add = (name, pass, detail = "") => checks.push({ name, pass, detail });
  const path = expect.path || expect.url || "";
  switch (surfaceType) {
    case "public-indexed":
      add("HTTP 200", status === 200, `status=${status}`);
      add("self-canonical present", selfCanonical(body, expect.url || ""), expect.url || "");
      add("listed in sitemap", inSitemap(sitemapXml, path), path);
      add("no Review/Rating JSON-LD", !hasReviewSchema(body));
      for (const a of expect.anchors || []) add(`anchor #${a}`, hasAnchor(body, a));
      break;
    case "internal":
    case "go":
      add("HTTP 200", status === 200, `status=${status}`);
      add("X-Robots-Tag noindex", hasNoindex(headers));
      add("disallowed in robots.txt", isDisallowed(robotsTxt, expect.robotsPrefix || path));
      add("NOT in sitemap", !inSitemap(sitemapXml, path), path);
      break;
    case "redirect":
      add(`status ${expect.redirectStatus}`, status === expect.redirectStatus, `status=${status}`);
      add("Location matches target", header(headers, "location").includes(expect.redirectTo || ""), header(headers, "location"));
      break;
    default:
      throw new Error(`Unknown surfaceType: ${surfaceType}`);
  }
  return { checks, allPass: checks.every((c) => c.pass) };
}

// --- network shell (not unit-tested; exercised live) ---
async function fetchManual(url) {
  const res = await fetch(url, { redirect: "manual" });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body };
}
export async function verifyUrl(url, surfaceType, expect = {}) {
  const u = new URL(url);
  const { status, headers, body } = await fetchManual(url);
  let robotsTxt = "", sitemapXml = "";
  if (surfaceType !== "redirect") {
    try { robotsTxt = (await fetchManual(u.origin + "/robots.txt")).body; } catch {}
    try { sitemapXml = (await fetchManual(u.origin + "/sitemap.xml")).body; } catch {}
  }
  const result = evaluateSurface({ surfaceType, status, headers, body, robotsTxt, sitemapXml, expect: { url, path: u.pathname, ...expect } });
  // image-200 checks (network — shell-only, mirrors the "all images 200" battery step).
  for (const img of expect.images || []) {
    let st = 0;
    try { st = (await fetch(new URL(img, u.origin).href, { redirect: "manual" })).status; } catch {}
    result.checks.push({ name: `image 200 ${img}`, pass: st === 200, detail: `status=${st}` });
  }
  result.allPass = result.checks.every((c) => c.pass);
  return result;
}

// --- CLI: node deploy-verify.mjs <url> <surfaceType> [--anchor id]... [--redirect-to X] [--redirect-status N] ---
function parseArgv(argv) {
  const [url, surfaceType, ...rest] = argv;
  const expect = { anchors: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--anchor") expect.anchors.push(rest[++i]);
    else if (rest[i] === "--image") (expect.images ||= []).push(rest[++i]);
    else if (rest[i] === "--redirect-to") expect.redirectTo = rest[++i];
    else if (rest[i] === "--redirect-status") expect.redirectStatus = Number(rest[++i]);
    else if (rest[i] === "--robots-prefix") expect.robotsPrefix = rest[++i];
  }
  return { url, surfaceType, expect };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url, surfaceType, expect } = parseArgv(process.argv.slice(2));
  if (!url || !surfaceType) {
    console.error("usage: node deploy-verify.mjs <url> <public-indexed|internal|go|redirect> [--anchor id] [--redirect-to path] [--redirect-status N]");
    process.exit(2);
  }
  const result = await verifyUrl(url, surfaceType, expect);
  for (const c of result.checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
  console.log(`\n${result.allPass ? "ALL PASS" : "SOME FAILED"}  ${url} [${surfaceType}]`);
  process.exit(result.allPass ? 0 : 1);
}
