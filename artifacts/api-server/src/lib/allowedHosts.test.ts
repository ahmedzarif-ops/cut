import { describe, it, expect } from "vitest";
import { buildAllowedHosts, buildAllowedOrigins } from "./allowedHosts";

describe("buildAllowedHosts", () => {
  it("collects hostnames from the same env vars as the CORS allowlist", () => {
    const hosts = buildAllowedHosts({
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
      CORS_ALLOWED_ORIGINS: "http://insecure.example.com,https://ok.example.com",
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
