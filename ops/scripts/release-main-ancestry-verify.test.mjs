import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ReleaseMainAncestryError,
  verifyReleaseMainAncestry,
} from "./release-main-ancestry-verify.mjs";

function git(repoRoot, ...args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: "1" },
  }).trim();
}

function write(repoRoot, relativePath, contents) {
  const target = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function commit(repoRoot, file, contents, message) {
  write(repoRoot, file, contents);
  git(repoRoot, "add", "--all", "--");
  git(repoRoot, "commit", "-q", "-m", message);
  return git(repoRoot, "rev-parse", "HEAD");
}

function submission(testModeState) {
  return `${JSON.stringify({
    appReview: { clerkReviewAccess: { testModeState } },
  })}\n`;
}

function createRepository(t) {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "cut-main-ancestry-"));
  t.after(() => rmSync(repoRoot, { force: true, recursive: true }));
  git(repoRoot, "init", "-q");
  git(repoRoot, "config", "user.name", "CUT CI");
  git(repoRoot, "config", "user.email", "ci@example.invalid");

  const baseSha = commit(repoRoot, "base.txt", "base\n", "base");
  git(repoRoot, "switch", "-q", "-c", "release");
  const middleSha = commit(repoRoot, "middle.txt", "middle\n", "middle");
  const buildSha = commit(repoRoot, "build.txt", "build\n", "build");

  write(
    repoRoot,
    "app-store/testflight-submission.json",
    `${JSON.stringify({ exactBuildEvidence: { gitCommit: buildSha } })}\n`,
  );
  write(
    repoRoot,
    "app-store/app-store-submission.json",
    submission("enabled_for_app_review"),
  );
  git(repoRoot, "add", "--all", "--");
  git(repoRoot, "commit", "-q", "-m", "app review evidence");
  const appReviewSha = git(repoRoot, "rev-parse", "HEAD");

  write(
    repoRoot,
    "app-store/app-store-submission.json",
    submission("disabled_for_public_release"),
  );
  git(repoRoot, "add", "--all", "--");
  git(repoRoot, "commit", "-q", "-m", "public release evidence");
  const publicReleaseSha = git(repoRoot, "rev-parse", "HEAD");

  git(repoRoot, "switch", "-q", "-c", "sibling", baseSha);
  const siblingSha = commit(repoRoot, "sibling.txt", "sibling\n", "sibling");
  git(repoRoot, "switch", "-q", "release");
  git(repoRoot, "switch", "-q", "-c", "advanced", appReviewSha);
  const advancedSha = commit(
    repoRoot,
    "advanced.txt",
    "advanced\n",
    "advanced",
  );
  git(repoRoot, "switch", "-q", "release");

  return {
    repoRoot,
    baseSha,
    middleSha,
    buildSha,
    appReviewSha,
    publicReleaseSha,
    siblingSha,
    advancedSha,
  };
}

function checkout(repoRoot, sha) {
  git(repoRoot, "checkout", "-q", "--detach", sha);
}

function setOriginMain(repoRoot, sha) {
  git(repoRoot, "update-ref", "refs/remotes/origin/main", sha);
}

function verifyPr(repo, headSha, baseSha, overrides = {}) {
  checkout(repo.repoRoot, headSha);
  setOriginMain(repo.repoRoot, baseSha);
  return verifyReleaseMainAncestry({
    repoRoot: repo.repoRoot,
    eventName: "pull_request",
    expectedHeadSha: headSha,
    prBaseSha: baseSha,
    prBaseRef: "main",
    ...overrides,
  });
}

function verifyPush(repo, headSha, beforeSha, overrides = {}) {
  checkout(repo.repoRoot, headSha);
  return verifyReleaseMainAncestry({
    repoRoot: repo.repoRoot,
    eventName: "push",
    expectedHeadSha: headSha,
    pushBeforeSha: beforeSha,
    gitRef: "refs/heads/main",
    ...overrides,
  });
}

