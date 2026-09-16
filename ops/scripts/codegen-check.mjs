#!/usr/bin/env node
// codegen-check.mjs — P1-10 codegen drift gate.
//
// Regenerates the committed API codegen from lib/api-spec/openapi.yaml and fails if
// the working tree's generated output differs from what is committed. This guards the
// edit-and-forget failure mode: openapi.yaml changes but the committed
// lib/api-zod / lib/api-client-react output goes stale, so the server keeps validating
// with old schemas while typecheck stays green (audit P1-10).
//
// Wired into the build gate (root package.json "build"). Run manually with
// `pnpm run codegen:check`. To fix a reported drift, run `pnpm run codegen` and commit
// the regenerated files.
//
// Design notes:
//  - Stronger than `git diff --exit-code`: uses `git status --porcelain
//    --untracked-files=all` so a NEW or DELETED generated file (which a plain diff would
//    miss) also fails the gate.
//  - cwd-independent: git commands run against the repo root, because a git pathspec that
//    matches nothing returns empty — a false PASS — and this gate's whole job is to never
//    false-pass, whatever cwd it is invoked from.
//  - No shell: every command is run via execFileSync with an argv array, so the generated
//    dir paths can never be shell-interpreted.
import { execFileSync } from "node:child_process";

// Generated (codegen-owned) directories, repo-root-relative. Sibling files like
// custom-fetch.ts and index.ts are hand-written wrappers and are deliberately NOT covered.
const GENERATED_DIRS = [
  "lib/api-zod/src/generated",
  "lib/api-client-react/src/generated",
];

const git = (args, opts = {}) =>
  execFileSync("git", args, { encoding: "utf8", ...opts });

// Resolve the repo root once; all subsequent git/pnpm calls run from there.
let root;
try {
  root = git(["rev-parse", "--show-toplevel"]).trim();
} catch {
  console.error("codegen:check FAIL — not inside a git repository.");
  process.exit(1);
}

// 1. Regenerate using the exact command developers run, so the gate can never disagree
//    with the documented workflow.
try {
  execFileSync("pnpm", ["--filter", "@workspace/api-spec", "run", "codegen"], {
    stdio: "inherit",
    cwd: root,
  });
} catch {
  console.error("\ncodegen:check FAIL — codegen itself failed (see output above).");
  process.exit(1);
}

// 2. Assert the committed generated output is byte-identical to the regenerated output.
const drift = git(
  ["status", "--porcelain", "--untracked-files=all", "--", ...GENERATED_DIRS],
  { cwd: root },
).trim();

if (drift) {
  console.error(
    "\ncodegen:check FAIL — committed API codegen is out of sync with openapi.yaml.",
  );
  console.error("  Drifted paths (status: ' M' modified, '??' new, ' D' deleted):");
  for (const line of drift.split("\n")) console.error("    " + line);
  console.error("\n  Fix: run `pnpm run codegen` and commit the regenerated files.\n");
  process.exit(1);
}

console.log("codegen:check OK — generated API output is in sync with openapi.yaml.");
