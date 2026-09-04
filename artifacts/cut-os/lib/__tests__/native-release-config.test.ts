import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
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
const workspaceConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "..", "..", "package.json"), "utf8"),
);
const nodeVersion = readFileSync(
  resolve(process.cwd(), "..", "..", ".node-version"),
  "utf8",
).trim();
const require = createRequire(import.meta.url);
const expoAutolinkingCli = resolve(
  dirname(require.resolve("expo/package.json")),
  "bin",
  "autolinking",
);
const mobileRuntimeDependencies = [
  "@clerk/expo",
  "@expo-google-fonts/inter",
  "@expo/vector-icons",
  "@stardazed/streams-text-encoding",
  "@tanstack/react-query",
  "@ungap/structured-clone",
  "@workspace/api-client-react",
  "@workspace/domain",
  "expo",
  "expo-camera",
  "expo-constants",
  "expo-crypto",
  "expo-font",
  "expo-haptics",
  "expo-linking",
  "expo-router",
  "expo-secure-store",
  "expo-splash-screen",
  "expo-status-bar",
  "expo-system-ui",
  "expo-web-browser",
  "react",
  "react-dom",
  "react-native",
  "react-native-gesture-handler",
  "react-native-keyboard-controller",
  "react-native-purchases",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-web",
  "react-native-worklets",
  "zod",
] as const;
const mobileBuildAndTestDependencies = [
  "@babel/core",
  "@expo/cli",
  "@expo/ngrok",
  "@types/react",
  "@types/react-dom",
  "babel-plugin-react-compiler",
  "babel-preset-expo",
  "expo-dev-client",
  "expo-doctor",
  "typescript",
  "vitest",
] as const;

