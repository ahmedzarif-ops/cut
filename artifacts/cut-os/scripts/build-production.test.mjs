import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const artifactDirectory = resolve(scriptsDirectory, "..");
const workspaceDirectory = resolve(artifactDirectory, "../..");
const productionBuildPath = resolve(scriptsDirectory, "build-production.mjs");

describe("Replit production public-site build", () => {
  it("validates the production handler without invoking preview tooling", () => {
    const result = spawnSync(process.execPath, [productionBuildPath], {
      cwd: artifactDirectory,
      encoding: "utf8",
      env: {
        LEGAL_SITE_PUBLICATION_STATUS: "draft",
        NODE_ENV: "production",
        PUBLIC_APP_ORIGIN: "https://ci.cutos.app",
      },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "Validated CUT production public site without generating Expo preview assets.",
    );
    expect(result.stderr).toBe("");

    const source = readFileSync(productionBuildPath, "utf8");
    for (const forbiddenProductionDependency of [
      "child_process",
      "static-build",
      "build.js",
      '"pnpm"',
      '"expo"',
    ]) {
      expect(source).not.toContain(forbiddenProductionDependency);
    }
  });

  it("keeps legacy Expo bundling and the mobile artifact behind development commands", () => {
    const packageRecord = JSON.parse(
      readFileSync(resolve(artifactDirectory, "package.json"), "utf8"),
    );
    expect(packageRecord.scripts.build).toBe(
      "node scripts/build-production.mjs",
    );
    expect(packageRecord.scripts["build:preview"]).toBe(
      "node scripts/build.js",
    );

    const artifactConfiguration = readFileSync(
      resolve(artifactDirectory, ".replit-artifact/artifact.toml"),
      "utf8",
    );
    expect(artifactConfiguration).not.toMatch(/^\[services\.production\]$/mu);
    expect(artifactConfiguration).toMatch(
      /\[services\.development\][\s\S]*?@workspace\/cut-os[\s\S]*?run dev/u,
    );

    const workspacePackage = JSON.parse(
      readFileSync(resolve(workspaceDirectory, "package.json"), "utf8"),
    );
    expect(workspacePackage.packageManager).toBe("pnpm@10.34.5");
    expect(workspacePackage.scripts["build:production"]).toBe(
      "pnpm --filter @workspace/api-server run build",
    );
    expect(workspacePackage.scripts["start:production"]).toBe(
      "node --enable-source-maps artifacts/api-server/dist/index.mjs",
    );
  });

  it("fails closed when the canonical public origin is missing", () => {
    const result = spawnSync(process.execPath, [productionBuildPath], {
      cwd: artifactDirectory,
      encoding: "utf8",
      env: {
        LEGAL_SITE_PUBLICATION_STATUS: "draft",
        NODE_ENV: "production",
      },
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("PUBLIC_APP_ORIGIN");
  });
});
