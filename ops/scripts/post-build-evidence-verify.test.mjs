import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  chmod,
  mkdtemp,
  mkdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  PostBuildEvidenceError,
  validateBuildSha,
  validatePinnedRoutingBytes,
  verifyPostBuildEvidenceBoundary,
} from "./post-build-evidence-verify.mjs";

const script = fileURLToPath(
  new URL("./post-build-evidence-verify.mjs", import.meta.url),
);
const releaseManifestPath = "release-evidence/1.0.0-1-20260803T120000Z.md";

function git(repoRoot, ...args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${result.stderr}`,
  );
  return result.stdout.trim();
}

async function writeRepoFile(repoRoot, relativePath, contents) {
  const target = path.join(repoRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function commitAll(repoRoot, message) {
  git(repoRoot, "add", "--all", "--");
  git(repoRoot, "commit", "-q", "-m", message);
  return git(repoRoot, "rev-parse", "HEAD");
}

async function createRepository(t, { pinnedRouting = true } = {}) {
  const repoRoot = await mkdtemp(
    path.join(os.tmpdir(), "cut-post-build-evidence-"),
  );
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  git(repoRoot, "init", "-q");
  git(repoRoot, "config", "user.email", "release-test@example.invalid");
  git(repoRoot, "config", "user.name", "Release Test");

  const easConfig = {
    cli: { requireCommit: true },
    submit: pinnedRouting
      ? { production: { ios: { ascAppId: "1234567890" } } }
      : { production: {} },
  };
  const initialFiles = [
    ["artifacts/cut-os/eas.json", `${JSON.stringify(easConfig, null, 2)}\n`],
    ["artifacts/cut-os/app.json", '{"name":"CUT OS"}\n'],
    ["app-store/app-store-submission.json", '{"status":"draft"}\n'],
    [
      "app-store/testflight-submission.json",
      '{"exactBuildEvidence":{"gitCommit":null}}\n',
    ],
    ["app-store/screenshots/manifest.json", '{"shots":[]}\n'],
    ["app-store/app-store-connect-territories.json", "{}\n"],
    [releaseManifestPath, "# Release evidence\n\nStatus: DRAFT\n"],
    ["APP_REVIEW_RUNBOOK.md", "# Review\n"],
    ["PURCHASE_QA_REPORT.md", "# Purchase QA\n"],
    ["QA_REPORT.md", "# QA\n"],
    ["pnpm-lock.yaml", "lockfileVersion: '9.0'\n"],
    [".github/workflows/release.yml", "name: release\n"],
    ["ops/scripts/check.mjs", "export const ready = true;\n"],
  ];
  for (const [relativePath, contents] of initialFiles) {
    await writeRepoFile(repoRoot, relativePath, contents);
  }
  const buildSha = await commitAll(repoRoot, "build candidate");
  return { buildSha, repoRoot };
}

async function writeEvidenceCommit(
  repoRoot,
  buildSha,
  {
    checksumMatches = true,
    manifestReferencesScreenshot = true,
    testFlightBuildSha = buildSha,
  } = {},
) {
  const screenshotName = "CUTOS-v1.0.0-b1-en-US-01.png";
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    '{"status":"evidence-complete"}\n',
  );
  await writeRepoFile(
    repoRoot,
    "app-store/testflight-submission.json",
    `${JSON.stringify({ exactBuildEvidence: { gitCommit: testFlightBuildSha } })}\n`,
  );
  await writeRepoFile(
    repoRoot,
    "app-store/screenshots/manifest.json",
    `${JSON.stringify({ shots: manifestReferencesScreenshot ? [{ file: screenshotName }] : [] })}\n`,
  );
  await writeRepoFile(
    repoRoot,
    `app-store/screenshots/files/${screenshotName}`,
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  );
  const manifest = Buffer.from(
    `# Release evidence\n\nStatus: FINAL\nBUILD_SHA: ${buildSha}\n`,
    "utf8",
  );
  await writeRepoFile(repoRoot, releaseManifestPath, manifest);
  const digest = checksumMatches
    ? createHash("sha256").update(manifest).digest("hex")
    : "0".repeat(64);
  await writeRepoFile(
    repoRoot,
    `${releaseManifestPath}.sha256`,
    `${digest}  ${releaseManifestPath}\n`,
  );
  return commitAll(repoRoot, "post-build evidence");
}

function expectCode(code) {
  return (error) => {
    assert.ok(error instanceof PostBuildEvidenceError);
    assert.equal(error.code, code);
    return true;
  };
}

test("accepts only a full lowercase commit SHA", () => {
  assert.equal(validateBuildSha("a".repeat(40)), "a".repeat(40));
  for (const value of [
    "a".repeat(39),
    "A".repeat(40),
    "--help",
    `${"a".repeat(40)}^{tree}`,
    "; touch /tmp/not-allowed",
  ]) {
    assert.throws(
      () => validateBuildSha(value),
      expectCode("build_sha_must_be_full_lowercase_hex"),
    );
  }
});

test("accepts exactly one clean, checksum-bound evidence child", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  const postBuildEvidenceSha = await writeEvidenceCommit(repoRoot, buildSha);
  assert.deepEqual(verifyPostBuildEvidenceBoundary({ repoRoot }), {
    buildSha,
    postBuildEvidenceSha,
    changedPathCount: 6,
  });
});

test("rejects tracked and untracked dirt", async (t) => {
  for (const [label, relativePath] of [
    ["tracked", "app-store/app-store-submission.json"],
    ["untracked", "untracked.txt"],
  ]) {
    await t.test(label, async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeRepoFile(repoRoot, relativePath, "dirty\n");
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("worktree_not_clean"),
      );
    });
  }
});

