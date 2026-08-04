#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MAX_FILES = 100_000;
const MAX_FILE_BYTES = 512 * 1024 * 1024;

const VALUE_RULES = [
  {
    id: "private_key_material",
    expression: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gu,
  },
  {
    id: "clerk_secret_key",
    expression:
      /(?<![A-Za-z0-9_-])sk_(?:live|test)_[A-Za-z0-9_-]{16,}(?![A-Za-z0-9_-])/gu,
  },
  {
    id: "revenuecat_secret_api_key",
    // RevenueCat's native SDK embeds two exact secret-prefix-shaped event names.
    // Extended variants remain credential candidates and must still fail closed.
    expression:
      /(?<![A-Za-z0-9_-])sk_(?!(?:live|test)_)(?!(?:receipt_request_(?:started|finished))(?![A-Za-z0-9_-]))(?=[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_-]))(?=[A-Za-z0-9_-]*[A-Za-z0-9])[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_-])/gu,
  },
  {
    id: "credentialed_postgres_url",
    expression: /\bpostgres(?:ql)?:\/\/[^\s:/@]+:[^\s/@]+@[^\s"'`<>]+/gu,
  },
  {
    id: "github_access_token",
    expression:
      /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{40,255})\b/gu,
  },
  {
    id: "aws_access_key_id",
    expression: /\bAKIA[0-9A-Z]{16}\b/gu,
  },
];

const ARCHIVE_NAME_RULES = [
  {
    id: "server_secret_name_database",
    expression: /\bDATABASE_URL\b/gu,
  },
  {
    id: "server_secret_name_clerk",
    expression: /\bCLERK_SECRET_KEY\b/gu,
  },
  {
    id: "server_secret_name_revenuecat",
    expression: /\bREVENUECAT_SECRET_API_KEY\b/gu,
  },
  {
    id: "server_configuration_name_clerk",
    expression: /\bCLERK_PUBLISHABLE_KEY\b/gu,
  },
  {
    id: "server_configuration_name_revenuecat",
    expression:
      /\bREVENUECAT_(?:PROJECT|ENTITLEMENT_REST|APP_REST|OFFERING_REST)_ID\b/gu,
  },
  {
    id: "server_configuration_name_api",
    expression:
      /\b(?:CORS_ALLOWED_ORIGINS|PUBLIC_APP_ORIGIN|API_MAX_INSTANCES|ACCOUNT_DELETION_RETRY_INTERVAL_MS|API_RATE_LIMIT|CLERK_RATE_LIMIT|PG_POOL_MAX|LEGAL_SITE_PUBLICATION_STATUS|SHUTDOWN_TIMEOUT_MS)\b/gu,
  },
  {
    id: "release_credential_name_expo",
    expression: /\bEXPO_TOKEN\b/gu,
  },
  {
    id: "release_credential_name_apple",
    expression: /\b(?:APPLE_APP_SPECIFIC_PASSWORD|EXPO_ASC_API_KEY_PATH)\b/gu,
  },
];

export class SecretBoundaryScanError extends Error {
  constructor(code) {
    super(`Secret boundary scan failed: ${code}`);
    this.name = "SecretBoundaryScanError";
    this.code = code;
  }
}

function normalizedRelativePath(value) {
  return value.split(path.sep).join("/");
}

function matchRules(content, relativePath, rules) {
  const findings = [];
  for (const rule of rules) {
    rule.expression.lastIndex = 0;
    for (const match of content.matchAll(rule.expression)) {
      findings.push({
        ruleId: rule.id,
        relativePath,
        byteOffset: match.index ?? 0,
      });
    }
  }
  return findings;
}

/**
 * Scan bytes without ever returning the matched value. Latin-1 preserves a
 * one-character-to-one-byte mapping for the ASCII-only credential rules.
 */
export function inspectBytes(bytes, relativePath, mode) {
  if (mode !== "tracked" && mode !== "archive") {
    throw new SecretBoundaryScanError("invalid_mode");
  }
  const content = Buffer.from(bytes).toString("latin1");
  const normalizedPath = normalizedRelativePath(relativePath);
  return [
    ...matchRules(content, normalizedPath, VALUE_RULES),
    ...(mode === "archive"
      ? matchRules(content, normalizedPath, ARCHIVE_NAME_RULES)
      : []),
  ];
}

