import { isIP } from "node:net";
import { getPool } from "@workspace/db";
import { logger } from "./logger";

type QueryResult<Row extends Record<string, unknown>> = { rows: Row[] };

export interface ProductionTlsClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
  ): Promise<QueryResult<Row>>;
  release(error?: Error | boolean): void;
  connectionParameters?: {
    host?: unknown;
    ssl?: unknown;
  };
  connection?: {
    stream?: unknown;
  };
}

export interface ProductionTlsPool {
  connect(): Promise<ProductionTlsClient>;
}

export interface ProductionTlsAttestationLogger {
  info(fields: Record<string, unknown>, message: string): void;
}

type ProductionTlsAttestationDependencies = {
  pool?: ProductionTlsPool | null;
  logger?: ProductionTlsAttestationLogger;
};

type TlsSocketShape = {
  encrypted?: unknown;
  authorized?: unknown;
  authorizationError?: unknown;
  servername?: unknown;
};

type PgSslConfiguration = {
  rejectUnauthorized?: unknown;
  checkServerIdentity?: unknown;
};

export const PRODUCTION_DATABASE_TLS_ATTESTATION_ERROR_CODE =
  "database_tls_attestation_failed" as const;

export class ProductionDatabaseTlsAttestationError extends Error {
  readonly code = PRODUCTION_DATABASE_TLS_ATTESTATION_ERROR_CODE;

  constructor() {
    super("Production database TLS attestation failed");
    this.name = "ProductionDatabaseTlsAttestationError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * `pg-connection-string` maps `sslmode=verify-full` to either `true` or an SSL
 * options object that leaves Node's certificate and hostname checks enabled.
 * Reject explicit verification bypasses and non-DNS connection targets.
 */
function hasVerifiedTlsConfiguration(client: ProductionTlsClient): boolean {
  const parameters = client.connectionParameters;
  const host = parameters?.host;
  const ssl = parameters?.ssl;

  if (typeof host !== "string" || host.length === 0 || isIP(host) !== 0) {
    return false;
  }
  if (ssl === true) return true;

  const options = asRecord(ssl) as PgSslConfiguration | undefined;
  return (
    options !== undefined &&
    options.rejectUnauthorized !== false &&
    options.checkServerIdentity === undefined
  );
}

function tlsSocket(client: ProductionTlsClient): TlsSocketShape | undefined {
  return asRecord(client.connection?.stream) as TlsSocketShape | undefined;
}

const TLS_ATTESTATION_QUERY = `select 1 as "database_ready"`;

/**
 * Fail-closed proof that the exact production pool client is using an
 * authorized TLS socket for the configured DNS hostname and can carry a
 * read-only query. PostgreSQL may sit behind a TLS-terminating provider proxy,
 * so server-side transport views do not attest this client-to-endpoint socket.
 * No connection, certificate, provider, or query metadata is logged.
 */
export async function attestProductionDatabaseTls(
  dependencies: ProductionTlsAttestationDependencies = {},
): Promise<void> {
  const pool =
    dependencies.pool ?? (getPool() as unknown as ProductionTlsPool | null);
  const evidenceLogger = dependencies.logger ?? logger;

  if (!pool) throw new ProductionDatabaseTlsAttestationError();

  let client: ProductionTlsClient;
  try {
    client = await pool.connect();
  } catch {
    throw new ProductionDatabaseTlsAttestationError();
  }

  let transactionOpen = false;
  let attested = false;
  let discardClient = false;

  try {
    await client.query("begin transaction read only");
    transactionOpen = true;

    const result = await client.query<{ database_ready: number }>(
      TLS_ATTESTATION_QUERY,
    );
    const socket = tlsSocket(client);
    const configuredHost = client.connectionParameters?.host;

    attested =
      hasVerifiedTlsConfiguration(client) &&
      socket?.encrypted === true &&
      socket.authorized === true &&
      socket.authorizationError == null &&
      socket.servername === configuredHost &&
      result.rows.length === 1 &&
      result.rows[0]?.database_ready === 1;
  } catch {
    attested = false;
    discardClient = true;
  }

  if (transactionOpen) {
    try {
      await client.query("rollback");
      transactionOpen = false;
    } catch {
      attested = false;
      discardClient = true;
    }
  }

  try {
    client.release(discardClient || !attested);
  } catch {
    attested = false;
  }

  if (!attested) throw new ProductionDatabaseTlsAttestationError();

  evidenceLogger.info(
    {
      event: "production_database_tls_attestation",
      status: "PASS",
      readOnlyTransaction: true,
      verificationEnabled: true,
      socketEncrypted: true,
      peerAuthorized: true,
      authorizationErrorAbsent: true,
      hostnameVerified: true,
      sameSocketQueryPassed: true,
    },
    "Production database TLS attestation passed",
  );
}
