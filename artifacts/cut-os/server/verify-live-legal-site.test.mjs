import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { verifyLiveLegalSite } from "./verify-live-legal-site.mjs";

const origin = "https://legal.cutos.app";
const environment = {
  EXPO_PUBLIC_PRIVACY_POLICY_URL: `${origin}/privacy`,
  EXPO_PUBLIC_TERMS_URL: `${origin}/terms`,
  EXPO_PUBLIC_SUPPORT_URL: `${origin}/support`,
};
const stylesheet = "body { color: #171a18; }\n";

function page(resource) {
  return `<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="${origin}${resource}" />
    <link rel="stylesheet" href="/legal.css" />
  </head>
  <body data-publication-status="approved" data-counsel-approved="true">
    <main>Final public page.</main>
  </body>
</html>`;
}

function hash(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function fixture() {
  const contents = {
    "/privacy": page("/privacy"),
    "/terms": page("/terms"),
    "/support": page("/support"),
    "/legal.css": stylesheet,
  };
  return {
    contents,
    approvalRecord: {
      schemaVersion: 1,
      publicationStatus: "approved",
      approvalScope:
        "Exact rendered privacy, terms, support, and legal stylesheet contents recorded by SHA-256.",
      counselApproval: {
        approvedBy: "Qualified Counsel",
        approvedAt: "2026-08-03T12:00:00.000Z",
        evidenceReference: "LEGAL-APPROVAL-001",
      },
      rendering: { appName: "CUT OS", basePath: "" },
      sha256: Object.fromEntries(
        Object.entries(contents).map(([resource, content]) => [
          resource,
          hash(content),
        ]),
      ),
    },
  };
}

function response(url, content, options = {}) {
  const contentType =
    options.contentType ??
    (url.endsWith(".css")
      ? "text/css; charset=utf-8"
      : "text/html; charset=utf-8");
  return {
    status: options.status ?? 200,
    redirected: options.redirected ?? false,
    url: options.url ?? url,
    headers: { get: (name) => (name === "content-type" ? contentType : null) },
    text: async () => content,
  };
}

function passingFetch(contents) {
  return vi.fn(async (url) => {
    const resource = new URL(url).pathname;
    return response(url, contents[resource]);
  });
}

describe("live legal-site verifier", () => {
  it("accepts exact approved same-origin resources without redirects", async () => {
    const { contents, approvalRecord } = fixture();
    const fetchImpl = passingFetch(contents);

    await expect(
      verifyLiveLegalSite({ environment, approvalRecord, fetchImpl }),
    ).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    for (const [, options] of fetchImpl.mock.calls) {
      expect(options.redirect).toBe("manual");
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("rejects changed bytes and draft, counsel, noindex, and canonical tampering", async () => {
    const { contents, approvalRecord } = fixture();
    contents["/privacy"] = contents["/privacy"]
      .replace(
        'href="https://legal.cutos.app/privacy"',
        'href="https://legal.cutos.app/other"',
      )
      .replace(
        'data-publication-status="approved"',
        'data-publication-status="draft"',
      )
      .replace('data-counsel-approved="true"', 'data-counsel-approved="false"')
      .replace("<head>", '<head><meta name="robots" content="noindex" />');

    const issues = await verifyLiveLegalSite({
      environment,
      approvalRecord,
      fetchImpl: passingFetch(contents),
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        {
          resource: "/privacy",
          reason: "approved publication attribute is missing",
        },
        {
          resource: "/privacy",
          reason: "counsel approval attribute is missing",
        },
        { resource: "/privacy", reason: "noindex remains enabled" },
        {
          resource: "/privacy",
          reason: "a draft or release-blocking marker remains",
        },
        {
          resource: "/privacy",
          reason: "canonical URL does not exactly match",
        },
        {
          resource: "/privacy",
          reason: "content does not match approved SHA-256",
        },
      ]),
    );
  });

  it("rejects alternate origins and non-exact configured paths before fetching", async () => {
    const { approvalRecord } = fixture();
    const fetchImpl = vi.fn();
    const issues = await verifyLiveLegalSite({
      environment: {
        ...environment,
        EXPO_PUBLIC_TERMS_URL: `${origin}/terms/`,
        EXPO_PUBLIC_SUPPORT_URL: "https://support.cutos.app/support",
      },
      approvalRecord,
      fetchImpl,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        { resource: "/terms", reason: "configured URL path is not exact" },
        { resource: "/support", reason: "configured URL is not same-origin" },
      ]),
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports safe reasons for redirects, bad content types, HTTP failures, and request errors", async () => {
    const { contents, approvalRecord } = fixture();
    const fetchImpl = vi.fn(async (url) => {
      const resource = new URL(url).pathname;
      if (resource === "/privacy") {
        return response(url, "sensitive redirect body", { status: 302 });
      }
      if (resource === "/terms") {
        return response(url, "sensitive wrong type", {
          contentType: "text/plain",
        });
      }
      if (resource === "/support") {
        throw new Error("sensitive network detail");
      }
      return response(url, "sensitive outage body", { status: 503 });
    });

    const issues = await verifyLiveLegalSite({
      environment,
      approvalRecord,
      fetchImpl,
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        { resource: "/privacy", reason: "redirects are not allowed" },
        { resource: "/terms", reason: "content type must be text/html" },
        { resource: "/support", reason: "request failed" },
        { resource: "/legal.css", reason: "returned HTTP 503" },
      ]),
    );
    expect(JSON.stringify(issues)).not.toContain("sensitive");
    expect(contents["/privacy"]).not.toContain("sensitive");
  });

  it("times out even when an injected fetch never settles", async () => {
    const { approvalRecord } = fixture();
    const fetchImpl = vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            reject(new Error("sensitive timeout detail"));
          });
        }),
    );

    const issues = await verifyLiveLegalSite({
      environment,
      approvalRecord,
      fetchImpl,
      timeoutMs: 5,
    });
    expect(issues).toHaveLength(4);
    expect(issues.every(({ reason }) => reason === "request timed out")).toBe(
      true,
    );
    expect(JSON.stringify(issues)).not.toContain("sensitive");
  });
});
