import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const clerkExpoRoot = dirname(require.resolve("@clerk/expo/package.json"));
const workspaceRoot = resolve(process.cwd(), "..", "..");
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

describe("Clerk native proxy patch", () => {
  it("forwards ClerkProvider's verified proxy into native bootstrap", () => {
    expect(providerSource).toContain("publishableKey: pk,\n\t\tproxyUrl,");
    expect(nativeSyncSource).toContain(
      "ClerkExpo.configure(configuringPublishableKey, initialJsDeviceToken, configuringProxyUrl)",
    );
    expect(nativeSyncSource).toContain(
      'const configuration = `${publishableKey}\\0${proxyUrl ?? ""}`;',
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

  it("keeps the reviewed dependency repair reproducible", () => {
    expect(workspaceConfig).toContain(
      '"@clerk/expo@4.2.0": patches/@clerk__expo@4.2.0.patch',
    );
  });
});
