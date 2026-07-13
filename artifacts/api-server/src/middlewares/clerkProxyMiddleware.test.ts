/**
 * getClerkProxyHost feeds publishableKeyFromHost (whose own docs require an
 * allowlist) and the Clerk-Proxy-Url header, so it must never return a host
 * the deployment doesn't own. x-forwarded-host is client-writable: when an
 * upstream APPENDS rather than replaces, the leftmost value is whatever the
 * client sent. These tests lock the allowlist contract (P1-8).
 */
import { describe, it, expect } from "vitest";
import { getClerkProxyHost } from "./clerkProxyMiddleware";

const ALLOWED = new Set(["cut.example.com", "dev.replit.dev"]);

function req(headers: Record<string, string | string[] | undefined>) {
  return { headers };
}

describe("getClerkProxyHost", () => {
  it("accepts an allowlisted x-forwarded-host", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "cut.example.com", host: "10.0.0.5:3000" }),
      ALLOWED,
    );
    expect(host).toBe("cut.example.com");
  });

  it("skips a spoofed leftmost value and takes the trusted appended host", () => {
    // Client sent x-forwarded-host: evil.example; the edge appended the real
    // host instead of replacing. The spoofed leftmost value must lose.
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "evil.example, cut.example.com" }),
      ALLOWED,
    );
    expect(host).toBe("cut.example.com");
  });

  it("rejects a spoofed x-forwarded-host with no allowlisted value", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "evil.example", host: "also-evil.example" }),
      ALLOWED,
    );
    expect(host).toBeUndefined();
  });

  it("handles the string[] header shape", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": ["evil.example", "dev.replit.dev"] }),
      ALLOWED,
    );
    expect(host).toBe("dev.replit.dev");
  });

  it("falls back to an allowlisted Host header when x-forwarded-host is absent", () => {
    const host = getClerkProxyHost(req({ host: "cut.example.com" }), ALLOWED);
    expect(host).toBe("cut.example.com");
  });

  it("rejects a non-allowlisted Host header", () => {
    const host = getClerkProxyHost(req({ host: "evil.example" }), ALLOWED);
    expect(host).toBeUndefined();
  });

  it("returns undefined when no host headers are present at all", () => {
    expect(getClerkProxyHost(req({}), ALLOWED)).toBeUndefined();
    expect(
      getClerkProxyHost(req({ "x-forwarded-host": "", host: "" }), ALLOWED),
    ).toBeUndefined();
  });

  it("returns undefined for everything when the allowlist is empty", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "cut.example.com", host: "cut.example.com" }),
      new Set<string>(),
    );
    expect(host).toBeUndefined();
  });

  it("matches case-insensitively and ignores the port", () => {
    const host = getClerkProxyHost(
      req({ "x-forwarded-host": "CUT.Example.com:443" }),
      ALLOWED,
    );
    expect(host).toBe("cut.example.com");
  });
});
