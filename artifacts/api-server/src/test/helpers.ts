/**
 * Test harness for api-server integration tests.
 *
 * - Boots a real (WASM) Postgres via PGlite and applies the committed Drizzle
 *   migrations from lib/db/migrations — so every test run also validates that
 *   the migration files actually produce the schema the code expects.
 * - Injects the PGlite-backed Drizzle instance through the `setDb` seam in
 *   @workspace/db, so route handlers run unmodified.
 * - Installs a request-branded fake `req.auth` (the same Symbol.for brand
 *   @clerk/express uses), so the REAL `getAuth()` inside requireAuth runs —
 *   no module mocking. Tests choose the Clerk identity per request via the
 *   `x-test-clerk-user` / `x-test-clerk-email` headers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type RequestHandler } from "express";
import pinoHttp from "pino-http";
import pino from "pino";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { setDb, type Db } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import router from "../routes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(
  __dirname,
  "../../../../lib/db/migrations",
);

/** Same global brand @clerk/express stamps on `req.auth`. */
const clerkAuthBrand = Symbol.for("@clerk/express.auth");

export const TEST_USER_HEADER = "x-test-clerk-user";
export const TEST_EMAIL_HEADER = "x-test-clerk-email";

export interface TestContext {
  app: Express;
  db: ReturnType<typeof drizzle<typeof schema>>;
  client: PGlite;
  close: () => Promise<void>;
}

function readMigrationsInOrder(): string[] {
  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as {
    entries: Array<{ tag: string }>;
  };
  return journal.entries.map((entry) =>
    fs.readFileSync(path.join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf-8"),
  );
}

/**
 * Middleware that impersonates clerkMiddleware: brands `req.auth` exactly the
 * way @clerk/express does, returning a session-token auth object for the
 * identity named in the test headers (or a signed-out object when absent).
 */
function testClerkAuth(): RequestHandler {
  return (req, _res, next) => {
    const userId = req.headers[TEST_USER_HEADER] as string | undefined;
    const email = req.headers[TEST_EMAIL_HEADER] as string | undefined;
    const handler = () => ({
      tokenType: "session_token" as const,
      isAuthenticated: Boolean(userId),
      userId: userId ?? null,
      sessionClaims: userId ? (email ? { email } : {}) : null,
    });
    (req as unknown as { auth: unknown }).auth = Object.assign(handler, {
      [clerkAuthBrand]: true,
    });
    next();
  };
}

export async function createTestContext(): Promise<TestContext> {
  const client = new PGlite();
  for (const sql of readMigrationsInOrder()) {
    await client.exec(sql);
  }

  const db = drizzle(client, { schema });
  // PGlite's Drizzle instance is a different driver flavor than node-postgres
  // but exposes the identical query API the routes use.
  setDb(db as unknown as Db);

  const app = express();
  app.use(pinoHttp({ logger: pino({ level: "silent" }) }));
  app.use(express.json());
  app.use(testClerkAuth());
  app.use("/api", router);

  return {
    app,
    db,
    client,
    close: async () => {
      setDb(null);
      await client.close();
    },
  };
}
