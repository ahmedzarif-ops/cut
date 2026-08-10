#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  APPROVED_RESOURCE_NAMES,
  findBlockedReleaseCopy,
  normalizeBasePath,
} = require("./legal-publication-gate.js");

const directory = dirname(fileURLToPath(import.meta.url));
const approvalRecordPath = join(
  directory,
  "templates",
  "legal-publication-approval.json",
);
const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_LIVE_LEGAL_RESOURCE_BYTES = 1_000_000;
const RESPONSE_BODY_UNREADABLE = Symbol("response-body-unreadable");
const RESPONSE_TOO_LARGE = Symbol("response-too-large");

const PAGE_RESOURCES = [
  {
    resource: "/privacy",
    environmentName: "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  },
  { resource: "/terms", environmentName: "EXPO_PUBLIC_TERMS_URL" },
  { resource: "/support", environmentName: "EXPO_PUBLIC_SUPPORT_URL" },
];

function issue(resource, reason) {
  return { resource, reason };
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function getAttribute(tag, name) {
  const match = tag.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "iu"),
  );
  return match?.[2] ?? null;
}

function getLinkHrefs(html, relation) {
  const hrefs = [];
  for (const tag of html.match(/<link\b[^>]*>/giu) ?? []) {
    const rel = getAttribute(tag, "rel");
    if (rel?.toLowerCase().split(/\s+/u).filter(Boolean).includes(relation)) {
      hrefs.push(getAttribute(tag, "href"));
    }
  }
  return hrefs;
}

