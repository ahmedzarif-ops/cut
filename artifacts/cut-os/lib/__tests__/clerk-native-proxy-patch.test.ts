import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const clerkExpoRoot = dirname(require.resolve("@clerk/expo/package.json"));
const workspaceRoot = resolve(process.cwd(), "..", "..");
const clerkPackage = JSON.parse(
  readFileSync(resolve(clerkExpoRoot, "package.json"), "utf8"),
) as { version?: string };
const appPackage = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as { dependencies?: Record<string, string> };
const providerSource = readFileSync(
  resolve(clerkExpoRoot, "dist", "provider", "ClerkProvider.js"),
  "utf8",
);
const nativeSyncSource = readFileSync(
  resolve(clerkExpoRoot, "dist", "provider", "nativeClientSync.js"),
  "utf8",
);
const iosBridgeSource = readFileSync(
  resolve(clerkExpoRoot, "ios", "ClerkNativeBridge.swift"),
  "utf8",
);
const androidBridgeSource = readFileSync(
  resolve(
    clerkExpoRoot,
    "android",
    "src",
    "main",
    "java",
    "expo",
    "modules",
    "clerk",
    "ClerkExpoModule.kt",
  ),
  "utf8",
);
const workspaceConfig = readFileSync(
  resolve(workspaceRoot, "pnpm-workspace.yaml"),
  "utf8",
);

describe("Clerk native proxy support snapshot", () => {
  it("forwards ClerkProvider's verified proxy into native bootstrap", () => {
    expect(providerSource).toContain("publishableKey: pk,\n\t\tproxyUrl,");
    expect(nativeSyncSource).toContain(
      'typeof ClerkExpo.configureWithOptions === "function"',
    );
    expect(nativeSyncSource).toContain("proxyUrl: nativeProxyUrl");
    expect(nativeSyncSource).toContain(
      "else await ClerkExpo.configure(publishableKey, initialJsDeviceToken)",
    );
  });

  it("configures both native Clerk SDKs with the same proxy URL", () => {
    expect(iosBridgeSource).toContain(
      "return .init(proxyUrl: proxyUrl, middleware: middleware)",
    );
    expect(iosBridgeSource).toContain(
      "configuredPublishableKey != publishableKey || configuredProxyUrl != proxyUrl",
    );
    expect(androidBridgeSource).toContain(
      "ClerkConfigurationOptions(proxyUrl = proxyUrl).withCustomHeaders(customHeaders)",
    );
    expect(androidBridgeSource).toContain(
      "activePublishableKey != pubKey || configuredProxyUrl != normalizedProxyUrl",
    );
  });

  it("pins the exact support-provided Clerk commit without the superseded local patch", () => {
    expect(clerkPackage.version).toBe("4.2.3");
    expect(appPackage.dependencies?.["@clerk/expo"]).toBe(
      "https://pkg.pr.new/clerk/javascript/@clerk/expo@cfb6495",
    );
    expect(workspaceConfig).not.toContain("@clerk__expo@4.2.0.patch");
  });
});
