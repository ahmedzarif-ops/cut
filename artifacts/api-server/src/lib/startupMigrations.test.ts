import { describe, expect, it, vi } from "vitest";
import { PG_QUERY_TIMEOUT_MS } from "@workspace/db";
import {
  ensureProductionMigrations,
  MAX_MIGRATION_STATEMENT_TIMEOUT_MS,
  prepareProductionDatabase,
  runStartupMigrations,
  StartupMigrationError,
  type MigrationClient,
  type MigrationPool,
} from "./startupMigrations";

function fakeDatabase(input?: {
  lockResults?: boolean[];
  unlockResult?: boolean;
  queryFailure?: Error;
}) {
  const events: string[] = [];
  const lockResults = [...(input?.lockResults ?? [true])];
  const release = vi.fn<(error?: Error | boolean) => void>();

  const client: MigrationClient = {
    async query<Row extends Record<string, unknown>>(text: string) {
      if (input?.queryFailure) throw input.queryFailure;
      if (text.includes("pg_try_advisory_lock")) {
        events.push("lock");
        return {
          rows: [{ locked: lockResults.shift() ?? false }],
        } as unknown as { rows: Row[] };
      }
      if (text.includes("pg_advisory_unlock")) {
        events.push("unlock");
        return {
          rows: [{ unlocked: input?.unlockResult ?? true }],
        } as unknown as { rows: Row[] };
      }
      if (text.startsWith("reset")) events.push(text);
      return { rows: [] };
    },
    release(error) {
      events.push("release");
      release(error);
    },
  };
  const pool: MigrationPool = { connect: vi.fn(async () => client) };
  return { client, pool, events, release };
}

function dependencies(
  pool: MigrationPool,
  overrides: Partial<Parameters<typeof runStartupMigrations>[0]> = {},
) {
  return {
    pool,
    migrationsFolder: "/bundled/migrations",
    lockTimeoutMs: 1_000,
    statementTimeoutMs: 30_000,
    ...overrides,
  };
}