test("requires the evidence SHA to be the single direct child of BUILD_SHA", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha);
  await writeRepoFile(
    repoRoot,
    "app-store/app-store-submission.json",
    '{"status":"changed-again"}\n',
  );
  await commitAll(repoRoot, "second evidence commit");
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("evidence_commit_must_directly_follow_build_sha"),
  );
});

test("rejects a sibling BUILD_SHA", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeRepoFile(repoRoot, "QA_REPORT.md", "sibling\n");
  const siblingSha = await commitAll(repoRoot, "sibling");
  git(repoRoot, "checkout", "-q", "-b", "evidence", buildSha);
  await writeEvidenceCommit(repoRoot, buildSha);
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha: siblingSha, repoRoot }),
    expectCode("testflight_build_sha_mismatch"),
  );
});

test("rejects runtime, routing, dependency, workflow, script, and broad QA changes", async (t) => {
  for (const relativePath of [
    "artifacts/cut-os/app.json",
    "artifacts/cut-os/eas.json",
    "pnpm-lock.yaml",
    ".github/workflows/release.yml",
    "ops/scripts/check.mjs",
    "QA_REPORT.md",
    "PURCHASE_QA_REPORT.md",
    "APP_REVIEW_RUNBOOK.md",
  ]) {
    await t.test(relativePath, async (t) => {
      const { buildSha, repoRoot } = await createRepository(t);
      await writeRepoFile(repoRoot, relativePath, "changed after build\n");
      await writeEvidenceCommit(repoRoot, buildSha);
      assert.throws(
        () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
        expectCode("post_build_path_or_operation_not_allowlisted"),
      );
    });
  }
});

test("rejects deletion, rename, executable mode, and symlink evidence", async (t) => {
  await t.test("deletion", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await rm(
      path.join(repoRoot, "app-store/app-store-connect-territories.json"),
    );
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });
  await t.test("rename", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await rename(
      path.join(repoRoot, "app-store/app-store-connect-territories.json"),
      path.join(repoRoot, "app-store/territories-renamed.json"),
    );
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_path_or_operation_not_allowlisted"),
    );
  });
  await t.test("executable mode", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    await chmod(
      path.join(repoRoot, "app-store/app-store-submission.json"),
      0o755,
    );
    await writeEvidenceCommit(repoRoot, buildSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_evidence_must_be_regular_non_executable_file"),
    );
  });
  await t.test("symlink screenshot", async (t) => {
    const { buildSha, repoRoot } = await createRepository(t);
    const postBuildEvidenceSha = await writeEvidenceCommit(repoRoot, buildSha);
    git(repoRoot, "reset", "--soft", buildSha);
    const screenshotPath = path.join(
      repoRoot,
      "app-store/screenshots/files/CUTOS-v1.0.0-b1-en-US-01.png",
    );
    await rm(screenshotPath);
    const outsideImage = `${repoRoot}-outside.png`;
    t.after(() => rm(outsideImage, { force: true }));
    await writeFile(outsideImage, "outside\n");
    await symlink(outsideImage, screenshotPath);
    git(repoRoot, "add", "--all", "--");
    git(repoRoot, "commit", "-q", "-C", postBuildEvidenceSha);
    assert.throws(
      () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
      expectCode("post_build_evidence_must_be_regular_non_executable_file"),
    );
  });
});

test("binds every added PNG exactly to the screenshot manifest", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, {
    manifestReferencesScreenshot: false,
  });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("screenshot_evidence_not_exactly_manifest_bound"),
  );
});

test("requires one existing manifest and an exact adjacent checksum", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, { checksumMatches: false });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("release_manifest_checksum_invalid"),
  );
});

test("cross-checks TestFlight BUILD_SHA", async (t) => {
  const { buildSha, repoRoot } = await createRepository(t);
  await writeEvidenceCommit(repoRoot, buildSha, {
    testFlightBuildSha: "a".repeat(40),
  });
  assert.throws(
    () => verifyPostBuildEvidenceBoundary({ buildSha, repoRoot }),
    expectCode("testflight_build_sha_mismatch"),
  );
});

test("requires byte-identical pinned routing and cli.requireCommit", () => {
  const pinned = Buffer.from(
    '{"cli":{"requireCommit":true},"submit":{"production":{"ios":{"ascAppId":"1234567890"}}}}\n',
  );
  assert.doesNotThrow(() =>
    validatePinnedRoutingBytes({ buildBytes: pinned, evidenceBytes: pinned }),
  );
  assert.throws(
    () =>
      validatePinnedRoutingBytes({
        buildBytes: pinned,
        evidenceBytes: Buffer.from(`${pinned.toString("utf8")} `),
      }),
    expectCode("eas_json_changed_since_build"),
  );
  const noCommitLock = Buffer.from(
    '{"cli":{"requireCommit":false},"submit":{"production":{"ios":{"ascAppId":"1234567890"}}}}\n',
  );
  assert.throws(
    () =>
      validatePinnedRoutingBytes({
        buildBytes: noCommitLock,
        evidenceBytes: noCommitLock,
      }),
    expectCode("eas_cli_require_commit_not_enabled"),
  );
  const unpinned = Buffer.from(
    '{"cli":{"requireCommit":true},"submit":{"production":{}}}\n',
  );
  assert.throws(
    () =>
      validatePinnedRoutingBytes({
        buildBytes: unpinned,
        evidenceBytes: unpinned,
      }),
    expectCode("production_ios_asc_app_id_not_pinned"),
  );
});

test("CLI accepts no ref arguments and emits only a stable code", () => {
  const result = spawnSync(
    process.execPath,
    [script, `${"a".repeat(40)}^{tree}`],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /arguments_not_allowed/u);
  assert.doesNotMatch(result.stderr, /\^\{tree\}/u);
});
