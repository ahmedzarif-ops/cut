import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  createMetroEnvironment,
  isSensitiveEnvironmentName,
} = require("./build-environment.js");

describe("Metro build environment", () => {
  it("preserves required tooling and reviewed public runtime values", () => {
    const source = {
      PATH: "/tools/bin",
      HOME: "/workspace/home",
      NODE_ENV: "production",
      CI: "true",
      LANG: "en_US.UTF-8",
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_PublicIosKey1234",
      EXPO_PUBLIC_REVENUECAT_PRODUCT_ID: "cut_pro_monthly",
      EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://cut.example/privacy",
      EXPO_PUBLIC_TERMS_URL: "https://cut.example/terms",
      EXPO_PUBLIC_SUPPORT_URL: "https://cut.example/support",
    };

    expect(
      createMetroEnvironment(source, {
        EXPO_PUBLIC_DOMAIN: "api.cut.example",
        EXPO_PUBLIC_REPL_ID: "public-repl-id",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_PublicClerkKey1234",
        EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.cut.example/api/__clerk",
      }),
    ).toEqual({
      CI: "true",
      EXPO_NO_DOTENV: "1",
      HOME: "/workspace/home",
      LANG: "en_US.UTF-8",
      NODE_ENV: "production",
      PATH: "/tools/bin",
      EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.cut.example/api/__clerk",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_PublicClerkKey1234",
      EXPO_PUBLIC_DOMAIN: "api.cut.example",
      EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://cut.example/privacy",
      EXPO_PUBLIC_REPL_ID: "public-repl-id",
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_PublicIosKey1234",
      EXPO_PUBLIC_REVENUECAT_PRODUCT_ID: "cut_pro_monthly",
      EXPO_PUBLIC_SUPPORT_URL: "https://cut.example/support",
      EXPO_PUBLIC_TERMS_URL: "https://cut.example/terms",
    });
  });

  it("does not pass server, signing, provider, or patterned secrets to Metro", () => {
    const source = {
      PATH: "/tools/bin",
      DATABASE_URL: "postgresql://private",
      CLERK_SECRET_KEY: "sk_live_private",
      REVENUECAT_SECRET_API_KEY: "sk_private",
      APPLE_APP_SPECIFIC_PASSWORD: "private",
      ASC_API_PRIVATE_KEY: "private",
      AWS_SECRET_ACCESS_KEY: "private",
      EXPO_TOKEN: "private",
      GITHUB_TOKEN: "private",
      NPM_TOKEN: "private",
      SENTRY_AUTH_TOKEN: "private",
      SIGNING_CERTIFICATE: "private",
      UNRELATED_PROVIDER_CREDENTIALS: "private",
      EXPO_PUBLIC_PASSWORD: "private",
      EXPO_PUBLIC_PRIVATE_KEY: "private",
      EXPO_PUBLIC_SECRET: "private",
      EXPO_PUBLIC_AUTH_TOKEN: "private",
    };

    expect(createMetroEnvironment(source)).toEqual({
      EXPO_NO_DOTENV: "1",
      PATH: "/tools/bin",
    });
  });

  it("rejects secret values mislabeled as reviewed public SDK keys", () => {
    const result = createMetroEnvironment({
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "sk_live_PrivateClerkKey1234",
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "sk_PrivateRevenueCatKey1234",
    });

    expect(result).toEqual({ EXPO_NO_DOTENV: "1" });
  });

  it("lets reviewed overrides replace source public values without mutation", () => {
    const source = {
      EXPO_PUBLIC_DOMAIN: "old.cut.example",
      EXPO_PUBLIC_REPL_ID: "old-repl-id",
    };

    const result = createMetroEnvironment(source, {
      EXPO_PUBLIC_DOMAIN: "new.cut.example",
    });

    expect(result).toEqual({
      EXPO_NO_DOTENV: "1",
      EXPO_PUBLIC_DOMAIN: "new.cut.example",
      EXPO_PUBLIC_REPL_ID: "old-repl-id",
    });
    expect(source).toEqual({
      EXPO_PUBLIC_DOMAIN: "old.cut.example",
      EXPO_PUBLIC_REPL_ID: "old-repl-id",
    });
  });

  it.each([
    "API_PASSWORD",
    "APPLE_APP_SPECIFIC_PASSWORD",
    "ASC_API_PRIVATE_KEY",
    "AUTH_TOKEN",
    "CLERK_SECRET_KEY",
    "PROVIDER_CREDENTIALS",
    "SIGNING_KEY",
  ])(
    "recognizes sensitive environment names without inspecting values: %s",
    (name) => {
      expect(isSensitiveEnvironmentName(name)).toBe(true);
    },
  );

  it("keeps build.js wired to the allowlist without logging copied values", () => {
    const buildSource = readFileSync(
      new URL("./build.js", import.meta.url),
      "utf8",
    );

    expect(buildSource).toContain("createMetroEnvironment(process.env");
    expect(buildSource).not.toContain("...process.env");
    expect(buildSource).not.toContain("EXPO_PUBLIC_DOMAIN=${");
    expect(buildSource).not.toContain("EXPO_PUBLIC_REPL_ID=${");
  });

  it("forces Expo dotenv loading off even when the parent requests it", () => {
    expect(createMetroEnvironment({ EXPO_NO_DOTENV: "0" }).EXPO_NO_DOTENV).toBe(
      "1",
    );
  });
});
