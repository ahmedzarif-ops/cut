import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "app.json"), "utf8"),
);
const easConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "eas.json"), "utf8"),
);
const packageConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
);

describe("native release configuration", () => {
  it("links the app to the existing CUT EAS project", () => {
    expect(appConfig.expo.owner).toBe("zee-digipit");
    expect(appConfig.expo.slug).toBe("cut");
    expect(appConfig.expo.extra?.eas?.projectId).toBe(
      "4851dda2-d27b-4756-8099-18f0cb7d257c",
    );
  });

  it("pins the core RevenueCat SDK used by the custom paywall", () => {
    expect(packageConfig.dependencies["react-native-purchases"]).toBe("10.6.0");
    expect(
      packageConfig.dependencies["react-native-purchases-ui"],
    ).toBeUndefined();
  });

  it("does not give Expo Router a generic production origin", () => {
    expect(appConfig.expo.plugins).toContain("expo-router");
    expect(
      appConfig.expo.plugins.some(
        (plugin: unknown) =>
          Array.isArray(plugin) && plugin[0] === "expo-router",
      ),
    ).toBe(false);
  });

  it("declares first-party collection as linked and never tracked", () => {
    const manifest = appConfig.expo.ios.privacyManifests;
    const collected = manifest.NSPrivacyCollectedDataTypes;

    expect(manifest.NSPrivacyTracking).toBe(false);
    expect(manifest.NSPrivacyTrackingDomains).toEqual([]);
    expect(
      collected.map(
        (entry: { NSPrivacyCollectedDataType: string }) =>
          entry.NSPrivacyCollectedDataType,
      ),
    ).toEqual([
      "NSPrivacyCollectedDataTypeName",
      "NSPrivacyCollectedDataTypeEmailAddress",
      "NSPrivacyCollectedDataTypeHealth",
      "NSPrivacyCollectedDataTypeFitness",
      "NSPrivacyCollectedDataTypeUserID",
      "NSPrivacyCollectedDataTypeOtherDataTypes",
      "NSPrivacyCollectedDataTypePurchaseHistory",
    ]);
    for (const entry of collected) {
      expect(entry.NSPrivacyCollectedDataTypeLinked).toBe(true);
      expect(entry.NSPrivacyCollectedDataTypeTracking).toBe(false);
      expect(entry.NSPrivacyCollectedDataTypePurposes).toContain(
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
      );
    }

    const purposes = Object.fromEntries(
      collected.map(
        (entry: {
          NSPrivacyCollectedDataType: string;
          NSPrivacyCollectedDataTypePurposes: string[];
        }) => [
          entry.NSPrivacyCollectedDataType,
          entry.NSPrivacyCollectedDataTypePurposes,
        ],
      ),
    );
    expect(purposes).toEqual({
      NSPrivacyCollectedDataTypeName: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
        "NSPrivacyCollectedDataTypePurposeProductPersonalization",
      ],
      NSPrivacyCollectedDataTypeEmailAddress: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
      ],
      NSPrivacyCollectedDataTypeHealth: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
        "NSPrivacyCollectedDataTypePurposeProductPersonalization",
      ],
      NSPrivacyCollectedDataTypeFitness: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
        "NSPrivacyCollectedDataTypePurposeProductPersonalization",
      ],
      NSPrivacyCollectedDataTypeUserID: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
      ],
      NSPrivacyCollectedDataTypeOtherDataTypes: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
        "NSPrivacyCollectedDataTypePurposeProductPersonalization",
      ],
      NSPrivacyCollectedDataTypePurchaseHistory: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
        "NSPrivacyCollectedDataTypePurposeAnalytics",
      ],
    });
  });

  it("aggregates required-reason API declarations used by native dependencies", () => {
    const accessed =
      appConfig.expo.ios.privacyManifests.NSPrivacyAccessedAPITypes;
    const categories = new Map(
      accessed.map(
        (entry: {
          NSPrivacyAccessedAPIType: string;
          NSPrivacyAccessedAPITypeReasons: string[];
        }) => [
          entry.NSPrivacyAccessedAPIType,
          entry.NSPrivacyAccessedAPITypeReasons,
        ],
      ),
    );

    expect(categories.get("NSPrivacyAccessedAPICategoryUserDefaults")).toEqual(
      expect.arrayContaining(["CA92.1"]),
    );
    expect(categories.get("NSPrivacyAccessedAPICategoryFileTimestamp")).toEqual(
      expect.arrayContaining(["0A2A.1", "3B52.1", "C617.1"]),
    );
    expect(categories.get("NSPrivacyAccessedAPICategoryDiskSpace")).toEqual(
      expect.arrayContaining(["85F4.1", "E174.1"]),
    );
    expect(
      categories.get("NSPrivacyAccessedAPICategorySystemBootTime"),
    ).toEqual(expect.arrayContaining(["35F9.1"]));
  });

  it("binds every profile to its EAS environment and pins production Xcode", () => {
    expect(easConfig.cli.requireCommit).toBe(true);
    for (const profile of ["development", "preview", "production"] as const) {
      expect(easConfig.build[profile].environment).toBe(profile);
    }
    expect(easConfig.build.production.ios.image).toBe(
      "macos-sequoia-15.6-xcode-26.0",
    );
  });

  it("disables arbitrary network loads and declares exempt-only encryption", () => {
    expect(
      appConfig.expo.ios.infoPlist.NSAppTransportSecurity
        .NSAllowsArbitraryLoads,
    ).toBe(false);
    expect(appConfig.expo.ios.config.usesNonExemptEncryption).toBe(false);
  });

  it("runs release validation before EAS installs dependencies", () => {
    expect(packageConfig.scripts["eas-build-pre-install"]).toBe(
      "node scripts/validate-release-config.mjs",
    );
  });
});
