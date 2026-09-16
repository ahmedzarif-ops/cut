#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isProductionBuildProfile } from "./validate-release-config.mjs";

const directory = dirname(fileURLToPath(import.meta.url));

const RELEASE_CONFIGURATION_STEP = {
  name: "release configuration",
  script: join(directory, "validate-release-config.mjs"),
  args: [],
};

const PRODUCTION_ONLY_STEPS = [
  {
    name: "approved legal source",
    script: join(directory, "..", "server", "validate-legal-site.mjs"),
    args: ["--release"],
  },
  {
    name: "live legal site",
    script: join(directory, "..", "server", "verify-live-legal-site.mjs"),
    args: [],
  },
];

export function getEasBuildPreInstallSteps(environment = process.env) {
  const profile = environment.EAS_BUILD_PROFILE?.trim() || "production";
  const production = isProductionBuildProfile(profile);

  return {
    profile,
    steps: [
      RELEASE_CONFIGURATION_STEP,
      ...(production ? PRODUCTION_ONLY_STEPS : []),
    ],
  };
}

function executeStep(step, environment) {
  const result = spawnSync(process.execPath, [step.script, ...step.args], {
    env: environment,
    stdio: "inherit",
  });

  if (result.error || result.status === null) {
    console.error(`EAS pre-install failed: ${step.name} could not start.`);
    return 1;
  }
  return result.status;
}

export function runEasBuildPreInstall(options = {}) {
  const environment = options.environment ?? process.env;
  const runStep = options.runStep ?? executeStep;
  const { profile, steps } = getEasBuildPreInstallSteps(environment);

  for (const step of steps) {
    const status = runStep(step, environment);
    if (status !== 0) {
      console.error(`EAS pre-install failed at ${step.name}.`);
      return status || 1;
    }
  }

  console.log(`EAS pre-install validation passed for the ${profile} profile.`);
  return 0;
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  process.exitCode = runEasBuildPreInstall();
}