function inspectHtml(resource, html, expectedUrl, stylesheetUrl) {
  const issues = [];
  const bodyTag = html.match(/<body\b[^>]*>/iu)?.[0];

  if (
    !bodyTag ||
    !/\bdata-publication-status\s*=\s*["']approved["']/iu.test(bodyTag)
  ) {
    issues.push(issue(resource, "approved publication attribute is missing"));
  }
  const counselApproved =
    bodyTag && /\bdata-counsel-approved\s*=\s*["']true["']/iu.test(bodyTag);
  const ownerDeferred =
    bodyTag &&
    /\bdata-counsel-approved\s*=\s*["']false["']/iu.test(bodyTag) &&
    /\bdata-owner-risk-accepted\s*=\s*["']true["']/iu.test(bodyTag) &&
    /\bdata-professional-review-status\s*=\s*["']owner-deferred-post-launch["']/iu.test(
      bodyTag,
    );
  if (!counselApproved && !ownerDeferred) {
    issues.push(
      issue(
        resource,
        "neither counsel approval nor the owner-deferred review attributes are present",
      ),
    );
  }
  if (/\bnoindex\b/iu.test(html)) {
    issues.push(issue(resource, "noindex remains enabled"));
  }
  if (
    /\bdata-(?:draft-banner|blocker)\b/iu.test(html) ||
    /\bdata-publication-status\s*=\s*["']draft["']/iu.test(html) ||
    /\{\{[A-Z0-9_]+\}\}/u.test(html) ||
    findBlockedReleaseCopy(html).length > 0
  ) {
    issues.push(issue(resource, "a draft or release-blocking marker remains"));
  }

  const canonicalHrefs = getLinkHrefs(html, "canonical");
  if (canonicalHrefs.length !== 1 || canonicalHrefs[0] !== expectedUrl) {
    issues.push(issue(resource, "canonical URL does not exactly match"));
  }

  const stylesheetHrefs = getLinkHrefs(html, "stylesheet");
  let resolvedStylesheet = null;
  if (stylesheetHrefs.length === 1 && stylesheetHrefs[0]) {
    try {
      resolvedStylesheet = new URL(stylesheetHrefs[0], expectedUrl).href;
    } catch {
      resolvedStylesheet = null;
    }
  }
  if (stylesheetHrefs.length !== 1 || resolvedStylesheet !== stylesheetUrl) {
    issues.push(issue(resource, "stylesheet URL does not exactly match"));
  }

  return issues;
}

function inspectApprovalRecord(approvalRecord) {
  const issues = [];
  if (!approvalRecord || typeof approvalRecord !== "object") {
    return {
      basePath: null,
      issues: [issue("approval record", "is missing or invalid")],
    };
  }
  if (approvalRecord.publicationStatus !== "approved") {
    issues.push(issue("approval record", "publication status is not approved"));
  }

  const basePath = approvalRecord.rendering?.basePath;
  if (
    typeof basePath !== "string" ||
    normalizeBasePath(basePath) !== basePath
  ) {
    issues.push(issue("approval record", "rendered base path is invalid"));
  }

  for (const resource of APPROVED_RESOURCE_NAMES) {
    if (!/^[a-f0-9]{64}$/u.test(approvalRecord.sha256?.[resource] ?? "")) {
      issues.push(issue(resource, "approved SHA-256 is missing or invalid"));
    }
  }

  return {
    basePath: typeof basePath === "string" ? basePath : null,
    issues,
  };
}

function parseConfiguredPageUrls(environment, basePath) {
  const issues = [];
  const pages = [];

  for (const definition of PAGE_RESOURCES) {
    const value = environment[definition.environmentName]?.trim();
    if (!value) {
      issues.push(issue(definition.resource, "configured URL is missing"));
      continue;
    }

    let url;
    try {
      url = new URL(value);
    } catch {
      issues.push(issue(definition.resource, "configured URL is invalid"));
      continue;
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      issues.push(
        issue(
          definition.resource,
          "configured URL must be HTTPS without credentials, query, or fragment",
        ),
      );
      continue;
    }
    pages.push({ ...definition, url });
  }

  if (issues.length > 0) return { issues, pages: [], stylesheet: null };

  const origin = pages[0].url.origin;
  for (const page of pages) {
    const expectedPath = `${basePath}${page.resource}`;
    const expectedUrl = `${origin}${expectedPath}`;
    if (page.url.origin !== origin) {
      issues.push(issue(page.resource, "configured URL is not same-origin"));
    }
    if (page.url.pathname !== expectedPath) {
      issues.push(issue(page.resource, "configured URL path is not exact"));
    }
    page.expectedUrl = expectedUrl;
  }

  return {
    issues,
    pages,
    stylesheet: {
      resource: "/legal.css",
      expectedUrl: `${origin}${basePath}/legal.css`,
    },
  };
}

function contentLength(response) {
  const rawValue = response.headers?.get?.("content-length");
  if (typeof rawValue !== "string" || !/^\d+$/u.test(rawValue.trim())) {
    return null;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

async function abortResponseBody(response, controller, reason) {
  if (!controller.signal.aborted) controller.abort(reason);
  try {
    await response.body?.cancel?.(reason);
  } catch {
    // Aborting the fetch may close the body before explicit cancellation.
  }
}

async function readBoundedBody(response, controller) {
  const declaredLength = contentLength(response);
  if (
    declaredLength !== null &&
    declaredLength > MAX_LIVE_LEGAL_RESOURCE_BYTES
  ) {
    await abortResponseBody(response, controller, RESPONSE_TOO_LARGE);
    throw RESPONSE_TOO_LARGE;
  }

  if (response.body === null) return "";
  if (!response.body || typeof response.body.getReader !== "function") {
    throw RESPONSE_BODY_UNREADABLE;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        await reader.cancel(RESPONSE_BODY_UNREADABLE).catch(() => undefined);
        throw RESPONSE_BODY_UNREADABLE;
      }
      totalBytes += value.byteLength;
      if (totalBytes > MAX_LIVE_LEGAL_RESOURCE_BYTES) {
        if (!controller.signal.aborted) controller.abort(RESPONSE_TOO_LARGE);
        await reader.cancel(RESPONSE_TOO_LARGE).catch(() => undefined);
        throw RESPONSE_TOO_LARGE;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function fetchResource(
  fetchImpl,
  { resource, expectedUrl, expectedContentType },
  timeoutMs,
) {
  const controller = new AbortController();
  const timeoutToken = Symbol("timeout");
  let timeoutId;

  const operation = (async () => {
    const response = await fetchImpl(expectedUrl, {
      redirect: "manual",
      signal: controller.signal,
    });
    const issues = [];

    if (!response || typeof response.status !== "number") {
      return {
        issues: [issue(resource, "request returned an invalid response")],
      };
    }
    if (response.status >= 300 && response.status < 400) {
      issues.push(issue(resource, "redirects are not allowed"));
    } else if (response.status !== 200) {
      issues.push(issue(resource, `returned HTTP ${response.status}`));
    }
    if (
      response.redirected === true ||
      (response.url && response.url !== expectedUrl)
    ) {
      issues.push(issue(resource, "redirects are not allowed"));
    }

    const contentType =
      response.headers
        ?.get?.("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase() ?? "";
    if (contentType !== expectedContentType) {
      issues.push(
        issue(resource, `content type must be ${expectedContentType}`),
      );
    }
    if (issues.length > 0) {
      await abortResponseBody(response, controller, issues);
      return { issues };
    }
    return {
      issues: [],
      content: await readBoundedBody(response, controller),
    };
  })();

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort(timeoutToken);
      reject(timeoutToken);
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } catch (error) {
    const abortReason = controller.signal.reason;
    return {
      issues: [
        issue(
          resource,
          error === RESPONSE_TOO_LARGE || abortReason === RESPONSE_TOO_LARGE
            ? "response body exceeds safety limit"
            : error === RESPONSE_BODY_UNREADABLE
              ? "response body could not be read"
              : error === timeoutToken || abortReason === timeoutToken
                ? "request timed out"
                : "request failed",
        ),
      ],
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function verifyLiveLegalSite(options = {}) {
  const environment = options.environment ?? process.env;
  const approvalRecord = options.approvalRecord;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const approval = inspectApprovalRecord(approvalRecord);

  if (approval.issues.length > 0 || approval.basePath === null) {
    return approval.issues;
  }
  if (typeof fetchImpl !== "function") {
    return [issue("live verifier", "fetch is unavailable")];
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return [issue("live verifier", "timeout is invalid")];
  }

  const topology = parseConfiguredPageUrls(environment, approval.basePath);
  if (topology.issues.length > 0 || !topology.stylesheet) {
    return topology.issues;
  }

  const resources = [
    ...topology.pages.map((page) => ({
      resource: page.resource,
      expectedUrl: page.expectedUrl,
      expectedContentType: "text/html",
    })),
    {
      ...topology.stylesheet,
      expectedContentType: "text/css",
    },
  ];
  const results = await Promise.all(
    resources.map((resource) => fetchResource(fetchImpl, resource, timeoutMs)),
  );
  const issues = results.flatMap((result) => result.issues);

  for (let index = 0; index < resources.length; index += 1) {
    const resource = resources[index];
    const content = results[index].content;
    if (typeof content !== "string") continue;

    if (resource.expectedContentType === "text/html") {
      issues.push(
        ...inspectHtml(
          resource.resource,
          content,
          resource.expectedUrl,
          topology.stylesheet.expectedUrl,
        ),
      );
    }
    if (sha256(content) !== approvalRecord.sha256[resource.resource]) {
      issues.push(
        issue(resource.resource, "content does not match approved SHA-256"),
      );
    }
  }

  return issues;
}

function printIssues(issues) {
  console.error(
    `Live legal-site verification failed (${issues.length} issue${issues.length === 1 ? "" : "s"}):`,
  );
  for (const { resource, reason } of issues) {
    console.error(`- ${resource}: ${reason}`);
  }
}

async function run() {
  let approvalRecord;
  try {
    approvalRecord = JSON.parse(await readFile(approvalRecordPath, "utf8"));
  } catch {
    printIssues([issue("approval record", "could not be read as valid JSON")]);
    return 1;
  }

  const issues = await verifyLiveLegalSite({
    environment: process.env,
    approvalRecord,
  });
  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  console.log(
    "Live legal-site verification passed for /privacy, /terms, /support, and /legal.css.",
  );
  return 0;
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  process.exitCode = await run();
}
