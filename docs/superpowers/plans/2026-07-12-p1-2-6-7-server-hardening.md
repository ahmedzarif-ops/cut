# P1-2/6/7 Server Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the per-request DB write from the auth hot path, make the pg pool crash-safe and drain cleanly on shutdown, and put trust-proxy + IP rate limiting + security headers in front of the API.

**Architecture:** Three independent hardening changes to the request lifecycle. P1-2 rewrites `provisionUser` to select-first (zero writes for a returning user) and reuses the fetched row via `req.user`. P1-6 adds a pool budget + error handler in `@workspace/db` and a testable `createShutdownHandler` wired to SIGTERM/SIGINT in the server entry. P1-7 adds `trust proxy`, two `express-rate-limit` limiters, and `helmet` to `app.ts`. The existing integration harness rebuilds its own Express app, so the limiters/helmet added to `app.ts` don't touch the 44 existing tests.

**Tech Stack:** Express 5, Drizzle + node-postgres (`pg`), `express-rate-limit` ^8.5.2, `helmet` ^8.3.0, Vitest + Supertest, PGlite (test DB).

## Global Constraints

- Run all commands from `cut-main/` (pnpm 10 monorepo, Node v25).
- New deps pinned: `helmet` `^8.3.0`, `express-rate-limit` `^8.5.2` (both Express-5-compatible).
- `@workspace/domain` stays zero-runtime-dep and I/O-free; `@workspace/db` owns the pool.
- Identity: every table references internal `users.id` (uuid); never key by the raw Clerk id. Queries scope by `req.userId`.
- Privacy (CLAUDE.md / GTM §6): no health values (weight, calories, macros, measurements) in logs — pool/shutdown/limiter logs carry only signals, IDs, and error objects.
- No schema change in this batch (so no migration).
- `helmet` config is `helmet({ contentSecurityPolicy: false })` and nothing more: helmet v8 renamed the sub-middleware option keys (`frameguard` → `xFrameOptions`), so relying on its **defaults** (which already emit `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`) avoids version-coupling. CSP is disabled because this is a JSON API. This is a deliberate, strictly-safer refinement of the spec's literal header list.
- The existing **44 tests must stay green**. Target after this plan: ~54.
- After every dependency change run `pnpm install` before typechecking.
- Final gate for the whole plan: `pnpm run typecheck && pnpm run test` green.

---

### Task 1: P1-2 — select-first provisioning + `req.user` reuse

Eliminates the per-request `UPDATE` in `provisionUser` and the redundant re-`SELECT` in `GET /me`.

**Files:**
- Modify: `artifacts/api-server/src/services/userService.ts`
- Modify: `artifacts/api-server/src/middlewares/requireAuth.ts`
- Modify: `artifacts/api-server/src/routes/me.ts`
- Test: `artifacts/api-server/src/services/userService.test.ts`
- Test: `artifacts/api-server/src/routes/me.test.ts`

**Interfaces:**
- Produces: `getUserByClerkId(clerkUserId: string): Promise<User | undefined>` (SELECT by `users.clerkUserId`); `provisionUser` unchanged signature but no longer writes on the hot path; Express `Request.user?: User` populated by `requireAuth`.
- Consumes: existing `db`, `usersTable`, `eq`, `User` from `@workspace/db`; existing test harness `createTestContext` exposing `ctx.app` (supertest), `ctx.db` (PGlite drizzle).

- [ ] **Step 1: Write the failing tests (userService)**

Add to `artifacts/api-server/src/services/userService.test.ts` — update the import line and append two tests inside a `describe`:

```typescript
// update the existing top imports to add eq, usersTable, getUserByClerkId
import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import {
  provisionUser,
  getUserByClerkId,
  upsertProfile,
  getProfile,
} from "./userService";

describe("provisionUser — no hot-path write", () => {
  it("does not modify the row on a returning user's request", async () => {
    ctx = await createTestContext();
    await provisionUser({ clerkUserId: "clerk_nowrite", email: "n@w.com" });
    const [before] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_nowrite"));

    await provisionUser({ clerkUserId: "clerk_nowrite", email: "n@w.com" });
    const [after] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_nowrite"));

    // Old code bumped updated_at on every call; select-first leaves it alone.
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  it("getUserByClerkId returns the row, or undefined when unknown", async () => {
    ctx = await createTestContext();
    const created = await provisionUser({ clerkUserId: "clerk_byid", email: null });
    expect((await getUserByClerkId("clerk_byid"))?.id).toBe(created?.id);
    expect(await getUserByClerkId("clerk_absent")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @workspace/api-server test -- userService`
