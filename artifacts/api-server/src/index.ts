import app from "./app";
import { logger } from "./lib/logger";
import { getPool } from "@workspace/db";
import { createShutdownHandler } from "./lib/shutdown";
import { startAccountDeletionWorker } from "./services/accountDeletionWorker";

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
