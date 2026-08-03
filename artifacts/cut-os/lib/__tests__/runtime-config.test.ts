import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "../runtime-config";

function publishableKey(type: "live" | "test"): string {
  const encoded = Buffer.from("clerk.example.com$")
    .toString("base64")
    .replace(/=+$/, "");
  return `pk_${type}_${encoded}`;
}

describe("runtime configuration", () => {
  it("normalizes a valid API hostname and canonical Clerk proxy", () => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: "API.Example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("live"),
        EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.example.com/api/__clerk/",
      }),
    ).toEqual({
      ok: true,
      config: {
        apiBaseUrl: "https://api.example.com",
        clerkPublishableKey: publishableKey("live"),
        clerkProxyUrl: "https://api.example.com/api/__clerk",
      },
    });
  });

  it("fails closed when required values are absent", () => {
    expect(resolveRuntimeConfig({})).toEqual({
      ok: false,
      issues: ["api_domain_missing", "clerk_publishable_key_missing"],
    });
  });

  it("accepts RevenueCat public iOS and Test Store SDK keys", () => {
    for (const key of ["appl_PublicIosKey1234", "test_PublicTestKey1234"]) {
      expect(
        resolveRuntimeConfig({
          EXPO_PUBLIC_DOMAIN: "api.example.com",
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
          EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: key,
        }),
      ).toMatchObject({
        ok: true,
        config: { revenueCatIosApiKey: key },
      });
    }
  });

  it.each([
    "sk_live_secret",
    "appl_too-short",
    "goog_PublicAndroidKey1234",
    "appl_Public Key1234",
  ])("rejects a malformed or non-iOS RevenueCat key: %s", (key) => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: "api.example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
        EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: key,
      }),
    ).toMatchObject({
      ok: false,
      issues: ["revenuecat_ios_api_key_invalid"],
    });
  });

  it.each([
    "https://api.example.com",
    "api.example.com/path",
    "user@api.example.com",
    "api.example.com?region=us",
    "api.example.com:8443",
    "api.example.com.",
    "bad..real-domain.com",
    "-bad.real-domain.com",
    "bad_name.real-domain.com",
  ])("rejects a non-hostname API domain: %s", (domain) => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: domain,
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
      }),
    ).toMatchObject({ ok: false, issues: ["api_domain_invalid"] });
  });

  it.each(["api.example", "8.8.8.8", "api.onion", "router.home.arpa"])(
    "rejects a non-public production hostname when a live key is embedded: %s",
    (domain) => {
      expect(
        resolveRuntimeConfig({
          EXPO_PUBLIC_DOMAIN: domain,
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("live"),
          EXPO_PUBLIC_CLERK_PROXY_URL: `https://${domain}/api/__clerk`,
        }),
      ).toMatchObject({ ok: false, issues: ["api_domain_invalid"] });
    },
  );

  it("rejects secret or malformed Clerk keys", () => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: "api.example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "sk_live_never_embed_this",
      }),
    ).toMatchObject({
      ok: false,
      issues: ["clerk_publishable_key_invalid"],
    });
  });

  it("rejects a prefixed value that is not a real Clerk publishable key", () => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: "api.example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_public_value",
        EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.example.com/api/__clerk",
      }),
    ).toMatchObject({
      ok: false,
      issues: ["clerk_publishable_key_invalid"],
    });
  });

  it("requires the canonical proxy whenever a live Clerk key is embedded", () => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: "api.example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("live"),
      }),
    ).toMatchObject({ ok: false, issues: ["clerk_proxy_url_missing"] });
  });

  it.each([
    "http://api.example.com/__clerk",
    "https://user:pass@api.example.com/__clerk",
    "https://api.example.com/__clerk?token=value",
    "https://auth.example.com/api/__clerk",
    "https://api.example.com/__clerk",
  ])("rejects an unsafe Clerk proxy URL: %s", (proxyUrl) => {
    expect(
      resolveRuntimeConfig({
        EXPO_PUBLIC_DOMAIN: "api.example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("live"),
        EXPO_PUBLIC_CLERK_PROXY_URL: proxyUrl,
      }),
    ).toMatchObject({ ok: false, issues: ["clerk_proxy_url_invalid"] });
  });
});
