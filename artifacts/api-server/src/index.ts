import app from "./app";
import { logger } from "./lib/logger";
import { getPool } from "@workspace/db";
import { createShutdownHandler } from "./lib/shutdown";
import { startAccountDeletionWorker } from "./services/accountDeletionWorker";
import { assertProductionConfiguration } from "./lib/productionConfig";
import {
  prepareProductionDatabase,
  StartupMigrationError,
} from "./lib/startupMigrations";

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

async function start(): Promise<void> {
  // Autoscaled replicas coordinate through a bounded PostgreSQL advisory lock;
  // no HTTP traffic is accepted until committed migrations have completed.
  await prepareProductionDatabase();

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  const configuredDeletionInterval = Number(
    process.env["ACCOUNT_DELETION_RETRY_INTERVAL_MS"] ?? 60_000,
  );
  const accountDeletionWorker = startAccountDeletionWorker({
    intervalMs:
      Number.isFinite(configuredDeletionInterval) &&
      configuredDeletionInterval > 0
        ? configuredDeletionInterval
        : 60_000,
  });

  const shutdown = createShutdownHandler({
    server,
    closePool: async () => {
      await accountDeletionWorker.stop();
      await getPool()?.end();
    },
    logger,
    timeoutMs: Number(process.env["SHUTDOWN_TIMEOUT_MS"] ?? 10_000),
    exit: (code) => process.exit(code),
  });

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

void start().catch(async (error: unknown) => {
  const errorCode =
    error instanceof StartupMigrationError ? error.code : "startup_failed";
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
