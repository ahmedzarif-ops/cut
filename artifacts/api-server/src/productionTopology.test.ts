import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = resolve(import.meta.dirname, "../../..");

describe("source-controlled production topology", () => {
  it("has one reproducible API build/start entry point", () => {
    const rootPackage = JSON.parse(
      readFileSync(resolve(workspaceRoot, "package.json"), "utf8"),
    );

    expect(rootPackage.scripts["build:production"]).toBe(
      "pnpm --filter @workspace/api-server run build",
    );
    expect(rootPackage.scripts["start:production"]).toBe(
      "node --enable-source-maps artifacts/api-server/dist/index.mjs",
    );
    expect(rootPackage.scripts["verify:revenuecat:production"]).toBe(
      "pnpm run build:production && node --enable-source-maps artifacts/api-server/dist/revenueCatPreflight.mjs",
    );
    expect(rootPackage.scripts["dry-run:production"]).toBe(
      "pnpm run build:production && node ops/scripts/production-topology-dry-run.mjs",
    );
  });

  it("defines exactly one production Replit artifact service", () => {
    const rootReplit = readFileSync(resolve(workspaceRoot, ".replit"), "utf8");
    const apiArtifact = readFileSync(
      resolve(
        workspaceRoot,
        "artifacts/api-server/.replit-artifact/artifact.toml",
      ),
      "utf8",
    );
    const mobileArtifact = readFileSync(
      resolve(workspaceRoot, "artifacts/cut-os/.replit-artifact/artifact.toml"),
      "utf8",
    );
    const artifactDescriptors = readdirSync(
      resolve(workspaceRoot, "artifacts"),
      { withFileTypes: true },
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        resolve(
          workspaceRoot,
          "artifacts",
          entry.name,
          ".replit-artifact/artifact.toml",
        ),
      )
      .filter((descriptorPath) => existsSync(descriptorPath))
      .map((descriptorPath) => readFileSync(descriptorPath, "utf8"));
    const productionServiceCount = artifactDescriptors
      .flatMap((source) =>
        source
          .split(/(?=^\[\[services\]\]\s*$)/gmu)
          .filter((block) => /^\[\[services\]\]\s*$/mu.test(block)),
      )
      .filter((serviceBlock) =>
        /^\[services\.production(?:\.|\])/mu.test(serviceBlock),
      ).length;

    expect(artifactDescriptors.length).toBeGreaterThanOrEqual(3);
    expect(productionServiceCount).toBe(1);
    expect(apiArtifact).toMatch(/^previewPath = "\/"$/mu);
    expect(apiArtifact).toMatch(/^paths = \["\/"\]$/mu);
    expect(apiArtifact).not.toMatch(/^paths = \["\/api"\]$/mu);
    expect(apiArtifact).toMatch(/^localPort = 8080$/mu);
    expect(apiArtifact).toMatch(
      /^\[services\.production\.run\.env\]\nPORT = "8080"$/mu,
    );
    expect(apiArtifact).toMatch(
      /^\[services\.production\.health\.startup\]\npath = "\/api\/readyz"$/mu,
    );
    expect(apiArtifact).toContain(
      '["corepack", "pnpm@10.34.5", "run", "build:production"]',
    );
    expect(apiArtifact).toContain(
      '["corepack", "pnpm@10.34.5", "run", "start:production"]',
    );
    expect(mobileArtifact).not.toMatch(/^\[services\.production(?:\.|\])/mu);
    expect(mobileArtifact).toContain("[services.development]");
    expect(rootReplit.match(/^externalPort = /gmu)).toHaveLength(1);
    expect(rootReplit).toMatch(
      /^\[\[ports\]\]\nlocalPort = 8080\nexternalPort = 80$/mu,
    );
    expect(rootReplit).toMatch(/^\[\[ports\]\]\nlocalPort = 22203$/mu);
  });

  it("packages public templates into the API build artifact", () => {
    const buildSource = readFileSync(
      resolve(workspaceRoot, "artifacts/api-server/build.mjs"),
      "utf8",
    );

    expect(buildSource).toContain("entryPoints: {");
    expect(buildSource).toContain(
      'app: path.resolve(artifactDir, "src/app.ts")',
    );
    expect(buildSource).toContain('"src/revenueCatPreflight.ts"');
    expect(buildSource).toContain('"src/lib/productionConfig.ts"');
    expect(buildSource).toContain('"../cut-os/server/templates"');
    expect(buildSource).toContain('"public-site/templates"');
  });

  it("keeps production preflight and database gates ahead of one listener", () => {
    const entrypoint = readFileSync(
      resolve(workspaceRoot, "artifacts/api-server/src/index.ts"),
      "utf8",
    );
    const publicSite = readFileSync(
      resolve(workspaceRoot, "artifacts/api-server/src/publicSite.ts"),
      "utf8",
    );
    const configurationGate = entrypoint.indexOf(
      "assertProductionConfiguration();",
    );
    const providerGate = entrypoint.indexOf(
      "await assertRevenueCatProductionConfiguration();",
    );
    const databaseGate = entrypoint.indexOf(
      "await prepareProductionDatabase();",
    );
    const listener = entrypoint.indexOf("app.listen(port");
    const startInvocation = entrypoint.indexOf("void start().catch(");

    expect(configurationGate).toBeGreaterThan(-1);
    expect(providerGate).toBeGreaterThan(configurationGate);
    expect(databaseGate).toBeGreaterThan(providerGate);
    expect(listener).toBeGreaterThan(databaseGate);
    expect(startInvocation).toBeGreaterThan(listener);
    expect(entrypoint.match(/app\.listen\(/gu)).toHaveLength(1);
    expect(publicSite).not.toMatch(/\.listen\(/u);
  });

  it("ships a sanitized read-only RevenueCat verification command", () => {
    const runner = readFileSync(
      resolve(workspaceRoot, "artifacts/api-server/src/revenueCatPreflight.ts"),
      "utf8",
    );

    expect(runner).toContain("verifyRevenueCatConfiguration({");
    expect(runner).toContain('process.env["REVENUECAT_SECRET_API_KEY"]');
    expect(runner).toContain("RevenueCatConfigurationPreflightError");
    expect(runner).toContain('status: "failed", reason');
    expect(runner).not.toContain("error.message");
    expect(runner).not.toContain("error.stack");
    expect(runner).not.toContain("JSON.stringify(error)");
  });

  it("smokes the built production gates on loopback without provider routes", () => {
    const dryRun = readFileSync(
      resolve(workspaceRoot, "ops/scripts/production-topology-dry-run.mjs"),
      "utf8",
    );

    expect(dryRun).toContain(
      '"artifacts/api-server/dist/productionConfig.mjs"',
    );
    expect(dryRun).toContain('NODE_ENV: "production"');
    expect(dryRun).toContain("BUILD_SHA: dryRunBuildSha");
    expect(dryRun).toContain("assertProductionConfiguration(process.env)");
    expect(dryRun).toContain('BASE_PATH: "/mounted-app"');
    expect(dryRun).toContain(
      'PUBLIC_APP_ORIGIN: "https://split-origin.cutos.app"',
    );
    expect(dryRun).toContain(
      'BUILD_SHA: "0123456789ABCDEF0123456789ABCDEF01234567"',
    );
    expect(dryRun).toContain("build_sha: dryRunBuildSha");
    expect(dryRun).toContain('server = app.listen(0, "127.0.0.1")');
    expect(dryRun).toContain('request("/api/healthz"');
    expect(dryRun).not.toContain('request("/api/readyz"');
    expect(dryRun).not.toContain('request("/api/me"');
    expect(dryRun).not.toContain('request("/api/__clerk"');
    for (const filename of [
      "production-landing-page.html",
      "privacy.html",
      "terms.html",
      "support.html",
      "legal.css",
      "legal-publication-approval.json",
    ]) {
      expect(dryRun).toContain(`"${filename}"`);
    }
  });
});