function expectCode(code) {
  return (error) =>
    error instanceof ReleaseMainAncestryError && error.code === code;
}

test("App Review accepts a current main many commits behind BUILD_SHA", (t) => {
  const repo = createRepository(t);
  assert.deepEqual(verifyPr(repo, repo.appReviewSha, repo.baseSha), {
    target: "app_review",
  });
});

test("App Review rejects an unrelated current main", (t) => {
  const repo = createRepository(t);
  assert.throws(
    () => verifyPr(repo, repo.appReviewSha, repo.siblingSha),
    expectCode("release_push_not_fast_forward"),
  );
});

test("public release accepts only an exact App Review main baseline", (t) => {
  const repo = createRepository(t);
  assert.deepEqual(verifyPr(repo, repo.publicReleaseSha, repo.appReviewSha), {
    target: "public_release",
  });
  assert.throws(
    () => verifyPr(repo, repo.publicReleaseSha, repo.baseSha),
    expectCode("public_release_main_not_frozen_at_app_review"),
  );
  assert.throws(
    () => verifyPr(repo, repo.publicReleaseSha, repo.advancedSha),
    expectCode("release_push_not_fast_forward"),
  );
});

test("fast-forward pushes M to A and A to P are accepted", (t) => {
  const repo = createRepository(t);
  assert.deepEqual(verifyPush(repo, repo.appReviewSha, repo.middleSha), {
    target: "app_review",
  });
  assert.deepEqual(verifyPush(repo, repo.publicReleaseSha, repo.appReviewSha), {
    target: "public_release",
  });
});

test("forced and malformed push baselines are rejected", (t) => {
  const repo = createRepository(t);
  assert.throws(
    () => verifyPush(repo, repo.appReviewSha, repo.siblingSha),
    expectCode("release_push_not_fast_forward"),
  );
  assert.throws(
    () => verifyPush(repo, repo.appReviewSha, "0".repeat(40)),
    expectCode("release_push_before_invalid"),
  );
  assert.throws(
    () => verifyPush(repo, repo.appReviewSha, undefined),
    expectCode("release_push_before_invalid"),
  );
});

test("event head, main branch, fetched base, and commit objects are exact", (t) => {
  const repo = createRepository(t);
  checkout(repo.repoRoot, repo.appReviewSha);
  setOriginMain(repo.repoRoot, repo.baseSha);
  assert.throws(
    () =>
      verifyReleaseMainAncestry({
        repoRoot: repo.repoRoot,
        eventName: "pull_request",
        expectedHeadSha: repo.publicReleaseSha,
        prBaseSha: repo.baseSha,
        prBaseRef: "main",
      }),
    expectCode("release_event_head_mismatch"),
  );
  assert.throws(
    () =>
      verifyPr(repo, repo.appReviewSha, repo.baseSha, { prBaseRef: "develop" }),
    expectCode("release_pr_base_branch_invalid"),
  );
  assert.throws(
    () =>
      verifyReleaseMainAncestry({
        repoRoot: repo.repoRoot,
        eventName: "pull_request",
        expectedHeadSha: repo.appReviewSha,
        prBaseSha: repo.siblingSha,
        prBaseRef: "main",
      }),
    expectCode("release_pr_base_sha_mismatch"),
  );
  assert.throws(
    () =>
      verifyReleaseMainAncestry({
        repoRoot: repo.repoRoot,
        eventName: "pull_request",
        expectedHeadSha: repo.appReviewSha,
        prBaseSha: "f".repeat(40),
        prBaseRef: "main",
      }),
    expectCode("release_pr_base_sha_invalid"),
  );
});

test("Git replacement refs are rejected", (t) => {
  const repo = createRepository(t);
  git(repo.repoRoot, "replace", repo.buildSha, repo.siblingSha);
  assert.throws(
    () => verifyPr(repo, repo.appReviewSha, repo.baseSha),
    expectCode("release_git_replacement_refs_forbidden"),
  );
});
