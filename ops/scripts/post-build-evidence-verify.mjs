#!/usr/bin/env node

import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  EasSubmitConfigurationError,
  validateEasSubmitConfig,
} from "./eas-submit-config-verify.mjs";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const EAS_JSON_PATH = "artifacts/cut-os/eas.json";
const TESTFLIGHT_RECORD_PATH = "app-store/testflight-submission.json";
const SCREENSHOT_MANIFEST_PATH = "app-store/screenshots/manifest.json";
const FULL_LOWERCASE_GIT_SHA = /^[0-9a-f]{40}$/u;
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;

export const POST_BUILD_MUTABLE_EVIDENCE_PATHS = Object.freeze([
  "app-store/app-store-connect-territories.json",
  "app-store/app-store-submission.json",
  SCREENSHOT_MANIFEST_PATH,
  TESTFLIGHT_RECORD_PATH,
]);

const SCREENSHOT_EVIDENCE_PATH =
  /^app-store\/screenshots\/files\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.png$/u;
const RELEASE_MANIFEST_PATH =
  /^release-evidence\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.md$/u;

export class PostBuildEvidenceError extends Error {
  constructor(code) {
    super(`Post-build evidence verification failed: ${code}`);
    this.name = "PostBuildEvidenceError";
    this.code = code;
  }
}

function fail(code) {
  throw new PostBuildEvidenceError(code);
}

export function validateBuildSha(buildSha) {
  if (typeof buildSha !== "string" || !FULL_LOWERCASE_GIT_SHA.test(buildSha)) {
    fail("build_sha_must_be_full_lowercase_hex");
  }
  return buildSha;
}

function runGit(repoRoot, args, acceptedStatuses = [0]) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: null,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" },
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
  });
  if (
    result.error ||
    result.signal ||
    !acceptedStatuses.includes(result.status)
  ) {
    fail("git_command_failed");
  }
  return result;
}

function gitBlob(repoRoot, commit, relativePath) {
  return runGit(repoRoot, ["show", `${commit}:${relativePath}`]).stdout;
}

function parseJsonBlob(repoRoot, commit, relativePath, errorCode) {
  try {
    return JSON.parse(gitBlob(repoRoot, commit, relativePath).toString("utf8"));
  } catch (error) {
    if (error instanceof PostBuildEvidenceError) throw error;
    fail(errorCode);
  }
}

function parseNameStatus(output) {
  const tokens = output
    .toString("utf8")
    .split("\0")
    .filter((token) => token.length > 0);
  if (tokens.length % 2 !== 0) fail("git_output_invalid");
  const changes = [];
  for (let index = 0; index < tokens.length; index += 2) {
    const status = tokens[index];
    const changedPath = tokens[index + 1];
    if (!/^[AMDT]$/u.test(status) || changedPath.length === 0) {
      fail("git_output_invalid");
    }
    changes.push({ status, path: changedPath });
  }
  return changes;
}

function treeEntry(repoRoot, commit, relativePath) {
  const output = runGit(repoRoot, [
    "ls-tree",
    "-z",
    commit,
    "--",
    relativePath,
  ]).stdout;
  const entries = output
    .toString("utf8")
    .split("\0")
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return null;
  if (entries.length !== 1) fail("git_output_invalid");
  const separator = entries[0].indexOf("\t");
  if (separator === -1) fail("git_output_invalid");
  const [mode, type, objectId] = entries[0].slice(0, separator).split(" ");
  const returnedPath = entries[0].slice(separator + 1);
  if (
    returnedPath !== relativePath ||
    !mode ||
    !type ||
    !FULL_LOWERCASE_GIT_SHA.test(objectId ?? "")
  ) {
    fail("git_output_invalid");
  }
  return { mode, type, objectId };
}

function requireRegularBlob(entry) {
  if (!entry || entry.mode !== "100644" || entry.type !== "blob") {
    fail("post_build_evidence_must_be_regular_non_executable_file");
  }
}

export function validatePinnedRoutingBytes({ buildBytes, evidenceBytes }) {
  if (!Buffer.isBuffer(buildBytes) || !Buffer.isBuffer(evidenceBytes)) {
    fail("eas_json_unreadable");
  }
  if (!buildBytes.equals(evidenceBytes)) {
    fail("eas_json_changed_since_build");
  }

  let config;
  try {
    config = JSON.parse(evidenceBytes.toString("utf8"));
  } catch {
    fail("eas_json_invalid");
  }
  if (config?.cli?.requireCommit !== true) {
    fail("eas_cli_require_commit_not_enabled");
  }
  try {
    validateEasSubmitConfig(config);
  } catch (error) {
    if (error instanceof EasSubmitConfigurationError) fail(error.code);
    fail("eas_submit_routing_verification_failed");
  }
}

function verifyReleaseManifestChecksum({
  evidenceCommit,
  manifestPath,
  repoRoot,
}) {
  const manifestBytes = gitBlob(repoRoot, evidenceCommit, manifestPath);
  const checksumPath = `${manifestPath}.sha256`;
  const checksumBytes = gitBlob(repoRoot, evidenceCommit, checksumPath);
  const digest = createHash("sha256").update(manifestBytes).digest("hex");
  const expected = Buffer.from(`${digest}  ${manifestPath}\n`, "utf8");
  if (!checksumBytes.equals(expected))
    fail("release_manifest_checksum_invalid");
}

/**
 * Prove that HEAD is the single, clean evidence commit directly after the
 * immutable build/upload SHA. The raw two-tree diff is operation-, mode-, and
 * path-constrained, so runtime changes, reverts, symlinks, and executable blobs
 * cannot be hidden inside the evidence boundary.
 */
