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
// The check is intentionally stronger than `git diff --exit-code`: it uses
// `git status --porcelain --untracked-files=all` so a NEW or DELETED generated file
// (which a plain diff would miss) also fails the gate. It never mutates the index.
import { execSync } from "node:child_process";

// Generated (codegen-owned) directories. Sibling files like custom-fetch.ts and
// index.ts are hand-written wrappers and are deliberately NOT covered.
const GENERATED_DIRS = [
  "lib/api-zod/src/generated",
  "lib/api-client-react/src/generated",
];

const capture = (cmd) => execSync(cmd, { stdio: "pipe", encoding: "utf8" });
const dirsArg = GENERATED_DIRS.join(" ");

// 1. Regenerate using the exact command developers run, so the gate can never disagree
//    with the documented workflow.
try {
  execSync("pnpm --filter @workspace/api-spec run codegen", { stdio: "inherit" });
} catch {
  console.error("\n✖ codegen:check — codegen itself failed (see output above).");
  process.exit(1);
}

// 2. Assert the committed generated output is byte-identical to the regenerated output.
const drift = capture(`git status --porcelain --untracked-files=all -- ${dirsArg}`).trim();

if (drift) {
  console.error(
    "\n✖ codegen drift detected — committed API codegen is out of sync with openapi.yaml.",
  );
  console.error("  Changed paths:");
  for (const line of drift.split("\n")) console.error("    " + line);
  console.error("\n  Fix: run `pnpm run codegen` and commit the regenerated files.\n");
  console.error(capture(`git --no-pager diff -- ${dirsArg}`));
  process.exit(1);
}

console.log("✓ codegen:check — generated API output is in sync with openapi.yaml.");
