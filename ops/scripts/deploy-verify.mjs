#!/usr/bin/env node

import { pathToFileURL } from "node:url";

// Read-only post-deploy checks. This script never deploys, authenticates, or
// mutates a remote service. Network requests are time- and size-bounded, and
// command output never includes URL credentials, query strings, fragments, or
// response bodies.

const REVIEW_SCHEMA = /"@type"\s*:\s*"(Review|Rating|AggregateRating)"/i;

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 1_000_000;

const MAX_TIMEOUT_MS = 60_000;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_CLI_ARGUMENTS = 256;
const MAX_ANCHORS = 100;
const MAX_IMAGES = 20;
const SURFACE_TYPES = new Set([
  "public-indexed",
  "internal",
  "go",
  "redirect",
  "json-health",
  "json-readiness",
  "auth-guard",
]);

export class DeployVerificationError extends Error {
  constructor(code) {
    super(`Deployment verification failed: ${code}`);
    this.name = "DeployVerificationError";
    this.code = code;
  }
}

function header(headers, name) {
  if (!headers) return "";
  if (typeof headers.get === "function") return headers.get(name) || "";
  return headers[name.toLowerCase()] || "";
}

function sanitizeText(value, maximumLength = 240) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ")
    .slice(0, maximumLength);
}

function escapeRegularExpression(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** Return a log-safe URL label, never credentials, query, or fragment. */
export function redactUrlForOutput(value, base) {
  try {
    const parsed = new URL(value, base);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    if (!base && String(value).startsWith("/")) {
      return sanitizeText(parsed.pathname);
    }
    return sanitizeText(parsed.href);
  } catch {
    return sanitizeText(String(value ?? "").split(/[?#]/u, 1)[0]);
  }
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase();
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(normalized);
}

function parseHttpUrl(value, options = {}) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new DeployVerificationError("invalid_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new DeployVerificationError("unsupported_protocol");
  }
  if (parsed.username || parsed.password) {
    throw new DeployVerificationError("url_credentials_not_allowed");
  }
  if (parsed.protocol === "http:") {
    if (options.allowLocalHttp !== true) {
      throw new DeployVerificationError("https_required");
    }
    if (!isLoopbackHostname(parsed.hostname)) {
      throw new DeployVerificationError("local_http_requires_loopback");
    }
  }
  return parsed;
}

function networkLimits(options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes =
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new DeployVerificationError("invalid_timeout");
  }
  if (
    !Number.isInteger(maxResponseBytes) ||
    maxResponseBytes <= 0 ||
    maxResponseBytes > MAX_RESPONSE_BYTES
  ) {
    throw new DeployVerificationError("invalid_response_limit");
  }
  return { timeoutMs, maxResponseBytes };
}

async function readBoundedBody(response, maxResponseBytes) {
  const declaredLength = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    await response.body?.cancel();
    throw new DeployVerificationError("response_too_large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let totalLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalLength += value.byteLength;
      if (totalLength > maxResponseBytes) {
        await reader.cancel();
        throw new DeployVerificationError("response_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchManual(url, options = {}) {
  const target = parseHttpUrl(url, options);
  const { timeoutMs, maxResponseBytes } = networkLimits(options);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await (options.fetchImpl ?? fetch)(target, {
      redirect: "manual",
      signal: controller.signal,
    });
    let body = "";
    if (options.readBody === false) {
      await response.body?.cancel();
    } else {
      body = await readBoundedBody(response, maxResponseBytes);
    }
    return { status: response.status, headers: response.headers, body };
  } catch (error) {
    if (error instanceof DeployVerificationError) throw error;
    if (controller.signal.aborted) {
      throw new DeployVerificationError("request_timeout");
    }
    throw new DeployVerificationError("network_error");
  } finally {
    clearTimeout(timeoutId);
  }
}

export function hasNoindex(headers) {
  return /(?:^|[\s,:;])noindex(?=$|[\s,;])/iu.test(
    header(headers, "x-robots-tag"),
  );
}

function robotsPatternMatches(pattern, target) {
  const endAnchored = pattern.endsWith("$");
  const source = (endAnchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map(escapeRegularExpression)
    .join(".*");
  return new RegExp(`^${source}${endAnchored ? "$" : ""}`, "u").test(target);
}

export function isDisallowed(robotsTxt, prefix) {
  if (!robotsTxt || !prefix) return false;
  const groups = [];
  let agents = [];
  let rules = [];
  const finishGroup = () => {
    if (agents.length > 0) groups.push({ agents, rules });
    agents = [];
    rules = [];
  };

  for (const rawLine of robotsTxt.split(/\r?\n/u)) {
    const line = rawLine.replace(/#.*$/u, "").trim();
    if (!line) {
      if (rules.length > 0) finishGroup();
      continue;
    }
    const match = line.match(/^([^:]+):(.*)$/u);
    if (!match) continue;
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (rules.length > 0) finishGroup();
      agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && agents.length) {
      rules.push({ field, pattern: value });
    }
  }
  finishGroup();

  let winningRule = null;
  for (const group of groups.filter(({ agents: names }) =>
    names.includes("*"),
  )) {
    for (const rule of group.rules) {
      if (!rule.pattern || !robotsPatternMatches(rule.pattern, prefix))
        continue;
      const specificity = rule.pattern.replace(/[*$]/gu, "").length;
      if (
        winningRule === null ||
        specificity > winningRule.specificity ||
        (specificity === winningRule.specificity && rule.field === "allow")
      ) {
        winningRule = { ...rule, specificity };
      }
    }
  }
  return winningRule?.field === "disallow";
}

function decodeXmlText(value) {
  return value
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&apos;/giu, "'");
}

export function inSitemap(sitemapXml, urlOrPath) {
  if (!sitemapXml || !urlOrPath || !/<urlset(?:\s|>)/iu.test(sitemapXml)) {
    return false;
  }
  const locations = Array.from(
    sitemapXml.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/giu),
    (match) => decodeXmlText(match[1].trim()),
  );
  return locations.some((location) => {
    try {
      return new URL(location).href === new URL(urlOrPath).href;
    } catch {
      return location === urlOrPath;
    }
  });
}

export function hasReviewSchema(body) {
  return REVIEW_SCHEMA.test(body || "");
}

export function selfCanonical(body, url) {
  if (!body || !url) return false;
  const canonicalTargets = [];
  for (const match of body.matchAll(/<link\b[^>]*>/giu)) {
    const attributes = new Map();
    for (const attribute of match[0].matchAll(
      /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gu,
    )) {
      attributes.set(
        attribute[1].toLowerCase(),
        attribute[2] ?? attribute[3] ?? attribute[4] ?? "",
      );
    }
    const relTokens = (attributes.get("rel") ?? "")
      .toLowerCase()
      .split(/\s+/u)
      .filter(Boolean);
    if (relTokens.includes("canonical")) {
      canonicalTargets.push(attributes.get("href"));
    }
  }
  if (canonicalTargets.length !== 1 || !canonicalTargets[0]) return false;
  return resolvedUrl(canonicalTargets[0], url) === resolvedUrl(url);
}

export function hasAnchor(body, id) {
  return Boolean(
    body && new RegExp(`id=["']${escapeRegularExpression(id)}["']`).test(body),
  );
}

function hasJsonContentType(headers) {
  return /^application\/json(?:\s*;|$)/iu.test(header(headers, "content-type"));
}

function hasOkJsonBody(body) {
  try {
    const parsed = JSON.parse(body);
    return parsed && typeof parsed === "object" && parsed.status === "ok";
  } catch {
    return false;
  }
}

function resolvedUrl(value, base) {
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

function validateSurfaceExpectation(surfaceType, expect) {
  if (expect.anchors !== undefined) {
    if (!Array.isArray(expect.anchors) || expect.anchors.length > MAX_ANCHORS) {
      throw new DeployVerificationError("too_many_checks");
    }
  }
  if (expect.images !== undefined) {
    if (!Array.isArray(expect.images) || expect.images.length > MAX_IMAGES) {
      throw new DeployVerificationError("too_many_checks");
    }
  }
  if (surfaceType === "redirect") {
    if (
      !Number.isInteger(expect.redirectStatus) ||
      expect.redirectStatus < 300 ||
      expect.redirectStatus > 399 ||
      typeof expect.redirectTo !== "string" ||
      expect.redirectTo.length === 0
    ) {
      throw new DeployVerificationError("invalid_redirect_expectation");
    }
  }
}

export function evaluateSurface(input) {
  const {
    surfaceType,
    status,
    headers,
    body = "",
    robotsTxt = "",
    sitemapXml = "",
    expect = {},
  } = input;
  const checks = [];
  const add = (name, pass, detail = "") =>
    checks.push({ name, pass, detail: sanitizeText(detail) });
  const path = expect.path || expect.url || "";
  validateSurfaceExpectation(surfaceType, expect);

  switch (surfaceType) {
    case "public-indexed":
      add("HTTP 200", status === 200, `status=${status}`);
      add(
        "self-canonical present",
        selfCanonical(body, expect.url || ""),
        redactUrlForOutput(expect.url || ""),
      );
      add("listed in sitemap", inSitemap(sitemapXml, expect.url || path), path);
      add("no Review/Rating JSON-LD", !hasReviewSchema(body));
      for (const anchor of expect.anchors || []) {
        add(`anchor #${sanitizeText(anchor, 80)}`, hasAnchor(body, anchor));
      }
      break;
    case "internal":
    case "go":
      add("HTTP 200", status === 200, `status=${status}`);
      add("X-Robots-Tag noindex", hasNoindex(headers));
      add(
        "disallowed in robots.txt",
        isDisallowed(robotsTxt, expect.robotsPrefix || path),
      );
      add("NOT in sitemap", !inSitemap(sitemapXml, expect.url || path), path);
      break;
    case "redirect": {
      const location = header(headers, "location");
      const actualTarget = resolvedUrl(location, expect.url);
      const expectedTarget = resolvedUrl(expect.redirectTo, expect.url);
      add(
        `status ${expect.redirectStatus}`,
        status === expect.redirectStatus,
        `status=${status}`,
      );
      add(
        "Location matches target",
        actualTarget !== null && actualTarget === expectedTarget,
        redactUrlForOutput(location, expect.url),
      );
      break;
    }
    case "json-health":
    case "json-readiness":
      add("HTTP 200", status === 200, `status=${status}`);
      add("JSON content type", hasJsonContentType(headers));
      add("status is ok", hasOkJsonBody(body));
      if (surfaceType === "json-readiness") {
        add(
          "Cache-Control no-store",
          /(?:^|,)\s*no-store(?:\s*(?:,|$))/iu.test(
            header(headers, "cache-control"),
          ),
        );
      }
      break;
    case "auth-guard":
      add("HTTP 401", status === 401, `status=${status}`);
      add("JSON content type", hasJsonContentType(headers));
      break;
    default:
      throw new DeployVerificationError("unknown_surface_type");
  }
  return { checks, allPass: checks.every((check) => check.pass) };
}

/** Verify one URL without logging its body or potentially sensitive URL parts. */
export async function verifyUrl(url, surfaceType, expect = {}, options = {}) {
  if (!SURFACE_TYPES.has(surfaceType)) {
    throw new DeployVerificationError("unknown_surface_type");
  }
  validateSurfaceExpectation(surfaceType, expect);
  const target = parseHttpUrl(url, options);
  const { status, headers, body } = await fetchManual(target, options);
  let robotsTxt = "";
  let sitemapXml = "";

  if (["public-indexed", "internal", "go"].includes(surfaceType)) {
    try {
      robotsTxt = (
        await fetchManual(new URL("/robots.txt", target).href, options)
      ).body;
    } catch {
      // The evaluator reports the resulting robots/sitemap check as failed.
    }
    try {
      sitemapXml = (
        await fetchManual(new URL("/sitemap.xml", target).href, options)
      ).body;
    } catch {
      // The evaluator reports the resulting robots/sitemap check as failed.
    }
  }

  const result = evaluateSurface({
    surfaceType,
    status,
    headers,
    body,
    robotsTxt,
    sitemapXml,
    expect: { url: target.href, path: target.pathname, ...expect },
  });

  for (const imagePath of expect.images || []) {
    let imageStatus = 0;
    try {
      imageStatus = (
        await fetchManual(new URL(imagePath, target).href, {
          ...options,
          readBody: false,
        })
      ).status;
    } catch {
      // A stable status=0 is enough; never print the network error or body.
    }
    result.checks.push({
      name: `image 200 ${redactUrlForOutput(imagePath, target)}`,
      pass: imageStatus === 200,
      detail: `status=${imageStatus}`,
    });
  }
  result.allPass = result.checks.every((check) => check.pass);
  return result;
}

function parsePositiveInteger(rawValue, code) {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new DeployVerificationError(code);
  }
  return value;
}

function optionValue(argumentsList, index) {
  const value = argumentsList[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new DeployVerificationError("missing_option_value");
  }
  return value;
}

function parseArgv(argv) {
  if (argv.length > MAX_CLI_ARGUMENTS) {
    throw new DeployVerificationError("too_many_arguments");
  }
  const [url, surfaceType, ...rest] = argv;
  const expect = { anchors: [] };
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === "--anchor") {
      expect.anchors.push(optionValue(rest, index));
      index += 1;
    } else if (rest[index] === "--image") {
      (expect.images ||= []).push(optionValue(rest, index));
      index += 1;
    } else if (rest[index] === "--redirect-to") {
      expect.redirectTo = optionValue(rest, index);
      index += 1;
    } else if (rest[index] === "--redirect-status") {
      expect.redirectStatus = Number(optionValue(rest, index));
      index += 1;
    } else if (rest[index] === "--robots-prefix") {
      expect.robotsPrefix = optionValue(rest, index);
      index += 1;
    } else if (rest[index] === "--timeout-ms") {
      options.timeoutMs = parsePositiveInteger(
        optionValue(rest, index),
        "invalid_timeout",
      );
      index += 1;
    } else if (rest[index] === "--max-response-bytes") {
      options.maxResponseBytes = parsePositiveInteger(
        optionValue(rest, index),
        "invalid_response_limit",
      );
      index += 1;
    } else if (rest[index] === "--allow-local-http") {
      options.allowLocalHttp = true;
    } else {
      throw new DeployVerificationError("unknown_argument");
    }
  }
  validateSurfaceExpectation(surfaceType, expect);
  return { url, surfaceType, expect, options };
}

function usage() {
  return [
    "usage: node deploy-verify.mjs <url> <surfaceType> [options]",
    "surfaceType: public-indexed | internal | go | redirect | json-health | json-readiness | auth-guard",
    "options: --anchor id --image path --redirect-to path --redirect-status N --robots-prefix path --timeout-ms N --max-response-bytes N --allow-local-http",
    "--allow-local-http permits HTTP only for localhost/loopback development tests; staging and production remain HTTPS-only",
  ].join("\n");
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    const { url, surfaceType, expect, options } = parseArgv(
      process.argv.slice(2),
    );
    if (!url || !surfaceType) {
      console.error(usage());
      process.exitCode = 2;
    } else {
      const result = await verifyUrl(url, surfaceType, expect, options);
      for (const check of result.checks) {
        console.log(
          `${check.pass ? "PASS" : "FAIL"}  ${check.name}${check.detail ? `  (${check.detail})` : ""}`,
        );
      }
      console.log(
        `\n${result.allPass ? "ALL PASS" : "SOME FAILED"}  ${redactUrlForOutput(url)} [${sanitizeText(surfaceType, 40)}]`,
      );
      process.exitCode = result.allPass ? 0 : 1;
    }
  } catch (error) {
    const code =
      error instanceof DeployVerificationError
        ? error.code
        : "verification_failed";
    console.error(
      `FAIL  deployment verification could not complete  (${code})`,
    );
    process.exitCode = 1;
  }
}
