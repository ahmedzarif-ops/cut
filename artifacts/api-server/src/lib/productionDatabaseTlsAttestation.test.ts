import { describe, expect, it, vi } from "vitest";
import {
  attestProductionDatabaseTls,
  type ProductionTlsAttestationLogger,
  type ProductionTlsClient,
  type ProductionTlsPool,
} from "./productionDatabaseTlsAttestation";

type FakeDatabaseOptions = {
  host?: unknown;
  ssl?: unknown;
  encrypted?: unknown;
  authorized?: unknown;
  authorizationError?: unknown;
  serverSsl?: boolean;
  omitServerRow?: boolean;
  queryFailure?: Error;
  rollbackFailure?: Error;
};

function fakeDatabase(options: FakeDatabaseOptions = {}) {
  const queries: string[] = [];
  const release = vi.fn<(error?: Error | boolean) => void>();
  const info = vi.fn<ProductionTlsAttestationLogger["info"]>();

  const client: ProductionTlsClient = {
    connectionParameters: {
      host: options.host ?? "production-db.example.com",
      ssl: options.ssl ?? {},
    },
    connection: {
      stream: {
        encrypted: options.encrypted ?? true,
        authorized: options.authorized ?? true,
        authorizationError: options.authorizationError ?? null,
      },
    },
    async query<Row extends Record<string, unknown>>(text: string) {
      queries.push(text);
      if (text === "rollback" && options.rollbackFailure) {
        throw options.rollbackFailure;
      }
      if (options.queryFailure && text.includes("pg_stat_ssl")) {
        throw options.queryFailure;
      }
      if (text.includes("pg_stat_ssl")) {
        return {
          rows: options.omitServerRow
            ? []
            : [{ ssl: options.serverSsl ?? true }],
        } as unknown as { rows: Row[] };
      }
      return { rows: [] };
    },
    release,
  };
  const pool: ProductionTlsPool = { connect: vi.fn(async () => client) };
  const evidenceLogger: ProductionTlsAttestationLogger = { info };

  return { client, evidenceLogger, info, pool, queries, release };
}

describe("production database TLS attestation", () => {
  it("attests one exact pool client in a read-only transaction", async () => {
    const database = fakeDatabase();

    await attestProductionDatabaseTls({
      pool: database.pool,
      logger: database.evidenceLogger,
    });

    expect(database.queries).toHaveLength(3);
    expect(database.queries[0]).toBe("begin transaction read only");
    expect(database.queries[1]).toMatch(/select "ssl"/u);
    expect(database.queries[1]).toMatch(/where "pid" = pg_backend_pid\(\)/u);
    expect(database.queries[1]).not.toMatch(
      /(?:version|cipher|bits|client_dn|issuer_dn)/u,
    );
    expect(database.queries[2]).toBe("rollback");
    expect(database.release).toHaveBeenCalledWith(false);
    expect(database.info).toHaveBeenCalledOnce();
    expect(database.info).toHaveBeenCalledWith(
      {
        event: "production_database_tls_attestation",
        status: "PASS",
        readOnlyTransaction: true,
        verificationEnabled: true,
        socketEncrypted: true,
        peerAuthorized: true,
        authorizationErrorAbsent: true,
        serverReportsSsl: true,
      },
      "Production database TLS attestation passed",
    );
  });

  it.each([
    ["non-TLS socket", { encrypted: false }],
    ["unauthorized peer", { authorized: false }],
    ["authorization error", { authorizationError: new Error("private") }],
    ["server-side non-SSL", { serverSsl: false }],
    ["missing current-backend row", { omitServerRow: true }],
    ["verification bypass", { ssl: { rejectUnauthorized: false } }],
    [
      "hostname-check override",
      { ssl: { checkServerIdentity: () => undefined } },
    ],
    ["IP connection target", { host: "192.0.2.1" }],
  ] satisfies [string, FakeDatabaseOptions][])(
    "fails closed for %s",
    async (_label, options) => {
      const database = fakeDatabase(options);

      await expect(
        attestProductionDatabaseTls({
          pool: database.pool,
          logger: database.evidenceLogger,
        }),
      ).rejects.toMatchObject({
        name: "ProductionDatabaseTlsAttestationError",
        code: "database_tls_attestation_failed",
        message: "Production database TLS attestation failed",
      });
      expect(database.release).toHaveBeenCalledWith(true);
      expect(database.info).not.toHaveBeenCalled();
    },
  );

  it("sanitizes query and cleanup failures", async () => {
    const privateDatabaseDetail =
      "private-user|private-password|db.example.com|cut";

    for (const options of [
      { queryFailure: new Error(privateDatabaseDetail) },
      { rollbackFailure: new Error(privateDatabaseDetail) },
    ]) {
      const database = fakeDatabase(options);
      let thrown: unknown;
      try {
        await attestProductionDatabaseTls({
          pool: database.pool,
          logger: database.evidenceLogger,
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        code: "database_tls_attestation_failed",
      });
      expect(JSON.stringify(thrown)).not.toContain("private-user");
      expect(JSON.stringify(thrown)).not.toContain("private-password");
      expect(database.release).toHaveBeenCalledWith(true);
      expect(database.info).not.toHaveBeenCalled();
    }
  });

  it("sanitizes connection failures without producing evidence", async () => {
    const info = vi.fn<ProductionTlsAttestationLogger["info"]>();
    const pool: ProductionTlsPool = {
      connect: async () => {
        throw new Error("private-user|private-password|db.example.com|cut");
      },
    };

    await expect(
      attestProductionDatabaseTls({ pool, logger: { info } }),
    ).rejects.toMatchObject({ code: "database_tls_attestation_failed" });
    expect(info).not.toHaveBeenCalled();
  });
});
