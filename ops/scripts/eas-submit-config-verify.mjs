#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const CONFIG_PATH = new URL("../../artifacts/cut-os/eas.json", import.meta.url);
const NUMERIC_ASC_APP_ID = /^[1-9][0-9]*$/u;

export class EasSubmitConfigurationError extends Error {
  constructor(code) {
    super(`EAS submit configuration verification failed: ${code}`);
    this.name = "EasSubmitConfigurationError";
    this.code = code;
  }
}

/**
 * Validate only the non-secret, deterministic iOS submission routing value.
 * App Store Connect API keys and Apple credentials do not belong in eas.json.
 */
export function validateEasSubmitConfig(config) {
  const ascAppId = config?.submit?.production?.ios?.ascAppId;
  if (typeof ascAppId !== "string" || !NUMERIC_ASC_APP_ID.test(ascAppId)) {
    throw new EasSubmitConfigurationError(
      "production_ios_asc_app_id_not_pinned",
    );
  }
  return true;
}

async function loadConfig() {
  let source;
  try {
    source = await readFile(CONFIG_PATH, "utf8");
  } catch {
    throw new EasSubmitConfigurationError("eas_json_unreadable");
  }

  try {
    return JSON.parse(source);
  } catch {
    throw new EasSubmitConfigurationError("eas_json_invalid");
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    if (process.argv.length !== 2) {
      throw new EasSubmitConfigurationError("arguments_not_allowed");
    }
    validateEasSubmitConfig(await loadConfig());
    console.log(
      "PASS  production iOS submit profile pins a numeric App Store Connect app ID",
    );
  } catch (error) {
    const code =
      error instanceof EasSubmitConfigurationError
        ? error.code
        : "verification_failed";
    console.error(`FAIL  EAS submit configuration is not ready  (${code})`);
    process.exitCode = 1;
  }
}