export function verifyPostBuildEvidenceBoundary({
  buildSha,
  repoRoot = REPOSITORY_ROOT,
} = {}) {
  const resolvedRoot = path.resolve(repoRoot);

  const worktree = runGit(resolvedRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ]).stdout;
  if (worktree.length > 0) fail("worktree_not_clean");

  const headSha = runGit(resolvedRoot, ["rev-parse", "--verify", "HEAD"])
    .stdout.toString("utf8")
    .trim();
  if (!FULL_LOWERCASE_GIT_SHA.test(headSha)) fail("git_output_invalid");

  const testFlight = parseJsonBlob(
    resolvedRoot,
    headSha,
    TESTFLIGHT_RECORD_PATH,
    "testflight_record_invalid",
  );
  const recordedBuildSha = testFlight?.exactBuildEvidence?.gitCommit;
  validateBuildSha(recordedBuildSha);
  if (buildSha !== undefined) {
    validateBuildSha(buildSha);
    if (buildSha !== recordedBuildSha) fail("testflight_build_sha_mismatch");
  }
  const expectedBuildSha = recordedBuildSha;

  const buildLookup = runGit(
    resolvedRoot,
    ["cat-file", "-e", `${expectedBuildSha}^{commit}`],
    [0, 1, 128],
  );
  if (buildLookup.status !== 0) fail("build_sha_not_a_commit");

  const ancestry = runGit(resolvedRoot, [
    "rev-list",
    "--parents",
    "-n",
    "1",
    "HEAD",
    "--",
  ])
    .stdout.toString("utf8")
    .trim()
    .split(/\s+/u);
  if (
    ancestry.length !== 2 ||
    ancestry[0] !== headSha ||
    ancestry[1] !== expectedBuildSha
  ) {
    fail("evidence_commit_must_directly_follow_build_sha");
  }

  const changes = parseNameStatus(
    runGit(resolvedRoot, [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "--no-renames",
      "-r",
      "-z",
      expectedBuildSha,
      headSha,
      "--",
    ]).stdout,
  );
  if (changes.length === 0) fail("post_build_evidence_diff_empty");

  const modifiedReleaseManifests = [];
  const addedChecksums = [];
  const addedScreenshots = [];
  for (const change of changes) {
    const buildEntry = treeEntry(resolvedRoot, expectedBuildSha, change.path);
    const evidenceEntry = treeEntry(resolvedRoot, headSha, change.path);
    if (
      POST_BUILD_MUTABLE_EVIDENCE_PATHS.includes(change.path) &&
      change.status === "M"
    ) {
      requireRegularBlob(buildEntry);
      requireRegularBlob(evidenceEntry);
      continue;
    }
    if (SCREENSHOT_EVIDENCE_PATH.test(change.path) && change.status === "A") {
      if (buildEntry !== null)
        fail("post_build_evidence_operation_not_allowed");
      requireRegularBlob(evidenceEntry);
      addedScreenshots.push(change.path);
      continue;
    }
    if (RELEASE_MANIFEST_PATH.test(change.path) && change.status === "M") {
      requireRegularBlob(buildEntry);
      requireRegularBlob(evidenceEntry);
      modifiedReleaseManifests.push(change.path);
      continue;
    }
    if (
      change.path.endsWith(".md.sha256") &&
      RELEASE_MANIFEST_PATH.test(change.path.slice(0, -".sha256".length)) &&
      change.status === "A"
    ) {
      if (buildEntry !== null)
        fail("post_build_evidence_operation_not_allowed");
      requireRegularBlob(evidenceEntry);
      addedChecksums.push(change.path);
      continue;
    }
    fail("post_build_path_or_operation_not_allowlisted");
  }

  if (
    modifiedReleaseManifests.length !== 1 ||
    addedChecksums.length !== 1 ||
    addedChecksums[0] !== `${modifiedReleaseManifests[0]}.sha256`
  ) {
    fail("exact_release_manifest_and_checksum_required");
  }
  verifyReleaseManifestChecksum({
    evidenceCommit: headSha,
    manifestPath: modifiedReleaseManifests[0],
    repoRoot: resolvedRoot,
  });

  const screenshotManifest = parseJsonBlob(
    resolvedRoot,
    headSha,
    SCREENSHOT_MANIFEST_PATH,
    "screenshot_manifest_invalid",
  );
  const referencedScreenshots = new Set(
    (Array.isArray(screenshotManifest?.shots) ? screenshotManifest.shots : [])
      .filter((shot) => typeof shot?.file === "string")
      .map((shot) => `app-store/screenshots/files/${shot.file}`),
  );
  if (
    addedScreenshots.some(
      (screenshot) => !referencedScreenshots.has(screenshot),
    ) ||
    [...referencedScreenshots].some(
      (screenshot) => !addedScreenshots.includes(screenshot),
    )
  ) {
    fail("screenshot_evidence_not_exactly_manifest_bound");
  }

  validatePinnedRoutingBytes({
    buildBytes: gitBlob(resolvedRoot, expectedBuildSha, EAS_JSON_PATH),
    evidenceBytes: gitBlob(resolvedRoot, headSha, EAS_JSON_PATH),
  });

  return Object.freeze({
    buildSha: expectedBuildSha,
    postBuildEvidenceSha: headSha,
    changedPathCount: changes.length,
  });
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    if (process.argv.length !== 2) fail("arguments_not_allowed");
    verifyPostBuildEvidenceBoundary();
    console.log(
      "PASS  HEAD is the clean, checksum-bound evidence commit directly after BUILD_SHA",
    );
  } catch (error) {
    const code =
      error instanceof PostBuildEvidenceError
        ? error.code
        : "verification_failed";
    console.error(`FAIL  post-build evidence boundary is invalid  (${code})`);
    process.exitCode = 1;
  }
}
