import { createHash } from "node:crypto";
import { db, type Db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * The exact latest committed migration expected by this server build.
 * readiness.test.ts locks these values to the committed Drizzle journal and
 * SQL file, so adding or editing a migration cannot silently leave this stale.
 */
export const EXPECTED_MIGRATION = Object.freeze({
  tag: "0013_mushy_lord_hawal",
  createdAt: 1_788_508_286_322,
  sha256: "632f11c47e96ddfda4c9dd3cbc6d8d58aa0ba36f8cc73517d83a5be816586a68",
});

export class ApiReadinessError extends Error {
  readonly code: "database_unavailable" | "migration_not_current";

  constructor(code: ApiReadinessError["code"]) {
    super("API is not ready");
    this.name = "ApiReadinessError";
    this.code = code;
  }
}

type MigrationRow = {
  hash: string;
  created_at: string | number;
};

/**
 * Verify both database connectivity and the exact migration revision expected
 * by this server binary. Errors deliberately contain no database details.
 */
export async function checkDatabaseReadiness(database: Db = db): Promise<void> {
  try {
    await database.execute(sql`select 1 as database_ready`);
  } catch {
    throw new ApiReadinessError("database_unavailable");
  }

  let rows: MigrationRow[];
  try {
    const result = await database.execute<MigrationRow>(sql`
      select "hash", "created_at"
      from "drizzle"."__drizzle_migrations"
      order by "created_at" desc
      limit 1
    `);
    rows = result.rows;
  } catch {
    throw new ApiReadinessError("migration_not_current");
  }

  const [migration] = rows;
  if (
    !migration ||
    migration.hash !== EXPECTED_MIGRATION.sha256 ||
    Number(migration.created_at) !== EXPECTED_MIGRATION.createdAt
  ) {
    throw new ApiReadinessError("migration_not_current");
  }
}

/** Test-only helper used to lock EXPECTED_MIGRATION to its SQL contents. */
export function migrationSha256(sqlContents: string): string {
  return createHash("sha256").update(sqlContents).digest("hex");
}
