import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export type Db = NodePgDatabase<typeof schema>;

export interface PoolConfig {
  connectionString: string | undefined;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Connection-pool budget. `max` is env-tunable (PG_POOL_MAX, default 5) —
 * conservative for a single autoscale instance against a pooled Postgres
 * endpoint. Pure, so it can be unit-tested without a live database.
 */
export function poolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  return {
    connectionString: env.DATABASE_URL,
    max: Number(env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

let _pool: pg.Pool | null = null;
let _db: Db | null = null;

function createDefaultDb(): Db {
  const config = poolConfig();
  if (!config.connectionString) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  const pool = new Pool(config);
  // An idle-client error (DB dropped the connection, network blip) is emitted
  // on the pool. Without a listener Node treats it as an unhandled 'error' and
  // crashes the process. Log the signal (no health values — privacy rule) and
  // let the pool evict the dead client.
  pool.on("error", (err) => {
    console.error("[db] idle pool client error", err);
  });
  _pool = pool;
  return drizzle(pool, { schema });
}

/**
 * The shared Drizzle database handle. Initialized lazily on first query so
 * importing this module never requires DATABASE_URL (tooling, typechecks,
 * and tests can import the schema without a live database).
 */
export function getDb(): Db {
  if (!_db) _db = createDefaultDb();
  return _db;
}

/**
 * Test seam: replace the database handle (e.g. with a PGlite-backed Drizzle
 * instance). Pass `null` to reset back to the DATABASE_URL default.
 */
export function setDb(db: Db | null): void {
  _db = db;
}

/** The underlying pg Pool, when the default DATABASE_URL client is in use. */
export function getPool(): pg.Pool | null {
  return _pool;
}

/**
 * Stable `db` export used by all query sites. A lazy proxy over getDb() so
 * `import { db }` keeps working while deferring connection/env resolution to
 * the first actual query.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = instance[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export * from "./schema";
