import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

function publishableKey(
  type: "live" | "test",
  frontendApi = type === "live"
    ? "clerk.cut-os.example.com"
    : "cut-os-13.clerk.accounts.dev",
): string {
  const encoded = Buffer.from(`${frontendApi}$`)
    .toString("base64")
    .replace(/=+$/, "");
  return `pk_${type}_${encoded}`;
}

const PLACEHOLDER_CLERK_FRONTEND_APIS = [
  "example.accounts.dev",
  "example.clerk.accounts.dev",
  "clerk.example.com",
] as const;

const validatorPath = resolve(
  process.cwd(),
  "scripts/validate-release-config.mjs",
);
const PRODUCT_ID = "com.zarifahmed.cut.pro.monthly";
const PRIVACY_POLICY_URL = "https://example.com/privacy";
const TERMS_URL = "https://example.com/terms";
const SUPPORT_URL = "https://example.com/support";
const approvedSubscriptionReleaseRecord = {
  productId: PRODUCT_ID,
  introductoryOfferDecision: "none",
};
const approvedAppStoreReleaseRecord = {
  listing: {
    privacyPolicyUrl: PRIVACY_POLICY_URL,
    termsUrl: TERMS_URL,
    supportUrl: SUPPORT_URL,
  },
  subscription: approvedSubscriptionReleaseRecord,
};

const productionEnvironment = {
  EAS_BUILD_PROFILE: "production",
  EXPO_PUBLIC_DOMAIN: "api.example.com",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("live"),
  EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.example.com/api/__clerk",
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_PublicIosKey1234",
  EXPO_PUBLIC_REVENUECAT_PRODUCT_ID: PRODUCT_ID,
  EXPO_PUBLIC_PRIVACY_POLICY_URL: PRIVACY_POLICY_URL,
  EXPO_PUBLIC_TERMS_URL: TERMS_URL,
  EXPO_PUBLIC_SUPPORT_URL: SUPPORT_URL,
};

function runValidator(
  environment: Record<string, string>,
  appStoreReleaseRecord: Record<
    string,
    unknown
  > = approvedAppStoreReleaseRecord,
) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "cut-release-config-test-"));
  const copiedValidatorPath = join(
    temporaryRoot,
    "artifacts/cut-os/scripts/validate-release-config.mjs",
  );
  const copiedReleaseRecordPath = join(
    temporaryRoot,
    "app-store/app-store-submission.json",
  );
  mkdirSync(dirname(copiedValidatorPath), { recursive: true });
  mkdirSync(dirname(copiedReleaseRecordPath), { recursive: true });
  copyFileSync(validatorPath, copiedValidatorPath);
  writeFileSync(
    copiedReleaseRecordPath,
    JSON.stringify(appStoreReleaseRecord),
    "utf8",
  );

  try {
    return spawnSync(process.execPath, [realpathSync(copiedValidatorPath)], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...environment, NODE_ENV: "test" },
    });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

