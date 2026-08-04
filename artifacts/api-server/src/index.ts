import app from "./app";
import { logger } from "./lib/logger";
import { getPool } from "@workspace/db";
import { createShutdownHandler, parseShutdownTimeout } from "./lib/shutdown";
import { startAccountDeletionWorker } from "./services/accountDeletionWorker";
import { assertProductionConfiguration } from "./lib/productionConfig";
import {
  prepareProductionDatabase,
  StartupMigrationError,
} from "./lib/startupMigrations";
import {
  DEFAULT_ACCOUNT_DELETION_RETRY_INTERVAL_MS,
  parseAccountDeletionRetryInterval,
} from "./lib/accountDeletionRetryInterval";
import {
  assertRevenueCatProductionConfiguration,
  RevenueCatConfigurationPreflightError,
} from "./lib/revenueCatConfigurationPreflight";

// Development and test remain easy to run, but a production process must not
// bind a port with placeholder credentials, an insecure database transport,
// or no usable browser origin.
assertProductionConfiguration();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const shutdownTimeoutMs = parseShutdownTimeout(
  process.env["SHUTDOWN_TIMEOUT_MS"],
);

async function start(): Promise<void> {
  // Semantic/auth/configuration mismatches remain fatal. A sanitized transient
  // provider outage is degraded instead of taking down unrelated account and
  // deletion APIs; subscription endpoints continue to fail closed themselves.
  const revenueCatConfiguration =
    await assertRevenueCatProductionConfiguration();
  if (revenueCatConfiguration.status === "degraded") {
    logger.warn(
      { errorCode: `revenuecat_${revenueCatConfiguration.reason}` },
      "RevenueCat configuration could not be reverified during startup",
    );
  }

  // Autoscaled replicas coordinate through a bounded PostgreSQL advisory lock;
  // no HTTP traffic is accepted until committed migrations have completed.
  await prepareProductionDatabase();

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  const configuredDeletionInterval = parseAccountDeletionRetryInterval(
    process.env["ACCOUNT_DELETION_RETRY_INTERVAL_MS"],
  );
  const accountDeletionWorker = startAccountDeletionWorker({
    // Production preflight rejects an invalid override before this point.
    // Development remains recoverable by using the bounded default.
    intervalMs:
      configuredDeletionInterval ?? DEFAULT_ACCOUNT_DELETION_RETRY_INTERVAL_MS,
  });

  const shutdown = createShutdownHandler({
    server,
    closePool: async () => {
      await accountDeletionWorker.stop();
      await getPool()?.end();
    },
    logger,
    timeoutMs: shutdownTimeoutMs,
    exit: (code) => process.exit(code),
  });

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void start().catch(async (error: unknown) => {
  const errorCode =
    error instanceof StartupMigrationError
      ? error.code
      : error instanceof RevenueCatConfigurationPreflightError
        ? `revenuecat_${error.reason}`
        : "startup_failed";
  // Never log the underlying migration/connection error; drivers may include
  // the production DSN or SQL data in messages and nested fields.
  logger.fatal({ errorCode }, "Server startup failed");
  try {
    await getPool()?.end();
  } catch {
    logger.error(
      { errorCode: "db_pool_close_failed" },
      "Error closing DB pool after startup failure",
    );
  }
  process.exit(1);
});
