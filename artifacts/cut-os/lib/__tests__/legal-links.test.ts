import { describe, expect, it, vi } from "vitest";

import {
  openLegalLinkSafely,
  parsePublicHttpsUrl,
  resolveLegalLinkConfiguration,
  selectLegalLinks,
} from "../legal-links";

describe("parsePublicHttpsUrl", () => {
  it("distinguishes missing values from invalid configuration", () => {
    expect(parsePublicHttpsUrl(undefined)).toEqual({ status: "missing" });
    expect(parsePublicHttpsUrl("   ")).toEqual({ status: "missing" });
    expect(parsePublicHttpsUrl("not a URL")).toEqual({ status: "invalid" });
  });

  it("accepts and normalizes an absolute HTTPS URL", () => {
    expect(
      parsePublicHttpsUrl("  https://example.com/privacy?lang=en#summary  "),
    ).toEqual({
      status: "valid",
      url: "https://example.com/privacy?lang=en#summary",
    });
  });

  it("rejects non-HTTPS and protocol-relative destinations", () => {
    expect(parsePublicHttpsUrl("http://example.com/privacy")).toEqual({
      status: "invalid",
    });
    expect(parsePublicHttpsUrl("//example.com/privacy")).toEqual({
      status: "invalid",
    });
  });

  it("rejects URLs with embedded credentials", () => {
    expect(
      parsePublicHttpsUrl("https://user:secret@example.com/privacy"),
    ).toEqual({ status: "invalid" });
  });

  it.each([
    "https://localhost/privacy",
    "https://localhost./privacy",
    "https://127.0.0.1/privacy",
    "https://10.0.0.1/privacy",
    "https://[fe80::1]/privacy",
    "https://policy.internal/privacy",
    "https://policy.example/privacy",
    "https://policy.onion/privacy",
    "https://router.home.arpa/privacy",
    "https://bad..real-domain.com/privacy",
    "https://-bad.real-domain.com/privacy",
    "https://bad_name.real-domain.com/privacy",
  ])("rejects a non-public destination: %s", (url) => {
    expect(parsePublicHttpsUrl(url)).toEqual({ status: "invalid" });
  });
});

describe("resolveLegalLinkConfiguration", () => {
  it("returns only safe configured links in stable display order", () => {
    const configuration = resolveLegalLinkConfiguration({
      privacyPolicy: "https://example.com/privacy",
      terms: "https://example.com/terms",
      support: "https://example.com/support",
    });

    expect(configuration.links.map(({ id, label }) => ({ id, label }))).toEqual(
      [
        { id: "privacyPolicy", label: "Privacy Policy" },
        { id: "terms", label: "Terms of Use" },
        { id: "support", label: "Support" },
      ],
    );
    expect(configuration.unavailable).toEqual([]);
  });

  it("fails closed without exposing missing or invalid values as links", () => {
    const configuration = resolveLegalLinkConfiguration({
      privacyPolicy: "https://example.com/privacy",
      terms: "",
      support: "http://example.com/support",
    });

    expect(configuration.links.map((link) => link.id)).toEqual([
      "privacyPolicy",
    ]);
    expect(configuration.unavailable).toEqual([
      {
        id: "terms",
        environmentName: "EXPO_PUBLIC_TERMS_URL",
        reason: "missing",
      },
      {
        id: "support",
        environmentName: "EXPO_PUBLIC_SUPPORT_URL",
        reason: "invalid",
      },
    ]);
  });

  it("selects a safe subset without changing canonical order", () => {
    const configuration = resolveLegalLinkConfiguration({
      privacyPolicy: "https://example.com/privacy",
      terms: "https://example.com/terms",
      support: "https://example.com/support",
    });

    expect(
      selectLegalLinks(configuration, ["support", "privacyPolicy"]).map(
        (link) => link.id,
      ),
    ).toEqual(["privacyPolicy", "support"]);
  });
});

describe("openLegalLinkSafely", () => {
  const link = resolveLegalLinkConfiguration({
    privacyPolicy: "https://example.com/privacy",
  }).links[0]!;

  it("opens the validated destination", async () => {
    const opener = vi.fn(async () => ({ type: "opened" }));

    await expect(openLegalLinkSafely(link, opener)).resolves.toBe(true);
    expect(opener).toHaveBeenCalledWith("https://example.com/privacy");
  });

  it("turns browser rejection into a handled failure", async () => {
    const opener = vi.fn(async () => {
      throw new Error("offline");
    });

    await expect(openLegalLinkSafely(link, opener)).resolves.toBe(false);
  });
});
