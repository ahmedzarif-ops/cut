import { describe, expect, it } from "vitest";
import {
  resolvePublicSiteBasePath,
  resolvePublicSiteOrigin,
  resolvePublicSiteTemplateRoot,
} from "./publicSite";

describe("single-host public site configuration", () => {
  it("binds the production public site to the exact CORS/Clerk origin", () => {
    expect(
      resolvePublicSiteOrigin({
        NODE_ENV: "production",
        CORS_ALLOWED_ORIGINS: "https://cut-production.replit.app",
        PUBLIC_APP_ORIGIN: "https://cut-production.replit.app",
      }),
    ).toBe("https://cut-production.replit.app");
  });

  it.each([
    {},
    { CORS_ALLOWED_ORIGINS: "https://cut-production.replit.app" },
    { PUBLIC_APP_ORIGIN: "https://cut-production.replit.app" },
    {
      CORS_ALLOWED_ORIGINS: "https://cut-production.replit.app",
      PUBLIC_APP_ORIGIN: "https://other.replit.app",
    },
    {
      CORS_ALLOWED_ORIGINS: "https://cut-production.replit.app",
      PUBLIC_APP_ORIGIN: "http://cut-production.replit.app",
    },
  ])("fails closed for a split or invalid production ingress: %j", (values) => {
    expect(() =>
      resolvePublicSiteOrigin({ NODE_ENV: "production", ...values }),
    ).toThrow(/PUBLIC_APP_ORIGIN/u);
  });

  it("keeps local development usable without trusting a request Host header", () => {
    expect(resolvePublicSiteOrigin({ NODE_ENV: "development" })).toBe(
      "https://preview.cutos.app",
    );
  });

  it.each([undefined, "", "/"])(
    "keeps the combined production site at root for BASE_PATH=%s",
    (basePath) => {
      expect(
        resolvePublicSiteBasePath({
          NODE_ENV: "production",
          BASE_PATH: basePath,
        }),
      ).toBeUndefined();
    },
  );

  it.each(["cut", "/cut", "/cut/", "/api", "//", " / "])(
    "fails before production can mount a split BASE_PATH: %s",
    (basePath) => {
      expect(() =>
        resolvePublicSiteBasePath({
          NODE_ENV: "production",
          BASE_PATH: basePath,
        }),
      ).toThrow(/BASE_PATH/u);
    },
  );

  it("preserves a development-only preview mount", () => {
    expect(
      resolvePublicSiteBasePath({
        NODE_ENV: "development",
        BASE_PATH: "/preview",
      }),
    ).toBe("/preview");
  });

  it("never lets source templates mask a missing production package", () => {
    expect(() =>
      resolvePublicSiteTemplateRoot({ NODE_ENV: "production" }),
    ).toThrow(/Packaged production public-site templates/u);
  });

  it("uses the source template fallback only outside production", () => {
    expect(resolvePublicSiteTemplateRoot({ NODE_ENV: "test" })).toMatch(
      /artifacts\/cut-os\/server\/templates\/?$/u,
    );
  });
});