Expected: FAIL — `getUserByClerkId` is not exported (import error), and once that's added the no-write test fails because the current `onConflictDoUpdate` bumps `updated_at`.

- [ ] **Step 3: Implement select-first + `getUserByClerkId`**

In `artifacts/api-server/src/services/userService.ts`, replace the `provisionUser` function (lines 12-30) with:

```typescript
/**
 * Just-in-time user provisioning with no per-request write.
 *
 * Select-first — a returning user (the overwhelming common case) is one read
 * and zero writes. On a miss, insert; `onConflictDoNothing` + a re-select
 * covers the race where a concurrent request created the same clerk_user_id
 * between our SELECT and INSERT.
 */
export async function provisionUser(input: {
  clerkUserId: string;
  email: string | null;
}): Promise<User | undefined> {
  const existing = await getUserByClerkId(input.clerkUserId);
  if (existing) return existing;

  const [inserted] = await db
    .insert(usersTable)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
    .onConflictDoNothing({ target: usersTable.clerkUserId })
    .returning();
  if (inserted) return inserted;

  // Lost the insert race — another request created the row. Re-select it.
  return getUserByClerkId(input.clerkUserId);
}

export async function getUserByClerkId(
  clerkUserId: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));
  return user;
}
```

(`getUserById` below it stays as-is — `updateUser`'s empty-patch no-op still uses it.)

- [ ] **Step 4: Run the userService tests to verify they pass**

Run: `pnpm --filter @workspace/api-server test -- userService`
Expected: PASS (all provisionUser tests, including the existing idempotent one).

- [ ] **Step 5: Write the failing test (GET /me reuse)**

Add to `artifacts/api-server/src/routes/me.test.ts` inside the `describe("GET /api/me — JIT provisioning", ...)` block:

```typescript
  it("repeated GET /me reads never mutate the row (no write anywhere)", async () => {
    const headers = asUser("clerk_getme_stable", "s@t.com");
    const first = await request(ctx.app).get("/api/me").set(headers);
    const [before] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_getme_stable"));

    await request(ctx.app).get("/api/me").set(headers);
    const [after] = await ctx.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, "clerk_getme_stable"));

    expect(first.status).toBe(200);
    expect(first.body.email).toBe("s@t.com");
    expect(after.updatedAt).toEqual(before.updatedAt);
  });
```

- [ ] **Step 6: Run it to verify it passes after the req.user refactor is in place**

Run: `pnpm --filter @workspace/api-server test -- me`
Expected: FAIL only if `req.user` wiring regresses `GET /me`; it should PASS once Steps 7-8 land. (Run after Step 8.)

- [ ] **Step 7: Attach `req.user` in requireAuth**

In `artifacts/api-server/src/middlewares/requireAuth.ts`:

Add the import near the top:
```typescript
import type { User } from "@workspace/db";
```

Extend the Request augmentation (inside the existing `namespace Express` block) to add `user`:
```typescript
    interface Request {
      userId?: string;
      clerkUserId?: string;
      user?: User;
    }
```

After the existing `req.userId = user.id;` / `req.clerkUserId = clerkUserId;` lines, add:
```typescript
  req.user = user;
```

- [ ] **Step 8: Reuse `req.user` in GET /me**

In `artifacts/api-server/src/routes/me.ts`:

Remove `getUserById` from the `userService` import (keep `updateUser, getProfile, upsertProfile`):
```typescript
import { updateUser, getProfile, upsertProfile } from "../services/userService";
```

Replace the `GET /me` handler (lines 21-28) with:
```typescript
// GET /api/me — current user. requireAuth already resolved and attached the
// full internal row as req.user, so no second query is needed here.
router.get("/me", requireAuth, async (req, res): Promise<void> => {
  res.json(GetMeResponse.parse(req.user));
});
```

- [ ] **Step 9: Run the full api-server suite to verify no regression**

Run: `pnpm --filter @workspace/api-server test`
Expected: PASS — all existing me/userService tests plus the 3 new ones (`does not modify the row`, `getUserByClerkId`, `repeated GET /me reads`). The existing "idempotent — repeated and concurrent first requests" test still passes (select-first + `onConflictDoNothing` + re-select yields one row).

- [ ] **Step 10: Typecheck and commit**

Run: `pnpm run typecheck`
Expected: PASS.

```bash
git add artifacts/api-server/src/services/userService.ts artifacts/api-server/src/services/userService.test.ts artifacts/api-server/src/middlewares/requireAuth.ts artifacts/api-server/src/routes/me.ts artifacts/api-server/src/routes/me.test.ts
git commit -m "P1-2: select-first user provisioning, reuse req.user in GET /me"
```

---

### Task 2: P1-6a — pg pool budget + error handler (`@workspace/db`)

Gives the pool a connection budget and an `'error'` handler so an idle-client error is logged, not an unhandled event that crashes the process. Homes the pure `poolConfig` in a new lib/db test.

**Files:**
- Modify: `lib/db/src/index.ts`
- Modify: `lib/db/package.json`
- Modify: `lib/db/tsconfig.json`
- Test: `lib/db/src/index.test.ts`

**Interfaces:**
- Produces: `poolConfig(env?: NodeJS.ProcessEnv): { connectionString: string | undefined; max: number; idleTimeoutMillis: number; connectionTimeoutMillis: number }`. `getPool()` unchanged.

- [ ] **Step 1: Enable vitest in lib/db**

In `lib/db/package.json`, add a `test` script and the vitest devDep:
```jsonc
  "scripts": {
    "generate": "drizzle-kit generate --config ./drizzle.config.ts",
    "migrate": "drizzle-kit migrate --config ./drizzle.config.ts",
    "push": "drizzle-kit push --config ./drizzle.config.ts",
    "test": "vitest run"
  },
```
```jsonc
  "devDependencies": {
    "@types/node": "catalog:",
    "@types/pg": "^8.20.0",
    "drizzle-kit": "^0.31.10",
    "vitest": "catalog:"
  }
```

In `lib/db/tsconfig.json`, add the test exclude (mirroring `lib/domain`) so `tsc --build` doesn't try to emit declarations for the test:
```jsonc
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
```

Run: `pnpm install`
Expected: resolves, `vitest` linked into `lib/db`.

- [ ] **Step 2: Write the failing test**

Create `lib/db/src/index.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { poolConfig } from "./index";

describe("poolConfig", () => {
  it("defaults max to 5 and sets conservative timeouts", () => {
    const c = poolConfig({});
    expect(c.max).toBe(5);
    expect(c.idleTimeoutMillis).toBe(30_000);
    expect(c.connectionTimeoutMillis).toBe(10_000);
  });

  it("reads PG_POOL_MAX from the environment", () => {
    expect(poolConfig({ PG_POOL_MAX: "12" }).max).toBe(12);
  });

  it("passes DATABASE_URL through as the connection string", () => {
    expect(poolConfig({ DATABASE_URL: "postgres://x" }).connectionString).toBe(
      "postgres://x",
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @workspace/db test`
Expected: FAIL — `poolConfig` is not exported.

- [ ] **Step 4: Implement poolConfig + error handler**

In `lib/db/src/index.ts`, add the `poolConfig` export (after the `Db` type on line 7) and rewrite `createDefaultDb`:

```typescript
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @workspace/db test`
Expected: PASS (3 poolConfig tests).

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm run typecheck`
Expected: PASS.

```bash
git add lib/db/src/index.ts lib/db/src/index.test.ts lib/db/package.json lib/db/tsconfig.json pnpm-lock.yaml
git commit -m "P1-6: pg pool budget (PG_POOL_MAX) + idle-client error handler"
```

---

### Task 3: P1-6b — graceful shutdown

A testable `createShutdownHandler` (injected `server`/`closePool`/`exit`/timer) wired to SIGTERM/SIGINT so in-flight requests drain and the pool closes before exit.

**Files:**
- Create: `artifacts/api-server/src/lib/shutdown.ts`
- Modify: `artifacts/api-server/src/index.ts`
- Test: `artifacts/api-server/src/lib/shutdown.test.ts`

**Interfaces:**
- Produces: `createShutdownHandler(deps: { server: { close(cb: (err?: Error) => void): unknown }; closePool: () => Promise<void>; logger: { info(o: unknown, m?: string): void; error(o: unknown, m?: string): void }; timeoutMs: number; exit: (code: number) => void }): (signal: string) => void`.
- Consumes: `getPool` from `@workspace/db`; `logger` from `./lib/logger`; `app` from `./app`.

- [ ] **Step 1: Write the failing test**

Create `artifacts/api-server/src/lib/shutdown.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { createShutdownHandler } from "./shutdown";

const makeLogger = () => ({ info: vi.fn(), error: vi.fn() });

describe("createShutdownHandler", () => {
  it("drains the server, closes the pool, then exits 0", async () => {
    const exit = vi.fn();
    const closePool = vi.fn().mockResolvedValue(undefined);
    // server.close invokes its callback immediately (nothing in flight).
    const server = { close: vi.fn((cb: (e?: Error) => void) => cb()) };

    const handler = createShutdownHandler({
      server,
      closePool,
      logger: makeLogger(),
      timeoutMs: 5000,
      exit,
    });
    handler("SIGTERM");

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(closePool).toHaveBeenCalledTimes(1);
  });

  it("forces exit 1 when draining exceeds the timeout", () => {
    vi.useFakeTimers();
    const exit = vi.fn();
    // server.close never calls its callback — a hung in-flight request.
    const server = { close: vi.fn() };
    const handler = createShutdownHandler({
      server,
      closePool: vi.fn().mockResolvedValue(undefined),
      logger: makeLogger(),
      timeoutMs: 10_000,
      exit,
    });

    handler("SIGTERM");
    expect(exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(exit).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });

  it("ignores a second signal (close is called once)", () => {
    const server = { close: vi.fn() };
    const handler = createShutdownHandler({
      server,
      closePool: vi.fn().mockResolvedValue(undefined),
      logger: makeLogger(),
      timeoutMs: 5000,
      exit: vi.fn(),
    });
    handler("SIGTERM");
    handler("SIGINT");
    expect(server.close).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- shutdown`
Expected: FAIL — module `./shutdown` does not exist.

- [ ] **Step 3: Implement createShutdownHandler**

Create `artifacts/api-server/src/lib/shutdown.ts`:
```typescript
export interface ShutdownDeps {
  server: { close(cb: (err?: Error) => void): unknown };
  closePool: () => Promise<void>;
  logger: {
    info(obj: unknown, msg?: string): void;
    error(obj: unknown, msg?: string): void;
  };
  timeoutMs: number;
  exit: (code: number) => void;
}

/**
 * Build a signal handler that drains in-flight requests, closes the DB pool,
 * then exits. A hard timeout forces a non-zero exit if draining hangs so the
 * platform's SIGKILL grace period isn't wasted. Pure/injected deps so the
 * happy path and the timeout path are unit-testable without a real process.
 */
export function createShutdownHandler(
  deps: ShutdownDeps,
): (signal: string) => void {
  let started = false;
  return (signal: string) => {
    if (started) return; // a second signal during shutdown is a no-op
    started = true;
    deps.logger.info({ signal }, "Shutting down");

    const timer = setTimeout(() => {
      deps.logger.error({ signal }, "Shutdown timed out; forcing exit");
      deps.exit(1);
    }, deps.timeoutMs);
    // Don't let the timer keep the event loop alive.
    (timer as { unref?: () => void }).unref?.();

    deps.server.close((err?: Error) => {
      if (err) deps.logger.error({ err }, "Error during server close");
      deps
        .closePool()
        .then(() => {
          clearTimeout(timer);
          deps.exit(0);
        })
        .catch((poolErr: unknown) => {
          deps.logger.error({ err: poolErr }, "Error closing DB pool");
          clearTimeout(timer);
          deps.exit(1);
        });
    });
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @workspace/api-server test -- shutdown`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire signals in the server entry**

Replace `artifacts/api-server/src/index.ts` entirely:
```typescript
import app from "./app";
import { logger } from "./lib/logger";
import { getPool } from "@workspace/db";
import { createShutdownHandler } from "./lib/shutdown";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

const shutdown = createShutdownHandler({
  server,
  closePool: async () => {
    await getPool()?.end();
  },
  logger,
  timeoutMs: Number(process.env["SHUTDOWN_TIMEOUT_MS"] ?? 10_000),
  exit: (code) => process.exit(code),
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

- [ ] **Step 6: Typecheck, run api-server suite, commit**

Run: `pnpm run typecheck && pnpm --filter @workspace/api-server test`
Expected: PASS.

```bash
git add artifacts/api-server/src/lib/shutdown.ts artifacts/api-server/src/lib/shutdown.test.ts artifacts/api-server/src/index.ts
git commit -m "P1-6: graceful SIGTERM/SIGINT shutdown with drain + hard timeout"
```

---

### Task 4: P1-7a — rate limiter factories

Two `express-rate-limit` factories, IP-keyed (the library default under `trust proxy`), returning a JSON 429.

**Files:**
- Create: `artifacts/api-server/src/middlewares/rateLimit.ts`
- Modify: `artifacts/api-server/package.json`
- Test: `artifacts/api-server/src/middlewares/rateLimit.test.ts`

**Interfaces:**
- Produces: `createApiLimiter(): RequestHandler` (env `API_RATE_LIMIT`, default 100/min/IP); `createClerkLimiter(): RequestHandler` (env `CLERK_RATE_LIMIT`, default 30/min/IP).

- [ ] **Step 1: Add the dependency**

In `artifacts/api-server/package.json`, add to `dependencies`:
```jsonc
    "express-rate-limit": "^8.5.2",
```
Run: `pnpm install`
Expected: resolves.

- [ ] **Step 2: Write the failing test**

Create `artifacts/api-server/src/middlewares/rateLimit.test.ts`:
```typescript
import { describe, it, expect, afterEach } from "vitest";
import express, { type Express } from "express";
import request from "supertest";
import { createApiLimiter } from "./rateLimit";

afterEach(() => {
  delete process.env.API_RATE_LIMIT;
});

function appWithLimit(limit: number): Express {
  process.env.API_RATE_LIMIT = String(limit);
  const app = express();
  app.set("trust proxy", 1);
  app.use(createApiLimiter());
  app.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("createApiLimiter", () => {
  it("allows up to the limit, then returns a JSON 429", async () => {
    const app = appWithLimit(3);
    for (let i = 0; i < 3; i++) {
      expect((await request(app).get("/ping")).status).toBe(200);
    }
    const blocked = await request(app).get("/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Too many requests" });
  });

  it("keys by client IP from x-forwarded-for under trust proxy", async () => {
    const app = appWithLimit(1);
    const ip1 = { "x-forwarded-for": "1.1.1.1" };
    const ip2 = { "x-forwarded-for": "2.2.2.2" };
    expect((await request(app).get("/ping").set(ip1)).status).toBe(200);
    expect((await request(app).get("/ping").set(ip1)).status).toBe(429);
    // A different client IP still has its own allowance.
    expect((await request(app).get("/ping").set(ip2)).status).toBe(200);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- rateLimit`
Expected: FAIL — module `./rateLimit` does not exist.

- [ ] **Step 4: Implement the factories**

Create `artifacts/api-server/src/middlewares/rateLimit.ts`:
```typescript
import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";

const MINUTE_MS = 60_000;

// express-rate-limit's default keyGenerator keys by req.ip (IPv6-subnet aware),
// which is the real client IP once `app.set("trust proxy", 1)` is configured.
// The in-memory store is per-instance — an acknowledged stopgap on autoscale
// (a shared Redis store is a later item).

/**
 * General throttle for /api, keyed by client IP. Mounted BEFORE requireAuth so
 * an unauthenticated flood can't reach the Clerk verify path unthrottled.
 */
export function createApiLimiter(): RequestHandler {
  return rateLimit({
    windowMs: MINUTE_MS,
    limit: Number(process.env["API_RATE_LIMIT"] ?? 100),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
  });
}

/** Stricter throttle for the unauthenticated Clerk FAPI proxy (/api/__clerk). */
export function createClerkLimiter(): RequestHandler {
  return rateLimit({
    windowMs: MINUTE_MS,
    limit: Number(process.env["CLERK_RATE_LIMIT"] ?? 30),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: "Too many requests" });
    },
  });
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm --filter @workspace/api-server test -- rateLimit`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm run typecheck`
Expected: PASS.

```bash
git add artifacts/api-server/src/middlewares/rateLimit.ts artifacts/api-server/src/middlewares/rateLimit.test.ts artifacts/api-server/package.json pnpm-lock.yaml
git commit -m "P1-7: express-rate-limit factories (api + clerk-proxy), IP-keyed JSON 429"
```

---

### Task 5: P1-7b — app wiring: trust proxy + limiters + helmet

Wire `trust proxy`, both limiters, and helmet into `app.ts` in the correct order.

**Files:**
- Modify: `artifacts/api-server/src/app.ts`
- Modify: `artifacts/api-server/package.json`
- Test: `artifacts/api-server/src/middlewares/security-headers.test.ts`

**Interfaces:**
- Consumes: `createApiLimiter`, `createClerkLimiter` (Task 4); `helmet`; existing `CLERK_PROXY_PATH`, `clerkProxyMiddleware`.

- [ ] **Step 1: Add the dependency**

In `artifacts/api-server/package.json`, add to `dependencies`:
```jsonc
    "helmet": "^8.3.0",
```
Run: `pnpm install`
Expected: resolves.

- [ ] **Step 2: Write the failing test (helmet headers)**

Create `artifacts/api-server/src/middlewares/security-headers.test.ts`. It exercises the exact helmet config `app.ts` mounts:
```typescript
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import helmet from "helmet";

describe("helmet security headers on /api", () => {
  const app = express();
  app.use("/api", helmet({ contentSecurityPolicy: false }));
  app.get("/api/ping", (_req, res) => {
    res.json({ ok: true });
  });

  it("sets standard hardening headers and omits CSP for the JSON API", async () => {
    const res = await request(app).get("/api/ping");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["strict-transport-security"]).toContain("max-age=");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["content-security-policy"]).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @workspace/api-server test -- security-headers`
Expected: FAIL — `helmet` not yet installed / imported (module not found) until Step 1 done; if Step 1 is done it PASSES immediately (it tests helmet directly). If it passes here, that is acceptable — it locks the header contract before wiring. Proceed to Step 4 regardless.

- [ ] **Step 4: Wire app.ts**

In `artifacts/api-server/src/app.ts`:

Add imports near the top (after the existing imports):
```typescript
import helmet from "helmet";
import {
  createApiLimiter,
  createClerkLimiter,
} from "./middlewares/rateLimit";
```

Immediately after `const app: Express = express();` (line 15), add:
```typescript
// Behind the Replit edge (a single proxy hop): trust it so req.ip is the real
// client IP for rate-limit keying. `1`, not `true` — express-rate-limit rejects
// a fully-permissive trust-proxy setting.
app.set("trust proxy", 1);
```

Change the Clerk proxy mount (currently line 39) to throttle first:
```typescript
// Clerk Frontend API proxy — must be mounted BEFORE body parsers (it streams
// raw bytes). Throttle the unauthenticated proxy per IP before proxying.
app.use(CLERK_PROXY_PATH, createClerkLimiter());
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
```

After the `cors(...)` middleware block (currently ends line 74) and BEFORE `app.use(express.json())`, add helmet:
```typescript
// Security headers on the API surface. Mounted AFTER the Clerk proxy so proxied
// FAPI bytes are untouched. CSP disabled (JSON API); helmet's defaults still
// emit nosniff, HSTS, X-Frame-Options, and no-referrer.
app.use("/api", helmet({ contentSecurityPolicy: false }));
```

After the `clerkMiddleware(...)` block (currently ends line 87) and BEFORE `app.use("/api", router)`, add the general limiter:
```typescript
// General per-IP throttle, before any route's requireAuth so unauthenticated
// floods can't reach the Clerk verify path unthrottled.
app.use("/api", createApiLimiter());
```

The final middleware order must read: pinoHttp → clerkLimiter(`/api/__clerk`) → clerkProxy(`/api/__clerk`) → cors → helmet(`/api`) → json → urlencoded → clerkMiddleware → apiLimiter(`/api`) → router(`/api`) → errorHandler.

- [ ] **Step 5: Run the security-headers test and the full api-server suite**

Run: `pnpm --filter @workspace/api-server test`
Expected: PASS — security-headers test plus all existing tests. The existing 44 are unaffected because `test/helpers.ts` builds its own app without limiters/helmet.

- [ ] **Step 6: Full workspace gate + commit**

Run: `pnpm run typecheck && pnpm run test`
Expected: PASS — green across `lib/domain`, `lib/db` (new), api-server, cut-os. Total ~54 tests.

```bash
git add artifacts/api-server/src/app.ts artifacts/api-server/src/middlewares/security-headers.test.ts artifacts/api-server/package.json pnpm-lock.yaml
git commit -m "P1-7: trust proxy + IP rate limiting + helmet headers on /api"
```

---

### Task 6: Docs — record the new invariants

Capture the hardening invariants and the deferred follow-ups so future sessions don't undo them.

**Files:**
- Modify: `PRODUCT_RULES.md`

- [ ] **Step 1: Append a "Server hardening invariants" section**

Add to `PRODUCT_RULES.md` (cut-main root) a section stating:
- `provisionUser` is select-first / insert-on-miss — **no per-request write**; `updated_at` means "last settings/profile change," not "last seen." `GET /me` reuses `req.user`; do not re-select.
- The pg pool has a budget (`PG_POOL_MAX`, default 5) and an `'error'` handler; the server drains on SIGTERM/SIGINT via `createShutdownHandler` (`SHUTDOWN_TIMEOUT_MS`, default 10s). Point `DATABASE_URL` at the provider's pooled endpoint in production.
- `/api` is IP-rate-limited (`API_RATE_LIMIT`) with a stricter limit on `/api/__clerk` (`CLERK_RATE_LIMIT`); `trust proxy` is `1`. The in-memory store is **per-instance — a stopgap**; a shared (Redis) store is required for correct limits across autoscale instances.
- helmet is on `/api` with CSP disabled (JSON API).
- **Deferred (not built here):** email refresh via Clerk `user.updated` webhook / token template — email is captured only at user creation; a shared rate-limit store; P1-8 `x-forwarded-host` allowlist.

Use prose consistent with the existing `PRODUCT_RULES.md` style (read the file first and match its section format).

- [ ] **Step 2: Commit**

```bash
git add PRODUCT_RULES.md
git commit -m "docs: record P1-2/6/7 hardening invariants + deferred follow-ups"
```

---

## Self-Review

**Spec coverage:**
- P1-2 hot-path write elimination → Task 1 (select-first) ✓
- P1-2 GET /me re-select removal → Task 1 (req.user reuse) ✓
- P1-2 email captured at creation, not refreshed → preserved in Task 1; deferred note in Task 6 ✓
- P1-6 pool budget + `pool.on("error")` → Task 2 ✓
- P1-6 SIGTERM/SIGINT → server.close → pool.end + hard timeout → Task 3 ✓
- P1-7 `trust proxy` → Task 5 ✓
- P1-7 apiLimiter before auth + strict `/api/__clerk` limiter → Tasks 4 (factories) + 5 (wiring) ✓
- P1-7 helmet → Task 5 ✓
- Docs (PRODUCT_RULES invariants) → Task 6 ✓
- Deps pinned (helmet 8.3.0, express-rate-limit 8.5.2) → Global Constraints + Tasks 4/5 ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete final code; every run step states the exact command and expected result.

**Type consistency:** `getUserByClerkId` signature identical in Task 1 interface and body; `createShutdownHandler`'s `ShutdownDeps` matches the test's injected shape (`server.close(cb)`, `closePool(): Promise<void>`, `exit(code)`); `poolConfig` return type matches its test assertions; limiter factories return `RequestHandler` and are consumed as such in Task 5.

## Verification gate (whole plan)

`pnpm run typecheck && pnpm run test` → green. Test count grows from 44 to ~54: +3 api-server (userService no-write, getUserByClerkId, GET /me stable), +3 lib/db (poolConfig), +3 api-server (shutdown), +2 api-server (rateLimit), +1 api-server (security-headers). Existing 44 stay green.