describe("release configuration validator", () => {
  it("keeps the CI production fixture bound to the compiled listing URLs", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), "../../.github/workflows/ci.yml"),
      "utf8",
    );

    for (const [field, value] of [
      ["privacyPolicyUrl", PRIVACY_POLICY_URL],
      ["termsUrl", TERMS_URL],
      ["supportUrl", SUPPORT_URL],
    ]) {
      expect(workflow).toContain(`record.listing.${field} = "${value}";`);
    }
  });

  it("accepts a complete production configuration without logging values", () => {
    const result = runValidator(productionEnvironment);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("valid for the production build profile");
    expect(`${result.stdout}${result.stderr}`).not.toContain(
      productionEnvironment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain(
      productionEnvironment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain(PRODUCT_ID);
    for (const url of [PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL]) {
      expect(`${result.stdout}${result.stderr}`).not.toContain(url);
    }
  });

  it("reports all missing production variable names", () => {
    const result = runValidator({ EAS_BUILD_PROFILE: "production" });

    expect(result.status).toBe(1);
    for (const name of [
      "EXPO_PUBLIC_DOMAIN",
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "EXPO_PUBLIC_CLERK_PROXY_URL",
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
      "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID",
      "EXPO_PUBLIC_PRIVACY_POLICY_URL",
      "EXPO_PUBLIC_TERMS_URL",
      "EXPO_PUBLIC_SUPPORT_URL",
    ]) {
      expect(result.stderr).toContain(name);
    }
    expect(result.stderr).not.toContain(
      "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID must match the App Store subscription release record",
    );
  });

  it("rejects local infrastructure and test authentication in production", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_DOMAIN: "localhost",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("publicly reachable");
    expect(result.stderr).toContain("live key for production");
  });

  it("allows a test key and absent public-resource URLs in preview", () => {
    const result = runValidator({
      EAS_BUILD_PROFILE: "preview",
      EXPO_PUBLIC_DOMAIN: "preview.example.com",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "test_PublicTestKey1234",
      EXPO_PUBLIC_REVENUECAT_PRODUCT_ID: PRODUCT_ID,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("valid for the preview build profile");
  });

  it.each(PLACEHOLDER_CLERK_FRONTEND_APIS)(
    "rejects placeholder Clerk instance %s in preview without logging the key",
    (frontendApi) => {
      const placeholderKey = publishableKey("test", frontendApi);
      const result = runValidator({
        EAS_BUILD_PROFILE: "preview",
        EXPO_PUBLIC_DOMAIN: "preview.example.com",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: placeholderKey,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("placeholder Clerk instance");
      expect(`${result.stdout}${result.stderr}`).not.toContain(placeholderKey);
    },
  );

  it.each(PLACEHOLDER_CLERK_FRONTEND_APIS)(
    "rejects placeholder Clerk instance %s in production",
    (frontendApi) => {
      const placeholderKey = publishableKey("live", frontendApi);
      const result = runValidator({
        ...productionEnvironment,
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: placeholderKey,
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("placeholder Clerk instance");
      expect(`${result.stdout}${result.stderr}`).not.toContain(placeholderKey);
    },
  );

  it("rejects a live key that encodes a development Clerk frontend", () => {
    const mismatchedKey = publishableKey(
      "live",
      "cut-os-13.clerk.accounts.dev",
    );
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: mismatchedKey,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must match its Clerk environment");
    expect(`${result.stdout}${result.stderr}`).not.toContain(mismatchedKey);
  });

  it("allows the no-signing simulator profile to use preview resources", () => {
    const result = runValidator({
      EAS_BUILD_PROFILE: "ios-simulator",
      EXPO_PUBLIC_DOMAIN: "preview.example.com",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "test_PublicTestKey1234",
      EXPO_PUBLIC_REVENUECAT_PRODUCT_ID: PRODUCT_ID,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "valid for the ios-simulator build profile",
    );
  });

  it("requires a bound product whenever preview configures RevenueCat", () => {
    const result = runValidator({
      EAS_BUILD_PROFILE: "preview",
      EXPO_PUBLIC_DOMAIN: "preview.example.com",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "test_PublicTestKey1234",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPO_PUBLIC_REVENUECAT_PRODUCT_ID");
    expect(result.stderr).not.toContain("test_PublicTestKey1234");
  });

  it("fails closed for an unrecognized build profile", () => {
    const result = runValidator({
      EAS_BUILD_PROFILE: "unrecognized-profile",
      EXPO_PUBLIC_DOMAIN: "preview.example.com",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("test"),
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "test_PublicTestKey1234",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("live key for production");
    expect(result.stderr).toContain("EXPO_PUBLIC_PRIVACY_POLICY_URL");
  });

  it("rejects a RevenueCat Test Store key in production", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "test_PublicTestKey1234",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("appl_ key for production");
    expect(result.stderr).not.toContain("test_PublicTestKey1234");
  });

  it("rejects a compiled product that does not match the release record", () => {
    const recordProductId = "com.zarifahmed.cut.pro.annual";
    const result = runValidator(productionEnvironment, {
      ...approvedAppStoreReleaseRecord,
      subscription: {
        ...approvedSubscriptionReleaseRecord,
        productId: recordProductId,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "must match the App Store subscription release record",
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain(PRODUCT_ID);
    expect(`${result.stdout}${result.stderr}`).not.toContain(recordProductId);
  });

  it("rejects a production release record with an introductory offer", () => {
    const result = runValidator(productionEnvironment, {
      ...approvedAppStoreReleaseRecord,
      subscription: {
        ...approvedSubscriptionReleaseRecord,
        introductoryOfferDecision: "free_trial",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must disable introductory offers");
  });

  it("binds every compiled public resource URL to the App Store listing record", () => {
    const differentPrivacyUrl = "https://example.com/different-privacy";
    const result = runValidator(productionEnvironment, {
      ...approvedAppStoreReleaseRecord,
      listing: {
        ...approvedAppStoreReleaseRecord.listing,
        privacyPolicyUrl: differentPrivacyUrl,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "EXPO_PUBLIC_PRIVACY_POLICY_URL must match the App Store listing release record",
    );
    expect(result.stderr).not.toContain(PRIVACY_POLICY_URL);
    expect(result.stderr).not.toContain(differentPrivacyUrl);
  });

  it("fails closed when the full App Store release record omits listing metadata", () => {
    const result = runValidator(productionEnvironment, {
      subscription: approvedSubscriptionReleaseRecord,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "App Store listing release record must be readable",
    );
    for (const name of [
      "EXPO_PUBLIC_PRIVACY_POLICY_URL",
      "EXPO_PUBLIC_TERMS_URL",
      "EXPO_PUBLIC_SUPPORT_URL",
    ]) {
      expect(result.stderr).toContain(
        `${name} must match the App Store listing release record`,
      );
    }
    for (const url of [PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL]) {
      expect(result.stderr).not.toContain(url);
    }
  });

  it("rejects a malformed compiled App Store product identifier", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_REVENUECAT_PRODUCT_ID: "invalid product identifier",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("must be an App Store product identifier");
    expect(result.stderr).not.toContain("invalid product identifier");
  });

  it("requires the canonical proxy when preview embeds a live key", () => {
    const result = runValidator({
      EAS_BUILD_PROFILE: "preview",
      EXPO_PUBLIC_DOMAIN: "preview.example.com",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey("live"),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPO_PUBLIC_CLERK_PROXY_URL");
  });

  it("rejects insecure public resources and an unsafe proxy", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_PRIVACY_POLICY_URL: "http://example.com/privacy",
      EXPO_PUBLIC_CLERK_PROXY_URL:
        "https://user:password@api.example.com/__clerk?token=value",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPO_PUBLIC_PRIVACY_POLICY_URL");
    expect(result.stderr).toContain("EXPO_PUBLIC_CLERK_PROXY_URL");
    expect(result.stderr).not.toContain("user:password");
    expect(result.stderr).not.toContain("token=value");
  });

  it("rejects public URL normalization and never prints the URL values", () => {
    const spacedPrivacyUrl = ` ${PRIVACY_POLICY_URL}`;
    const controlCharacterSupportUrl =
      "https://exa\nmple.com/support-with-control";
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_PRIVACY_POLICY_URL: spacedPrivacyUrl,
      EXPO_PUBLIC_SUPPORT_URL: controlCharacterSupportUrl,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "EXPO_PUBLIC_PRIVACY_POLICY_URL must not contain surrounding whitespace or control characters",
    );
    expect(result.stderr).toContain(
      "EXPO_PUBLIC_SUPPORT_URL must not contain surrounding whitespace or control characters",
    );
    expect(result.stderr).not.toContain(spacedPrivacyUrl);
    expect(result.stderr).not.toContain(controlCharacterSupportUrl);
  });

  it("rejects a cross-origin Clerk proxy and a local support page", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_CLERK_PROXY_URL: "https://auth.example.com/api/__clerk",
      EXPO_PUBLIC_SUPPORT_URL: "https://localhost/support",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPO_PUBLIC_CLERK_PROXY_URL");
    expect(result.stderr).toContain("EXPO_PUBLIC_SUPPORT_URL");
  });

  it("rejects fake prefixed keys and alternate local-host spellings", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_not_a_clerk_key",
      EXPO_PUBLIC_DOMAIN: "localhost.",
      EXPO_PUBLIC_SUPPORT_URL: "https://127.0.0.1/support",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Clerk publishable key");
    expect(result.stderr).toContain("EXPO_PUBLIC_DOMAIN");
    expect(result.stderr).toContain("EXPO_PUBLIC_SUPPORT_URL");
  });

  it("rejects an API hostname with an embedded port", () => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_DOMAIN: "api.example.com:8443",
      EXPO_PUBLIC_CLERK_PROXY_URL: "https://api.example.com:8443/api/__clerk",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPO_PUBLIC_DOMAIN");
    expect(result.stderr).toContain("EXPO_PUBLIC_CLERK_PROXY_URL");
  });

  it.each([
    "bad..real-domain.com",
    "-bad.real-domain.com",
    "bad_name.real-domain.com",
    "api.example",
    "8.8.8.8",
    "api.onion",
    "router.home.arpa",
  ])("rejects an invalid or reserved production hostname: %s", (domain) => {
    const result = runValidator({
      ...productionEnvironment,
      EXPO_PUBLIC_DOMAIN: domain,
      EXPO_PUBLIC_CLERK_PROXY_URL: `https://${domain}/api/__clerk`,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("EXPO_PUBLIC_DOMAIN");
  });
});
