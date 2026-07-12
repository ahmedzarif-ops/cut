import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../lib/db/migrations");

function migrationSqlInOrder(): string[] {
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf-8"),
  ) as { entries: Array<{ tag: string }> };
  return journal.entries.map((entry) =>
    fs.readFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf-8"),
  );
}

describe("committed migrations", () => {
  it("build the schema from a blank database", async () => {
    const client = new PGlite();
    for (const sql of migrationSqlInOrder()) await client.exec(sql);

    const tables = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    expect(tables.rows.map((r) => r.table_name)).toEqual([
      "profiles",
      "users",
    ]);
    await client.close();
  });

  it("baseline is adoption-safe: re-applying over an existing schema succeeds", async () => {
    // Environments that predate migrations were created with `drizzle-kit
    // push`. The first `migrate` run there re-executes the baseline against
    // the already-present schema — it must be a no-op, not an error.
    const client = new PGlite();
    const migrations = migrationSqlInOrder();
    for (const sql of migrations) await client.exec(sql);
    for (const sql of migrations) await client.exec(sql); // second apply

    const fks = await client.query<{ conname: string }>(
      `select conname from pg_constraint where conname = 'profiles_user_id_users_id_fk'`,
    );
    expect(fks.rows).toHaveLength(1);
    await client.close();
  });
});
