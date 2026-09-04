import { describe, it, expect } from "vitest";
import { buildAllowedHosts, buildAllowedOrigins } from "./allowedHosts";

describe("buildAllowedHosts", () => {
  it("preserves injected-domain aggregation outside production", () => {
    const hosts = buildAllowedHosts({
      NODE_ENV: "development",
      REPLIT_DEV_DOMAIN: "dev.replit.dev",
      REPLIT_EXPO_DEV_DOMAIN: "expo.replit.dev",
      CORS_ALLOWED_ORIGINS: "https://cut.example.com, app.example.com",
    });
    expect(hosts).toEqual(
      new Set([
        "dev.replit.dev",
        "expo.replit.dev",
        "cut.example.com",
        "app.example.com",
      ]),
    );
  });

  it("normalizes scheme, path, port, and case down to a bare hostname", () => {
    const hosts = buildAllowedHosts({
      CORS_ALLOWED_ORIGINS: "https://CUT.Example.com:443/some/path",
    });
    expect(hosts).toEqual(new Set(["cut.example.com"]));
  });

  it("rejects plaintext http:// entries, mirroring the CORS allowlist", () => {
    const hosts = buildAllowedHosts({
      CORS_ALLOWED_ORIGINS:
        "http://insecure.example.com,https://ok.example.com",
    });
    expect(hosts).toEqual(new Set(["ok.example.com"]));
  });

  it("is empty when no allowlist env vars are set", () => {
    expect(buildAllowedHosts({})).toEqual(new Set());
  });

  it("drops empty and whitespace-only entries", () => {
    const hosts = buildAllowedHosts({
      REPLIT_DEV_DOMAIN: "  ",
      CORS_ALLOWED_ORIGINS: " ,,https://ok.example.com, ",
    });
    expect(hosts).toEqual(new Set(["ok.example.com"]));
  });
});

describe("buildAllowedOrigins", () => {
  it("normalizes bare domains to https origins", () => {
    const origins = buildAllowedOrigins({
      REPLIT_DEV_DOMAIN: "dev.replit.dev",
      CORS_ALLOWED_ORIGINS: "https://cut.example.com",
    });
    expect(origins).toEqual(
      new Set(["https://dev.replit.dev", "https://cut.example.com"]),
    );
  });

  it("never allows plaintext http:// origins", () => {
    const origins = buildAllowedOrigins({
      CORS_ALLOWED_ORIGINS: "http://insecure.example.com",
    });
    expect(origins).toEqual(new Set());
  });

  it("is empty when no allowlist env vars are set", () => {
    expect(buildAllowedOrigins({})).toEqual(new Set());
  });
});

describe("production canonical ingress", () => {
  it("uses only the one explicit canonical origin for CORS and Clerk", () => {
    const environment = {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://cut.example.com",
      REPLIT_DEV_DOMAIN: "dev-injection.replit.dev",
      REPLIT_EXPO_DEV_DOMAIN: "expo-injection.replit.dev",
      REPLIT_DOMAINS: "deployment-injection.replit.app,other.replit.app",
    };

    expect(buildAllowedOrigins(environment)).toEqual(
      new Set(["https://cut.example.com"]),
    );
    expect(buildAllowedHosts(environment)).toEqual(
      new Set(["cut.example.com"]),
    );
  });

  it("does not promote provider-injected domains when the explicit origin is absent", () => {
    const environment = {
      NODE_ENV: "production",
      REPLIT_DEV_DOMAIN: "dev-injection.replit.dev",
      REPLIT_EXPO_DEV_DOMAIN: "expo-injection.replit.dev",
      REPLIT_DOMAINS: "deployment-injection.replit.app,other.replit.app",
    };

    expect(buildAllowedOrigins(environment)).toEqual(new Set());
    expect(buildAllowedHosts(environment)).toEqual(new Set());
  });

  it.each([
    "cut.example.com",
    "http://cut.example.com",
    "https://cut.example.com/",
    "https://cut.example.com:8443",
    "https://cut.example.com/path",
    "https://cut.example.com?query=true",
    "https://cut.example.com#fragment",
    "https://user@cut.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://cut.example",
    " https://cut.example.com",
    "https://cut.example.com ",
    "https://cut.example.com,https://other.example.com",
    "https://cut.example.com,not-an-origin",
    "https://cut.example.com,",
  ])("fails closed for a non-canonical production origin: %s", (origin) => {
    const environment = {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: origin,
    };

    expect(buildAllowedOrigins(environment)).toEqual(new Set());
    expect(buildAllowedHosts(environment)).toEqual(new Set());
  });
});
