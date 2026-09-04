import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "@workspace/db";
import {
  ApiReadinessError,
  checkDatabaseReadiness,
  EXPECTED_MIGRATION,
  migrationSha256,
} from "./readiness";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../lib/db/migrations");

let client: PGlite | undefined;

afterEach(async () => {
  await client?.close();
  client = undefined;
});

async function createReadinessDatabase(input?: {
  hash?: string;
  createdAt?: number;
  includeMigration?: boolean;
}): Promise<Db> {
  client = new PGlite();
  await client.exec(`
    create schema drizzle;
    create table drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    );
  `);
  if (input?.includeMigration !== false) {
    await client.query(
      `insert into drizzle.__drizzle_migrations (hash, created_at)
       values ($1, $2)`,
      [
        input?.hash ?? EXPECTED_MIGRATION.sha256,
        input?.createdAt ?? EXPECTED_MIGRATION.createdAt,
      ],
    );
  }
  return drizzle(client) as unknown as Db;
}

describe("API database readiness", () => {
  it("locks the expected revision to the latest committed journal entry", () => {
    const journal = JSON.parse(
      fs.readFileSync(
        path.join(MIGRATIONS_DIR, "meta", "_journal.json"),
        "utf8",
      ),
    ) as { entries: Array<{ tag: string; when: number }> };
    const latest = journal.entries.at(-1);
    const migrationSql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, `${EXPECTED_MIGRATION.tag}.sql`),
      "utf8",
    );

    expect(latest).toMatchObject({
      tag: EXPECTED_MIGRATION.tag,
      when: EXPECTED_MIGRATION.createdAt,
    });
    expect(migrationSha256(migrationSql)).toBe(EXPECTED_MIGRATION.sha256);
  });

  it("passes when the database responds and has the exact expected revision", async () => {
    const database = await createReadinessDatabase();
    await expect(checkDatabaseReadiness(database)).resolves.toBeUndefined();
  });

  it("fails closed when the expected migration is absent", async () => {
    const database = await createReadinessDatabase({ includeMigration: false });
    await expect(checkDatabaseReadiness(database)).rejects.toMatchObject({
      name: "ApiReadinessError",
      code: "migration_not_current",
      message: "API is not ready",
    });
  });

  it("fails closed when the expected migration hash does not match", async () => {
    const database = await createReadinessDatabase({
      hash: "0".repeat(64),
    });
    await expect(checkDatabaseReadiness(database)).rejects.toBeInstanceOf(
      ApiReadinessError,
    );
    await expect(checkDatabaseReadiness(database)).rejects.toMatchObject({
      code: "migration_not_current",
    });
  });

  it("fails closed when the database migration journal is ahead of this build", async () => {
    const database = await createReadinessDatabase({
      createdAt: EXPECTED_MIGRATION.createdAt + 1,
    });
    await expect(checkDatabaseReadiness(database)).rejects.toMatchObject({
      code: "migration_not_current",
      message: "API is not ready",
    });
  });

  it("sanitizes database connection failures", async () => {
    const secretDsn = [
      "postgresql://private-user",
      "private-password@db.example.com/cut",
    ].join(":");
    const database = {
      execute: async () => {
        throw new Error(`could not connect to ${secretDsn}`);
      },
    } as unknown as Db;

    let thrown: unknown;
    try {
      await checkDatabaseReadiness(database);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({
      code: "database_unavailable",
      message: "API is not ready",
    });
    expect(JSON.stringify(thrown)).not.toContain("private-user");
    expect(JSON.stringify(thrown)).not.toContain("private-password");
    expect(JSON.stringify(thrown)).not.toContain("db.example.com");
  });
});
