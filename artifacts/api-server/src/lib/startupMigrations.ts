import { fileURLToPath } from "node:url";
import { drizzle, type NodePgClient } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, getPool } from "@workspace/db";
import { checkDatabaseReadiness } from "./readiness";

// Stable, application-specific 64-bit key. Every API replica must use the same
// value so only one process can apply committed migrations at a time.
const MIGRATION_ADVISORY_LOCK_KEY = "485018309019";
const DEFAULT_LOCK_TIMEOUT_MS = 30_000;
const DEFAULT_STATEMENT_TIMEOUT_MS = 60_000;
const LOCK_POLL_INTERVAL_MS = 250;
export const MAX_MIGRATION_LOCK_TIMEOUT_MS = 300_000;
export const MAX_MIGRATION_STATEMENT_TIMEOUT_MS = 60_000;

type QueryResult<Row extends Record<string, unknown>> = { rows: Row[] };

export interface MigrationClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
  release(error?: Error | boolean): void;
}

export interface MigrationPool {
  connect(): Promise<MigrationClient>;
}

export type StartupMigrationErrorCode =
  | "database_unavailable"
  | "database_not_ready"
  | "migration_lock_timeout"
  | "migration_failed"
  | "migration_lock_release_failed";

export class StartupMigrationError extends Error {
  readonly code: StartupMigrationErrorCode;

  constructor(code: StartupMigrationErrorCode) {
    super("Production database preparation failed");
    this.name = "StartupMigrationError";
    this.code = code;
  }
}

type StartupMigrationDependencies = {
  pool: MigrationPool;
  migrationsFolder: string;
  lockTimeoutMs: number;
  statementTimeoutMs: number;
  runMigrations?: (
    client: MigrationClient,
    migrationsFolder: string,
  ) => Promise<void>;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function boundedMilliseconds(
  rawValue: string | undefined,
  fallback: number,
  maximum: number,
): number {
  const value = Number(rawValue);
  return Number.isInteger(value) && value > 0 && value <= maximum
    ? value
    : fallback;
}

async function runDrizzleMigrations(
  client: MigrationClient,
  migrationsFolder: string,
): Promise<void> {
  const database = drizzle(client as NodePgClient);
  await migrate(database, { migrationsFolder });
}

/**
 * Apply committed migrations while holding a bounded session advisory lock.
 * The dedicated client is also the migration client, which guarantees the lock
 * remains held for the complete Drizzle transaction.
 */
export async function runStartupMigrations(
  dependencies: StartupMigrationDependencies,
): Promise<void> {
  const now = dependencies.now ?? Date.now;
  const wait = dependencies.sleep ?? sleep;
  const runMigrations = dependencies.runMigrations ?? runDrizzleMigrations;

  let client: MigrationClient;
  try {
    client = await dependencies.pool.connect();
  } catch {
    throw new StartupMigrationError("database_unavailable");
  }

  let acquired = false;
  let discardClient = false;
  let failure: StartupMigrationError | undefined;

  try {
    await client.query("select set_config('statement_timeout', $1, false)", [
      `${dependencies.statementTimeoutMs}ms`,
    ]);
    await client.query("select set_config('lock_timeout', $1, false)", [
      `${dependencies.statementTimeoutMs}ms`,
    ]);

    const deadline = now() + dependencies.lockTimeoutMs;
    while (!acquired) {
      const result = await client.query<{ locked: boolean }>(
        "select pg_try_advisory_lock($1::bigint) as locked",
        [MIGRATION_ADVISORY_LOCK_KEY],
      );
      acquired = result.rows[0]?.locked === true;
      if (acquired) break;

      const remaining = deadline - now();
      if (remaining <= 0) {
        throw new StartupMigrationError("migration_lock_timeout");
      }
      await wait(Math.min(LOCK_POLL_INTERVAL_MS, remaining));
    }

    await runMigrations(client, dependencies.migrationsFolder);
  } catch (error) {
    failure =
      error instanceof StartupMigrationError
        ? error
        : new StartupMigrationError("migration_failed");
  }

  if (acquired) {
    try {
      const result = await client.query<{ unlocked: boolean }>(
        "select pg_advisory_unlock($1::bigint) as unlocked",
        [MIGRATION_ADVISORY_LOCK_KEY],
      );
      if (result.rows[0]?.unlocked !== true) {
        throw new Error("Advisory lock was not released");
      }
    } catch {
      discardClient = true;
      failure ??= new StartupMigrationError("migration_lock_release_failed");
    }
  }

  try {
    await client.query("reset statement_timeout");
    await client.query("reset lock_timeout");
  } catch {
    // Never return a client carrying startup-only timeout settings to the pool.
    discardClient = true;
    failure ??= new StartupMigrationError("migration_lock_release_failed");
  } finally {
    client.release(discardClient);
  }

  if (failure) throw failure;
}

/** Production-only wrapper used by index.ts before the HTTP listener binds. */
export async function ensureProductionMigrations(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (env.NODE_ENV !== "production") return;

  try {
    // Initialize the shared pool without running an application query.
    getDb();
  } catch {
    throw new StartupMigrationError("database_unavailable");
  }
  const pool = getPool();
  if (!pool) throw new StartupMigrationError("database_unavailable");

  await runStartupMigrations({
    pool: pool as unknown as MigrationPool,
    migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)),
    lockTimeoutMs: boundedMilliseconds(
      env.MIGRATION_LOCK_TIMEOUT_MS,
      DEFAULT_LOCK_TIMEOUT_MS,
      MAX_MIGRATION_LOCK_TIMEOUT_MS,
    ),
    statementTimeoutMs: boundedMilliseconds(
      env.MIGRATION_STATEMENT_TIMEOUT_MS,
      DEFAULT_STATEMENT_TIMEOUT_MS,
      MAX_MIGRATION_STATEMENT_TIMEOUT_MS,
    ),
  });
}

type ProductionDatabasePreparationDependencies = {
  migrate?: (env: NodeJS.ProcessEnv) => Promise<void>;
  checkReadiness?: () => Promise<void>;
};

/**
 * Complete production gate used before app.listen: migrate first, then prove
 * that the database's latest recorded revision exactly matches this build.
 */
export async function prepareProductionDatabase(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: ProductionDatabasePreparationDependencies = {},
): Promise<void> {
  if (env.NODE_ENV !== "production") return;

  await (dependencies.migrate ?? ensureProductionMigrations)(env);
  try {
    await (dependencies.checkReadiness ?? checkDatabaseReadiness)();
  } catch {
    throw new StartupMigrationError("database_not_ready");
  }
}
