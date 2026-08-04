#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TESTFLIGHT_RECORD_PATH = "app-store/testflight-submission.json";
const SUBMISSION_RECORD_PATH = "app-store/app-store-submission.json";
const FULL_LOWERCASE_GIT_SHA = /^[0-9a-f]{40}$/u;
const ZERO_GIT_SHA = "0".repeat(40);

export class ReleaseMainAncestryError extends Error {
  constructor(code) {
    super(code);
    this.name = "ReleaseMainAncestryError";
    this.code = code;
  }
}

function fail(code) {
  throw new ReleaseMainAncestryError(code);
}

function isRealSha(value) {
  return FULL_LOWERCASE_GIT_SHA.test(value ?? "") && value !== ZERO_GIT_SHA;
}

function runGit(repoRoot, args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" },
    maxBuffer: 1024 * 1024,
  });
  return result;
}

function requireCommit(repoRoot, sha, code) {
  if (!isRealSha(sha)) fail(code);
  const result = runGit(repoRoot, ["cat-file", "-e", `${sha}^{commit}`]);
  if (result.status !== 0) fail(code);
}

function resolveCommit(repoRoot, ref, code) {
  const result = runGit(repoRoot, ["rev-parse", "--verify", `${ref}^{commit}`]);
  const sha = result.stdout.trim();
  if (result.status !== 0 || !isRealSha(sha)) fail(code);
  return sha;
}

function requireAncestor(repoRoot, ancestor, descendant, code) {
  requireCommit(repoRoot, ancestor, code);
  requireCommit(repoRoot, descendant, code);
  const result = runGit(repoRoot, [
    "merge-base",
    "--is-ancestor",
    ancestor,
    descendant,
  ]);
  if (result.status !== 0) fail(code);
}

function readJson(repoRoot, relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
  } catch {
    fail("release_main_ancestry_record_invalid");
  }
}

export function verifyReleaseMainAncestry({
  repoRoot = REPOSITORY_ROOT,
  eventName = process.env.EVENT_NAME,
  expectedHeadSha = process.env.EXPECTED_HEAD_SHA,
  prBaseSha = process.env.PR_BASE_SHA,
  prBaseRef = process.env.PR_BASE_REF,
  pushBeforeSha = process.env.PUSH_BEFORE_SHA,
  gitRef = process.env.GIT_REF,
} = {}) {
  const replacementRefs = runGit(repoRoot, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace/",
  ]);
  if (replacementRefs.status !== 0 || replacementRefs.stdout.trim() !== "") {
    fail("release_git_replacement_refs_forbidden");
  }

  requireCommit(repoRoot, expectedHeadSha, "release_event_head_invalid");
  const actualHead = resolveCommit(
    repoRoot,
    "HEAD",
    "release_event_head_invalid",
  );
  if (actualHead !== expectedHeadSha) fail("release_event_head_mismatch");

  const testFlight = readJson(repoRoot, TESTFLIGHT_RECORD_PATH);
  const submission = readJson(repoRoot, SUBMISSION_RECORD_PATH);
  const buildSha = testFlight?.exactBuildEvidence?.gitCommit;
  requireCommit(repoRoot, buildSha, "release_build_sha_invalid");

  const testModeState = submission?.appReview?.clerkReviewAccess?.testModeState;
  let target;
  if (testModeState === "enabled_for_app_review") {
    target = "app_review";
  } else if (testModeState === "disabled_for_public_release") {
    target = "public_release";
  } else {
    fail("release_target_state_invalid");
  }

  const headParent = resolveCommit(
    repoRoot,
    "HEAD^",
    "release_evidence_parent_invalid",
  );
  if (target === "app_review") {
    if (headParent !== buildSha) fail("release_evidence_parent_invalid");
  } else {
    const headGrandparent = resolveCommit(
      repoRoot,
      "HEAD^^",
      "release_evidence_parent_invalid",
    );
    if (headGrandparent !== buildSha) fail("release_evidence_parent_invalid");
  }

  let baseline;
  if (eventName === "pull_request") {
    if (prBaseRef !== "main") fail("release_pr_base_branch_invalid");
    requireCommit(repoRoot, prBaseSha, "release_pr_base_sha_invalid");
    const fetchedMain = resolveCommit(
      repoRoot,
      "refs/remotes/origin/main",
      "release_pr_base_sha_invalid",
    );
    if (fetchedMain !== prBaseSha) fail("release_pr_base_sha_mismatch");
    baseline = prBaseSha;
  } else if (eventName === "push") {
    if (gitRef !== "refs/heads/main") fail("release_push_ref_invalid");
    requireCommit(repoRoot, pushBeforeSha, "release_push_before_invalid");
    baseline = pushBeforeSha;
  } else {
    fail("release_event_invalid");
  }

  requireAncestor(
    repoRoot,
    baseline,
    actualHead,
    "release_push_not_fast_forward",
  );
  if (target === "app_review") {
    requireAncestor(
      repoRoot,
      baseline,
      buildSha,
      "app_review_candidate_missing_current_main",
    );
  } else if (baseline !== headParent) {
    fail("public_release_main_not_frozen_at_app_review");
  }

  return { target };
}

function isMainModule() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
    : false;
}

if (isMainModule()) {
  try {
    verifyReleaseMainAncestry();
  } catch (error) {
    const code =
      error instanceof ReleaseMainAncestryError
        ? error.code
        : "release_main_ancestry_verification_failed";
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  }
}