describe("production startup migrations", () => {
  it("keeps every accepted migration statement below the client query guard", () => {
    expect(PG_QUERY_TIMEOUT_MS).toBeGreaterThan(
      MAX_MIGRATION_STATEMENT_TIMEOUT_MS,
    );
  });

  it("holds the advisory lock for migration and releases the client", async () => {
    const database = fakeDatabase();
    const runMigrations = vi.fn(async () => {
      database.events.push("migrate");
    });

    await runStartupMigrations(dependencies(database.pool, { runMigrations }));

    expect(database.events).toEqual([
      "lock",
      "migrate",
      "unlock",
      "reset statement_timeout",
      "reset lock_timeout",
      "release",
    ]);
    expect(runMigrations).toHaveBeenCalledWith(
      database.client,
      "/bundled/migrations",
    );
    expect(database.release).toHaveBeenCalledWith(false);
  });

  it("waits for a competing replica and then migrates under the lock", async () => {
    const database = fakeDatabase({ lockResults: [false, false, true] });
    let now = 0;
    const runMigrations = vi.fn(async () => undefined);

    await runStartupMigrations(
      dependencies(database.pool, {
        runMigrations,
        now: () => now,
        sleep: async (milliseconds) => {
          now += milliseconds;
        },
      }),
    );

    expect(database.events.filter((event) => event === "lock")).toHaveLength(3);
    expect(runMigrations).toHaveBeenCalledOnce();
    expect(database.events).toContain("unlock");
  });

  it("times out without migrating when the advisory lock stays busy", async () => {
    const database = fakeDatabase({ lockResults: [false] });
    const runMigrations = vi.fn(async () => undefined);
    let now = 0;

    await expect(
      runStartupMigrations(
        dependencies(database.pool, {
          lockTimeoutMs: 500,
          runMigrations,
          now: () => now,
          sleep: async (milliseconds) => {
            now += milliseconds;
          },
        }),
      ),
    ).rejects.toMatchObject({
      name: "StartupMigrationError",
      code: "migration_lock_timeout",
      message: "Production database preparation failed",
    });
    expect(runMigrations).not.toHaveBeenCalled();
    expect(database.events).not.toContain("unlock");
    expect(database.release).toHaveBeenCalledWith(false);
  });

  it("releases the lock when migration fails and does not expose the cause", async () => {
    const database = fakeDatabase();
    const privateDsn = [
      "postgresql://private-user",
      "private-password@db.example.com/cut",
    ].join(":");

    let thrown: unknown;
    try {
      await runStartupMigrations(
        dependencies(database.pool, {
          runMigrations: async () => {
            throw new Error(`migration failed for ${privateDsn}`);
          },
        }),
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(StartupMigrationError);
    expect(thrown).toMatchObject({ code: "migration_failed" });
    expect(JSON.stringify(thrown)).not.toContain("private-user");
    expect(JSON.stringify(thrown)).not.toContain("private-password");
    expect(database.events).toContain("unlock");
    expect(database.release).toHaveBeenCalledWith(false);
  });

  it("discards the client and fails closed if lock release fails", async () => {
    const database = fakeDatabase({ unlockResult: false });

    await expect(
      runStartupMigrations(
        dependencies(database.pool, {
          runMigrations: async () => undefined,
        }),
      ),
    ).rejects.toMatchObject({ code: "migration_lock_release_failed" });
    expect(database.release).toHaveBeenCalledWith(true);
  });

  it("sanitizes connection failures", async () => {
    const pool: MigrationPool = {
      connect: async () => {
        throw new Error(
          [
            "postgresql://private-user",
            "private-password@db.example.com/cut",
          ].join(":"),
        );
      },
    };

    await expect(
      runStartupMigrations(dependencies(pool)),
    ).rejects.toMatchObject({
      code: "database_unavailable",
      message: "Production database preparation failed",
    });
  });

  it("leaves development and test startup unchanged", async () => {
    await expect(
      ensureProductionMigrations({ NODE_ENV: "development" }),
    ).resolves.toBeUndefined();
    await expect(
      ensureProductionMigrations({ NODE_ENV: "test" }),
    ).resolves.toBeUndefined();
  });

  it("migrates and then checks the exact database revision before startup", async () => {
    const events: string[] = [];
    await prepareProductionDatabase(
      { NODE_ENV: "production" },
      {
        migrate: async () => {
          events.push("migrate");
        },
        checkReadiness: async () => {
          events.push("ready");
        },
        attestTls: async () => {
          events.push("tls");
        },
      },
    );
    expect(events).toEqual(["migrate", "ready", "tls"]);
  });

  it("never checks readiness or proceeds after migration failure", async () => {
    const checkReadiness = vi.fn(async () => undefined);
    await expect(
      prepareProductionDatabase(
        { NODE_ENV: "production" },
        {
          migrate: async () => {
            throw new StartupMigrationError("migration_failed");
          },
          checkReadiness,
        },
      ),
    ).rejects.toMatchObject({ code: "migration_failed" });
    expect(checkReadiness).not.toHaveBeenCalled();
  });

  it("fails closed after migration when the exact revision is not ready", async () => {
    const migrate = vi.fn(async () => undefined);
    await expect(
      prepareProductionDatabase(
        { NODE_ENV: "production" },
        {
          migrate,
          checkReadiness: async () => {
            throw new Error(
              "unexpected migration hash at private database host",
            );
          },
        },
      ),
    ).rejects.toMatchObject({
      code: "database_not_ready",
      message: "Production database preparation failed",
    });
    expect(migrate).toHaveBeenCalledOnce();
  });

  it("fails startup with a stable sanitized code when TLS attestation fails", async () => {
    const privateDatabaseDetail =
      "private-user|private-password|db.example.com|cut";
    const events: string[] = [];
    let thrown: unknown;

    try {
      await prepareProductionDatabase(
        { NODE_ENV: "production" },
        {
          migrate: async () => {
            events.push("migrate");
          },
          checkReadiness: async () => {
            events.push("ready");
          },
          attestTls: async () => {
            events.push("tls");
            throw new Error(privateDatabaseDetail);
          },
        },
      );
    } catch (error) {
      thrown = error;
    }

    expect(events).toEqual(["migrate", "ready", "tls"]);
    expect(thrown).toMatchObject({
      name: "StartupMigrationError",
      code: "database_tls_attestation_failed",
      message: "Production database preparation failed",
    });
    expect(JSON.stringify(thrown)).not.toContain("private-user");
    expect(JSON.stringify(thrown)).not.toContain("private-password");
  });

  it("does not migrate, probe, or attest outside production", async () => {
    const migrate = vi.fn(async () => undefined);
    const checkReadiness = vi.fn(async () => undefined);
    const attestTls = vi.fn(async () => undefined);

    for (const NODE_ENV of ["development", "test"]) {
      await prepareProductionDatabase(
        { NODE_ENV },
        { migrate, checkReadiness, attestTls },
      );
    }

    expect(migrate).not.toHaveBeenCalled();
    expect(checkReadiness).not.toHaveBeenCalled();
    expect(attestTls).not.toHaveBeenCalled();
  });
});
