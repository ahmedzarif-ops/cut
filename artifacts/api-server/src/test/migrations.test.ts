import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../lib/db/migrations");

function migrationSqlInOrder(): string[] {
  const journal = JSON.parse(
    fs.readFileSync(
      path.join(MIGRATIONS_DIR, "meta", "_journal.json"),
      "utf-8",
    ),
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
      "account_deletion_requests",
      "meal_entries",
      "meal_entry_deletion_tombstones",
      "profiles",
      "users",
      "weight_entries",
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
    // Only the hand-adjusted baseline is adoption-safe. Later migrations are
    // tracked by the migrations journal and are intentionally applied once.
    await client.exec(migrations[0]);

    const fks = await client.query<{ conname: string }>(
      `select conname from pg_constraint where conname = 'profiles_user_id_users_id_fk'`,
    );
    expect(fks.rows).toHaveLength(1);
    await client.close();
  });

  it("backfills catalog versions on existing meals without leaving a default", async () => {
    const client = new PGlite();
    const migrations = migrationSqlInOrder();
    const catalogMigrationIndex = migrations.findIndex((sql) =>
      sql.includes('ADD COLUMN "catalog_version"'),
    );
    expect(catalogMigrationIndex).toBeGreaterThan(0);
    for (const sql of migrations.slice(0, catalogMigrationIndex)) {
      await client.exec(sql);
    }

    const userId = "4cb20514-51c9-4aee-974e-d11ed2fb8d8e";
    await client.query(
      `insert into users (id, clerk_user_id) values ($1, 'catalog_migration_user')`,
      [userId],
    );
    await client.query(
      `insert into meal_entries (
        id, user_id, client_request_id, logged_on, template_id, name,
        serving_description, servings, calories_kcal_per_serving,
        protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving,
        fiber_g_per_serving
      ) values (
        'ff5886c9-3fbc-4a16-b77f-37362351521a', $1,
        'd008283f-2e1c-48e2-8df9-9a1317621ebd', '2026-08-03',
        'legacy-template', 'Legacy meal', '1 plate', 1, 500, 30, 50, 20, 8
      )`,
      [userId],
    );

    await client.exec(migrations[catalogMigrationIndex]!);

    const meals = await client.query<{ catalog_version: string }>(
      `select catalog_version from meal_entries`,
    );
    expect(meals.rows).toEqual([{ catalog_version: "2026-08-03.1" }]);

    const [column] = (
      await client.query<{
        column_default: string | null;
        is_nullable: string;
      }>(
        `select column_default, is_nullable
         from information_schema.columns
         where table_schema = 'public'
           and table_name = 'meal_entries'
           and column_name = 'catalog_version'`,
      )
    ).rows;
    expect(column).toEqual({ column_default: null, is_nullable: "NO" });
    await client.close();
  });

  it("migrates legacy users to unverified without retaining email or birth year", async () => {
    const client = new PGlite();
    const migrations = migrationSqlInOrder();
    const adultEligibilityMigrationIndex = migrations.findIndex((sql) =>
      sql.includes('ADD COLUMN "adult_eligibility_status"'),
    );
    expect(adultEligibilityMigrationIndex).toBeGreaterThan(0);
    for (const sql of migrations.slice(0, adultEligibilityMigrationIndex)) {
      await client.exec(sql);
    }

    const userId = "eb6052f5-7c51-4de8-a8f4-95c69c385ad8";
    await client.query(
      `insert into users (id, clerk_user_id, email) values ($1, 'legacy_adult_user', 'legacy@example.com')`,
      [userId],
    );
    await client.query(
      `insert into profiles (user_id, birth_year) values ($1, 1990)`,
      [userId],
    );

    await client.exec(migrations[adultEligibilityMigrationIndex]!);

    const migrated = await client.query<{
      email: string | null;
      adult_eligibility_status: string;
      adult_eligibility_policy_version: string | null;
      adult_eligibility_decided_at: Date | null;
    }>(
      `select email, adult_eligibility_status, adult_eligibility_policy_version,
              adult_eligibility_decided_at
       from users where id = $1`,
      [userId],
    );
    expect(migrated.rows).toEqual([
      {
        email: null,
        adult_eligibility_status: "unverified",
        adult_eligibility_policy_version: null,
        adult_eligibility_decided_at: null,
      },
    ]);

    const birthYearColumn = await client.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'birth_year'`,
    );
    expect(birthYearColumn.rows).toEqual([]);
    await client.close();
  });

  it("enforces adult-eligibility status and lifecycle invariants", async () => {
    const client = new PGlite();
    for (const sql of migrationSqlInOrder()) await client.exec(sql);

    await client.exec(
      `insert into users (clerk_user_id) values ('adult_default_unverified')`,
    );
    await client.exec(
      `insert into users (
        clerk_user_id, adult_eligibility_status,
        adult_eligibility_policy_version, adult_eligibility_decided_at
      ) values (
        'adult_valid_eligible', 'eligible', 'adult-18-v1', now()
      ), (
        'adult_valid_ineligible', 'ineligible', 'adult-18-v1', now()
      )`,
    );

    const validRows = await client.query<{ adult_eligibility_status: string }>(
      `select adult_eligibility_status from users
       where clerk_user_id like 'adult_%'
       order by clerk_user_id`,
    );
    expect(validRows.rows.map((row) => row.adult_eligibility_status)).toEqual([
      "unverified",
      "eligible",
      "ineligible",
    ]);

    const invalidStatements = [
      `insert into users (clerk_user_id, adult_eligibility_status) values ('adult_invalid_status', 'unknown')`,
      `insert into users (clerk_user_id, adult_eligibility_policy_version) values ('adult_unverified_with_policy', 'adult-18-v1')`,
      `insert into users (clerk_user_id, adult_eligibility_decided_at) values ('adult_unverified_with_date', now())`,
      `insert into users (clerk_user_id, adult_eligibility_status) values ('adult_eligible_without_metadata', 'eligible')`,
      `insert into users (clerk_user_id, adult_eligibility_status, adult_eligibility_policy_version, adult_eligibility_decided_at) values ('adult_empty_policy', 'eligible', '   ', now())`,
      `insert into users (clerk_user_id, adult_eligibility_status, adult_eligibility_policy_version) values ('adult_ineligible_without_date', 'ineligible', 'adult-18-v1')`,
      `insert into users (clerk_user_id, email) values ('adult_unverified_with_email', 'not-allowed@example.com')`,
      `insert into users (clerk_user_id, email, adult_eligibility_status, adult_eligibility_policy_version, adult_eligibility_decided_at) values ('adult_ineligible_with_email', 'not-allowed@example.com', 'ineligible', 'adult-18-v1', now())`,
    ];
    for (const sql of invalidStatements) {
      await expect(client.exec(sql)).rejects.toThrow();
    }

    await client.close();
  });

  it("rejects non-finite nutrition snapshots at the database boundary", async () => {
    const client = new PGlite();
    for (const sql of migrationSqlInOrder()) await client.exec(sql);

    const userId = "2d57ff94-379b-4273-98c5-d47579f47e6a";
    await client.query(
      `insert into users (id, clerk_user_id) values ($1, 'finite_nutrition_user')`,
      [userId],
    );

    const invalidCalories = [
      {
        requestId: "0ee5e112-e113-4de8-844a-6cf20a9632b0",
        value: "'NaN'::double precision",
      },
      {
        requestId: "6844090e-c5ed-463c-8849-1771141b0e14",
        value: "'Infinity'::double precision",
      },
    ];
    for (const invalid of invalidCalories) {
      await expect(
        client.exec(`insert into meal_entries (
          user_id, client_request_id, logged_on, catalog_version, template_id,
          name, serving_description, servings, calories_kcal_per_serving,
          protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving,
          fiber_g_per_serving
        ) values (
          '${userId}', '${invalid.requestId}', '2026-08-03', 'test-v1',
          'test-template', 'Test meal', '1 plate', 1, ${invalid.value},
          30, 50, 20, 8
        )`),
      ).rejects.toThrow();
    }

    const rows = await client.query<{ count: number }>(
      `select count(*)::integer as count from meal_entries where user_id = $1`,
      [userId],
    );
    expect(rows.rows).toEqual([{ count: 0 }]);
    await client.close();
  });

  it("enforces deletion-request lifecycle and hash invariants", async () => {
    const client = new PGlite();
    const migrations = migrationSqlInOrder();
    const phaseMigrationIndex = migrations.findIndex((sql) =>
      sql.includes('ADD COLUMN "subscription_deletion_status"'),
    );
    expect(phaseMigrationIndex).toBeGreaterThanOrEqual(0);
    for (const sql of migrations.slice(0, phaseMigrationIndex)) {
      await client.exec(sql);
    }

    // Completed tombstones created before RevenueCat integration are adopted
    // as confirmed before the stricter lifecycle constraint is installed.
    const legacyCompletedHash = "9".repeat(64);
    const legacyPendingHash = "12".repeat(32);
    await client.query(
      `insert into account_deletion_requests (identity_hash, status, completed_at) values ($1, 'completed', now())`,
      [legacyCompletedHash],
    );
    await client.query(
      `insert into account_deletion_requests (identity_hash, clerk_user_id) values ($1, 'clerk_legacy_pending')`,
      [legacyPendingHash],
    );
    await client.exec(migrations[phaseMigrationIndex]!);
    for (const sql of migrations.slice(phaseMigrationIndex + 1)) {
      await client.exec(sql);
    }
    const adopted = await client.query<{
      identity_hash: string;
      subscription_deletion_status: string;
    }>(
      `select identity_hash, subscription_deletion_status from account_deletion_requests where identity_hash in ($1, $2) order by identity_hash`,
      [legacyCompletedHash, legacyPendingHash],
    );
    expect(adopted.rows).toEqual(
      expect.arrayContaining([
        {
          identity_hash: legacyCompletedHash,
          subscription_deletion_status: "confirmed",
        },
        {
          identity_hash: legacyPendingHash,
          subscription_deletion_status: "not_started",
        },
      ]),
    );
    const phaseColumn = await client.query<{
      is_nullable: string;
      column_default: string | null;
    }>(
      `select is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'account_deletion_requests' and column_name = 'subscription_deletion_status'`,
    );
    expect(phaseColumn.rows).toHaveLength(1);
    expect(phaseColumn.rows[0]).toMatchObject({ is_nullable: "NO" });
    expect(phaseColumn.rows[0]?.column_default).toContain("not_started");

    const pendingHash = "a".repeat(64);
    const completedHash = "b".repeat(64);
    const leasedHash = "8".repeat(64);
    const queuedHash = "34".repeat(32);
    const confirmedPendingHash = "56".repeat(32);
    await client.query(
      `insert into account_deletion_requests (identity_hash, clerk_user_id) values ($1, $2)`,
      [pendingHash, "clerk_pending"],
    );
    await client.query(
      `insert into account_deletion_requests (identity_hash, status, completed_at, subscription_deletion_status) values ($1, 'completed', now(), 'confirmed')`,
      [completedHash],
    );
    await client.query(
      `insert into account_deletion_requests (identity_hash, clerk_user_id, lease_token, lease_expires_at) values ($1, 'clerk_leased', '1046f55b-d2fc-4c39-8e93-d67e18056236', now() + interval '2 minutes')`,
      [leasedHash],
    );
    await client.query(
      `insert into account_deletion_requests (identity_hash, clerk_user_id, subscription_deletion_status) values ($1, 'clerk_queued', 'queued')`,
      [queuedHash],
    );
    await client.query(
      `insert into account_deletion_requests (identity_hash, clerk_user_id, subscription_deletion_status) values ($1, 'clerk_confirmed_pending', 'confirmed')`,
      [confirmedPendingHash],
    );

    const validRows = await client.query<{
      status: string;
      clerk_user_id: string | null;
      completed_at: Date | null;
    }>(
      `select status, clerk_user_id, completed_at from account_deletion_requests order by status`,
    );
    expect(validRows.rows).toHaveLength(7);
    expect(validRows.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "pending",
          clerk_user_id: "clerk_pending",
          completed_at: null,
        }),
        expect.objectContaining({
          status: "completed",
          clerk_user_id: null,
        }),
      ]),
    );

    const invalidRows: Array<{ sql: string; params: unknown[] }> = [
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id) values ($1, 'clerk_bad_hash')`,
        params: ["A".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id) values ($1, 'clerk_short_hash')`,
        params: ["1".repeat(63)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash) values ($1)`,
        params: ["c".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id, completed_at) values ($1, 'clerk_pending_done', now())`,
        params: ["d".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id, status, completed_at) values ($1, 'clerk_completed', 'completed', now())`,
        params: ["e".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, status) values ($1, 'completed')`,
        params: ["f".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, status, completed_at, last_error_code) values ($1, 'completed', now(), 'vendor_error')`,
        params: ["0".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, status, completed_at) values ($1, 'completed', now())`,
        params: ["1".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id, subscription_deletion_status) values ($1, 'clerk_bad_phase', 'unknown')`,
        params: ["2".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id, lease_token) values ($1, 'clerk_half_lease', '2046f55b-d2fc-4c39-8e93-d67e18056236')`,
        params: ["3".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, clerk_user_id, lease_expires_at) values ($1, 'clerk_half_lease_expiry', now())`,
        params: ["4".repeat(64)],
      },
      {
        sql: `insert into account_deletion_requests (identity_hash, status, completed_at, subscription_deletion_status, lease_token, lease_expires_at) values ($1, 'completed', now(), 'confirmed', '3046f55b-d2fc-4c39-8e93-d67e18056236', now())`,
        params: ["5".repeat(64)],
      },
    ];
    for (const invalid of invalidRows) {
      await expect(client.query(invalid.sql, invalid.params)).rejects.toThrow();
    }

    const retryIndex = await client.query<{
      indexname: string;
      indexdef: string;
    }>(
      `select indexname, indexdef from pg_indexes where schemaname = 'public' and indexname = 'account_deletion_requests_retry_index'`,
    );
    expect(retryIndex.rows).toHaveLength(1);
    expect(retryIndex.rows[0]?.indexdef).toContain(
      "(status, last_attempt_at, requested_at)",
    );
    const leaseIndex = await client.query<{
      indexname: string;
      indexdef: string;
    }>(
      `select indexname, indexdef from pg_indexes where schemaname = 'public' and indexname = 'account_deletion_requests_lease_index'`,
    );
    expect(leaseIndex.rows).toHaveLength(1);
    expect(leaseIndex.rows[0]?.indexdef).toContain(
      "(status, lease_expires_at)",
    );
    await client.close();
  });
});
