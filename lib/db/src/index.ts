import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export type Db = NodePgDatabase<typeof schema>;

let _pool: pg.Pool | null = null;
let _db: Db | null = null;

function createDefaultDb(): Db {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return drizzle(_pool, { schema });
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