describe("native release configuration", () => {
  it("locks the App Store identity, device support, and icon", () => {
    expect(appConfig.expo.name).toBe("CUT OS");
    expect(appConfig.expo.version).toBe("1.0.0");
    expect(appConfig.expo.orientation).toBe("portrait");
    expect(appConfig.expo.icon).toBe("./assets/images/icon-v2.png");
    expect(appConfig.expo.ios.bundleIdentifier).toBe("com.zarifahmed.cut");
    expect(appConfig.expo.ios.supportsTablet).toBe(false);
  });

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

  it("applies Clerk's native build requirements without advertising unused Apple sign-in", () => {
    expect(packageConfig.dependencies["@clerk/expo"]).toBe(
      "https://pkg.pr.new/clerk/javascript/@clerk/expo@cfb6495",
    );
    expect(appConfig.expo.plugins).toContainEqual([
      "@clerk/expo",
      { appleSignIn: false },
    ]);
  });

  it("keeps runtime packages installable without development tooling", () => {
    expect(Object.keys(packageConfig.dependencies).sort()).toEqual(
      [...mobileRuntimeDependencies].sort(),
    );
    expect(Object.keys(packageConfig.devDependencies).sort()).toEqual(
      [...mobileBuildAndTestDependencies].sort(),
    );

    for (const packageName of mobileRuntimeDependencies) {
      expect(packageConfig.dependencies[packageName]).toBeDefined();
      expect(packageConfig.devDependencies[packageName]).toBeUndefined();
    }
    for (const packageName of mobileBuildAndTestDependencies) {
      expect(packageConfig.devDependencies[packageName]).toBeDefined();
      expect(packageConfig.dependencies[packageName]).toBeUndefined();
    }
  });

  it("keeps Clerk's optional Google Sign-In SDK out of native autolinking", () => {
    expect(
      packageConfig.dependencies?.["@clerk/expo-google-signin"],
    ).toBeUndefined();
    expect(
      packageConfig.devDependencies?.["@clerk/expo-google-signin"],
    ).toBeUndefined();

    const autolinking = JSON.parse(
      execFileSync(
        process.execPath,
        [expoAutolinkingCli, "resolve", "--platform", "apple", "--json"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
        },
      ),
    ) as {
      modules: Array<{
        packageName: string;
        pods?: Array<{ podName: string }>;
      }>;
    };
    const clerkPods = autolinking.modules
      .filter(({ packageName }) => packageName === "@clerk/expo")
      .flatMap(({ pods = [] }) => pods.map(({ podName }) => podName));

    expect(clerkPods).toEqual(["ClerkExpo"]);
    expect(clerkPods).not.toContain("ClerkGoogleSignIn");
  }, 15_000);

  it("autolinks Apple's age-range bridge and requests only its capability", () => {
    expect(appConfig.expo.ios.entitlements).toEqual({
      "com.apple.developer.declared-age-range": true,
    });

    const autolinking = JSON.parse(
      execFileSync(
        process.execPath,
        [expoAutolinkingCli, "resolve", "--platform", "apple", "--json"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
        },
      ),
    ) as {
      modules: Array<{
        packageName: string;
        modules?: string[];
        pods?: Array<{ podName: string }>;
      }>;
    };
    const bridge = autolinking.modules.find(
      ({ packageName }) => packageName === "cut-declared-age-range",
    );

    expect(bridge?.modules).toEqual(["CutDeclaredAgeRangeModule"]);
    expect(bridge?.pods?.map(({ podName }) => podName)).toEqual([
      "CutDeclaredAgeRange",
    ]);
  });

  it("uses the dark launch background behind the full-canvas app icon", () => {
    expect(appConfig.expo.splash).toMatchObject({
      image: "./assets/images/icon-v2.png",
      resizeMode: "contain",
      backgroundColor: "#07111F",
    });
    expect(appConfig.expo.ios.infoPlist.UIStatusBarStyle).toBe(
      "UIStatusBarStyleLightContent",
    );
  });

  it("embeds every Inter weight needed by native launch and app screens", () => {
    expect(appConfig.expo.plugins).toContainEqual([
      "expo-font",
      {
        fonts: [
          "./node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf",
          "./node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf",
          "./node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf",
          "./node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf",
        ],
      },
    ]);
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
    expect(easConfig.cli.appVersionSource).toBe("remote");
    expect(easConfig.cli.requireCommit).toBe(true);
    for (const profile of ["development", "preview", "production"] as const) {
      expect(easConfig.build[profile].environment).toBe(profile);
    }
    expect(easConfig.build.production.ios.image).toBe(
      "macos-tahoe-26.4-xcode-26.4",
    );
    expect(easConfig.build["ios-simulator"].ios.image).toBe(
      easConfig.build.production.ios.image,
    );
    expect(easConfig.build.production.autoIncrement).toBe(true);
  });

  it("pins one EAS, Node, and pnpm toolchain without Corepack shim conflicts", () => {
    expect(easConfig.cli.version).toBe("21.4.0");
    expect(easConfig.build.base).toEqual({
      node: "24.14.0",
      pnpm: "10.34.5",
    });
    expect(easConfig.build.base).not.toHaveProperty("corepack");
    for (const profile of ["development", "preview", "production"] as const) {
      expect(easConfig.build[profile].extends).toBe("base");
    }

    expect(nodeVersion).toBe("24.14.0");
    expect(workspaceConfig.packageManager).toBe("pnpm@10.34.5");
    expect(workspaceConfig.engines).toEqual({
      node: "24.x",
      pnpm: "10.26.1 || 10.34.5",
    });
    expect(workspaceConfig.devDependencies["eas-cli"]).toBe("21.4.0");
  });

  it("disables arbitrary network loads and declares exempt-only encryption", () => {
    expect(
      appConfig.expo.ios.infoPlist.NSAppTransportSecurity
        .NSAllowsArbitraryLoads,
    ).toBe(false);
    expect(appConfig.expo.ios.config.usesNonExemptEncryption).toBe(false);
  });

  it("requests camera access only for barcode scanning", () => {
    const cameraPlugin = appConfig.expo.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === "expo-camera",
    );

    expect(cameraPlugin).toEqual([
      "expo-camera",
      {
        cameraPermission: "Allow CUT OS to scan food barcodes.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ]);
  });

  it("runs the profile-aware release gate before EAS installs dependencies", () => {
    expect(packageConfig.scripts["eas-build-pre-install"]).toBe(
      "node scripts/eas-build-pre-install.mjs",
    );
    expect(packageConfig.scripts["validate:legal-site:live"]).toBe(
      "node server/verify-live-legal-site.mjs",
    );
  });
});