async function scanRegularFile(absolutePath, relativePath, mode) {
  const stats = await lstat(absolutePath);
  if (!stats.isFile()) {
    throw new SecretBoundaryScanError("non_regular_file");
  }
  if (stats.size > MAX_FILE_BYTES) {
    throw new SecretBoundaryScanError("file_too_large");
  }
  return inspectBytes(await readFile(absolutePath), relativePath, mode);
}

function trackedFiles(repositoryRoot) {
  const result = spawnSync("git", ["ls-files", "-z", "--cached"], {
    cwd: repositoryRoot,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0 || result.error) {
    throw new SecretBoundaryScanError("git_ls_files_failed");
  }
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

export async function scanTrackedRepository(repositoryRoot = process.cwd()) {
  const root = await realpath(repositoryRoot);
  const files = trackedFiles(root);
  if (files.length > MAX_FILES) {
    throw new SecretBoundaryScanError("too_many_files");
  }

  const findings = [];
  for (const relativePath of files) {
    const absolutePath = path.resolve(root, relativePath);
    const relative = path.relative(root, absolutePath);
    if (
      relative.startsWith(`..${path.sep}`) ||
      relative === ".." ||
      path.isAbsolute(relative)
    ) {
      throw new SecretBoundaryScanError("tracked_path_escape");
    }
    findings.push(
      ...(await scanRegularFile(absolutePath, relativePath, "tracked")),
    );
  }
  return { filesScanned: files.length, findings };
}

async function archiveFiles(root) {
  const files = [];
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        throw new SecretBoundaryScanError("archive_symlink_not_allowed");
      }
      if (entry.isDirectory()) {
        pending.push(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
        if (files.length > MAX_FILES) {
          throw new SecretBoundaryScanError("too_many_files");
        }
      } else {
        throw new SecretBoundaryScanError("archive_special_file_not_allowed");
      }
    }
  }
  files.sort();
  return files;
}

export async function scanExportedArchive(archiveDirectory) {
  if (!archiveDirectory) {
    throw new SecretBoundaryScanError("archive_directory_required");
  }
  const root = await realpath(archiveDirectory);
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory()) {
    throw new SecretBoundaryScanError("archive_must_be_directory");
  }

  const files = await archiveFiles(root);
  if (files.length === 0) {
    throw new SecretBoundaryScanError("archive_empty");
  }

  const findings = [];
  for (const absolutePath of files) {
    const relativePath = path.relative(root, absolutePath);
    findings.push(
      ...(await scanRegularFile(absolutePath, relativePath, "archive")),
    );
  }
  return { filesScanned: files.length, findings };
}

function printResult(mode, result) {
  if (result.findings.length === 0) {
    console.log(
      `PASS secret-boundary mode=${mode} files=${result.filesScanned} findings=0`,
    );
    return 0;
  }

  console.error(
    `FAIL secret-boundary mode=${mode} files=${result.filesScanned} findings=${result.findings.length}`,
  );
  for (const finding of result.findings) {
    console.error(
      `- ${finding.ruleId} ${finding.relativePath} byte=${finding.byteOffset}`,
    );
  }
  return 1;
}

export async function main(arguments_ = process.argv.slice(2)) {
  const [mode, target, ...extras] = arguments_;
  if (extras.length > 0 || (mode === "tracked" && target)) {
    throw new SecretBoundaryScanError("invalid_arguments");
  }
  if (mode === "tracked") {
    return printResult(mode, await scanTrackedRepository());
  }
  if (mode === "archive") {
    return printResult(mode, await scanExportedArchive(target));
  }
  throw new SecretBoundaryScanError("usage_tracked_or_archive");
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      const code =
        error instanceof SecretBoundaryScanError
          ? error.code
          : "unexpected_error";
      console.error(`FAIL secret-boundary error=${code}`);
      process.exitCode = 1;
    });
}
