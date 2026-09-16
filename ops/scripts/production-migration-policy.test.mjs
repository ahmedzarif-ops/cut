import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pinnedPnpmCommand = "corepack pnpm";

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function sourceFilesUnder(path) {
  const absolutePath = resolve(repoRoot, path);
  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const childPath = resolve(absolutePath, entry.name);
    if (entry.isDirectory()) {
      return sourceFilesUnder(relative(repoRoot, childPath));
    }
    return /\.[cm]?[jt]sx?$/u.test(entry.name)
      ? [relative(repoRoot, childPath)]
      : [];
  });
}

test("the Replit post-merge hook is dependency-install-only", () => {
  const replitConfiguration = readRepoFile(".replit");
  const postMergeHeader = replitConfiguration.match(/^\[postMerge\]\s*$/mu);
  assert.ok(postMergeHeader, ".replit must keep an explicit postMerge section");
  const sectionRemainder = replitConfiguration.slice(
    (postMergeHeader.index ?? 0) + postMergeHeader[0].length,
  );
  const nextSectionOffset = sectionRemainder.search(/^\[/mu);
  const postMergeSection =
    nextSectionOffset === -1
      ? sectionRemainder
      : sectionRemainder.slice(0, nextSectionOffset);

  const hookPath = postMergeSection.match(/^path\s*=\s*"([^"]+)"\s*$/mu)?.[1];
  assert.equal(
    hookPath,
    "scripts/post-merge.sh",
    "postMerge must remain bound to the audited hook",
  );

  const hookSource = readRepoFile(hookPath);
  assert.equal(hookSource.split(/\r?\n/u)[0], "#!/bin/sh");

  const executableLines = hookSource
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  assert.deepEqual(
    executableLines,
    ["set -eu", `${pinnedPnpmCommand} install --frozen-lockfile`],
    "postMerge may synchronize locked dependencies but may not delegate to or run database commands",
  );
});

test("Replit runtime commands use the repository-pinned pnpm version", () => {
  const replitConfiguration = readRepoFile(".replit");
  const pnpmConfiguration = readRepoFile(".npmrc");
  const workspacePackage = JSON.parse(readRepoFile("package.json"));
  assert.equal(
    workspacePackage.packageManager,
    "pnpm@10.34.5",
    "Corepack must resolve the repository's exact audited pnpm version",
  );
  assert.equal(
    workspacePackage.engines?.pnpm,
    "10.26.1 || 10.34.5",
    "only the observed provider bootstrap and exact project pnpm may pass the engine guard",
  );
  assert.match(
    pnpmConfiguration,
    /^ignore-workspace-root-check=true$/mu,
    "the Replit resolver must be able to install the exact pnpm pin in its ephemeral workspace root",
  );
  assert.match(
    pnpmConfiguration,
    /^manage-package-manager-versions=false$/mu,
    "Replit's ambient pnpm must not self-install the repository pin before Corepack runs the audited build",
  );
  assert.match(
    replitConfiguration,
    /^enabledForHosting\s*=\s*false$/mu,
    "Replit hosting must not run its provider package installer before the audited build command",
  );
  assert.match(
    replitConfiguration,
    /^build\s*=\s*"corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm --filter @workspace\/api-server run build"$/mu,
    "the deployment build must install the frozen dependency graph and invoke the API build directly through Corepack",
  );
  assert.match(
    replitConfiguration,
    /^run\s*=\s*"corepack pnpm run start:production"$/mu,
    "the deployment runtime must use the repository-pinned production start command",
  );
  assert.doesNotMatch(
    replitConfiguration,
    /^\s*deploymentTarget\s*=/mu,
    "the repository must not override the provider-controlled Reserved VM deployment type",
  );
  assert.match(
    replitConfiguration,
    /args\s*=\s*\["corepack",\s*"pnpm",\s*"store",\s*"prune"\]/u,
    "deployment post-build cleanup must use the pinned package manager",
  );
  assert.match(
    replitConfiguration,
    /runButton\s*=\s*"CUT Development"/u,
    "the Replit Run button must select the audited development workflow",
  );
  assert.match(
    replitConfiguration,
    /args\s*=\s*"PORT=8080 corepack pnpm --filter @workspace\/api-server run dev"/u,
    "the development workflow must start the API on its routed port",
  );
  assert.match(
    replitConfiguration,
    /args\s*=\s*"PORT=22203 corepack pnpm --filter @workspace\/cut-os run dev"/u,
    "the development workflow must start Expo on its preview port",
  );

  const artifactConfigurations = [
    "artifacts/api-server/.replit-artifact/artifact.toml",
    "artifacts/cut-os/.replit-artifact/artifact.toml",
    "artifacts/mockup-sandbox/.replit-artifact/artifact.toml",
  ];
  for (const path of artifactConfigurations) {
    const source = readRepoFile(path);
    assert.match(
      source,
      /corepack(?:",\s*")? pnpm|corepack",\s*"pnpm/u,
      `${path} must invoke the pinned package manager through Corepack`,
    );
    assert.doesNotMatch(
      source,
      /pnpm@/u,
      `${path} must let Corepack read packageManager instead of embedding a second version selector`,
    );
    assert.doesNotMatch(
      source,
      /(?:run|build|args)\s*=\s*(?:"pnpm\b|\[\s*"pnpm")/u,
      `${path} must not delegate Replit startup to its ambient pnpm binary`,
    );
  }
});

test("the API startup gate remains the only production migration implementation", () => {
  const productionSourceFiles = [
    ...sourceFilesUnder("artifacts/api-server/src"),
    ...sourceFilesUnder("lib/db/src"),
  ];
  const migratorImplementations = productionSourceFiles.filter((path) =>
    readRepoFile(path).includes("drizzle-orm/node-postgres/migrator"),
  );
  assert.deepEqual(migratorImplementations, [
    "artifacts/api-server/src/lib/startupMigrations.ts",
  ]);

  const entrypoint = readRepoFile("artifacts/api-server/src/index.ts");
  const prepareDatabase = entrypoint.indexOf(
    "await prepareProductionDatabase();",
  );
  const bindListener = entrypoint.indexOf("app.listen(");
  assert.ok(
    prepareDatabase >= 0,
    "the API must await its database startup gate",
  );
  assert.ok(
    bindListener > prepareDatabase,
    "the migration/readiness gate must finish before the API listener binds",
  );

  const startupMigrations = readRepoFile(
    "artifacts/api-server/src/lib/startupMigrations.ts",
  );
  const productionOnlyGuard = startupMigrations.indexOf(
    'if (env.NODE_ENV !== "production") return;',
  );
  const lockedMigration = startupMigrations.indexOf(
    "await runStartupMigrations({",
  );
  const migrationStep = startupMigrations.indexOf(
    "await (dependencies.migrate ?? ensureProductionMigrations)(env);",
  );
  const readinessStep = startupMigrations.indexOf(
    "await (dependencies.checkReadiness ?? checkDatabaseReadiness)();",
  );

  assert.ok(
    productionOnlyGuard >= 0,
    "the startup migrator must be production-only",
  );
  assert.ok(
    lockedMigration > productionOnlyGuard,
    "production migrations must flow through the advisory-lock implementation",
  );
  assert.ok(migrationStep >= 0, "database preparation must apply migrations");
  assert.ok(
    readinessStep > migrationStep,
    "exact migration readiness must be checked after migrations complete",
  );
});
