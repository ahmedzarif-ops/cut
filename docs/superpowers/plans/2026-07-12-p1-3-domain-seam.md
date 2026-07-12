# P1-3 Domain + Services Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a pure `@workspace/domain` package and an `api-server/src/services/` layer, refactoring the user/profile I/O out of routes/middleware into a `userService` exemplar — the deterministic-rules home §29 requires before Phase 1.

**Architecture:** `route (transport) → service (I/O) → db + lib/domain (pure rules)`. Domain is I/O-free with an injected `Clock`/timezone. Services use the global `db` proxy; tests inject PGlite via the existing `setDb` seam. Behavior is unchanged — the refactor runs under the existing 16 api-server integration tests.

**Tech Stack:** pnpm workspace, TypeScript (composite project refs), Drizzle ORM, Express 5, vitest, PGlite.

## Global Constraints

- Package naming: `@workspace/<name>`, `private: true`, `type: "module"`, `exports: { ".": "./src/index.ts" }` (copy `@workspace/api-zod`).
- `lib/domain` has **zero runtime dependencies** (pure math + built-in `Intl`).
- Domain functions are pure and I/O-free; time enters only through an injected `Clock`. No `new Date()` inside a rule.
- Services reach the DB **only** through the global `db` proxy from `@workspace/db` (never an injected db param).
- Storage is metric; `targetDate` is a `YYYY-MM-DD` string column (`date({ mode: "string" })`).
- Catalog versions: `vitest: catalog:`. tsconfigs extend `../../tsconfig.base.json` with `composite: true`, `emitDeclarationOnly: true`.
- Commit after each task. Do NOT push, merge, or deploy.

---

### Task 1: `@workspace/domain` package — Clock + localDayKey/todayKey

**Files:**
- Create: `lib/domain/package.json`
- Create: `lib/domain/tsconfig.json`
- Create: `lib/domain/src/clock.ts`
- Create: `lib/domain/src/localDay.ts`
- Create: `lib/domain/src/index.ts`
- Create (test): `lib/domain/src/localDay.test.ts`
- Modify: `tsconfig.json` (root) — add reference

**Interfaces:**
- Produces: `interface Clock { now(): Date }`, `const systemClock: Clock`; `localDayKey(instant: Date, timeZone: string): string` (→ `"YYYY-MM-DD"`); `todayKey(clock: Clock, timeZone: string): string`.

- [ ] **Step 1: Create the package manifest**

`lib/domain/package.json`:
```json
{
  "name": "@workspace/domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "catalog:"
  }
}
```

- [ ] **Step 2: Create the composite tsconfig (excludes tests from emit)**

`lib/domain/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create the injected-clock seam**

`lib/domain/src/clock.ts`:
```ts
/**
 * The current instant, injected so time-dependent rules stay deterministic in
 * tests. Rules take a Clock instead of calling `new Date()` themselves.
 */
export interface Clock {
  now(): Date;
}

/** The real system clock — the production default. */
export const systemClock: Clock = {
  now: () => new Date(),
};
```

- [ ] **Step 4: Create the barrel (clock + localDay for now)**

`lib/domain/src/index.ts`:
```ts
export * from "./clock";
export * from "./localDay";
```

- [ ] **Step 5: Register the package in the root tsconfig**

Modify `tsconfig.json` (root) `references` array — add `{ "path": "./lib/domain" }` after the existing entries:
```json
  "references": [
    { "path": "./lib/db" },
    { "path": "./lib/api-client-react" },
    { "path": "./lib/api-zod" },
    { "path": "./lib/domain" }
  ]
```

- [ ] **Step 6: Install to link the new workspace package**

Run: `pnpm install`
Expected: adds `@workspace/domain`, links `vitest`, no errors.

- [ ] **Step 7: Write the failing test**

`lib/domain/src/localDay.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { localDayKey, todayKey } from "./localDay";
import type { Clock } from "./clock";

describe("localDayKey", () => {
  it("resolves the local calendar day per time zone", () => {
    // 02:00 UTC on the 12th is still the 11th in LA, already the 12th in Dhaka.
    const instant = new Date("2026-07-12T02:00:00Z");
    expect(localDayKey(instant, "America/Los_Angeles")).toBe("2026-07-11");
    expect(localDayKey(instant, "Asia/Dhaka")).toBe("2026-07-12");
    expect(localDayKey(instant, "UTC")).toBe("2026-07-12");
  });

  it("is stable for a midday instant across zones", () => {
    const noonUtc = new Date("2026-07-12T12:00:00Z");
    expect(localDayKey(noonUtc, "Asia/Dhaka")).toBe("2026-07-12");
    expect(localDayKey(noonUtc, "America/Los_Angeles")).toBe("2026-07-12");
  });

  it("throws RangeError on an unknown time zone", () => {
    expect(() => localDayKey(new Date(), "Not/AZone")).toThrow(RangeError);
  });
});

describe("todayKey", () => {
  it("composes localDayKey with an injected clock (deterministic)", () => {
    const fixed: Clock = { now: () => new Date("2026-07-12T02:00:00Z") };
    expect(todayKey(fixed, "America/Los_Angeles")).toBe("2026-07-11");
    expect(todayKey(fixed, "Asia/Dhaka")).toBe("2026-07-12");
  });
});
```

- [ ] **Step 8: Run the test — verify it fails**

Run: `pnpm --filter @workspace/domain run test`
Expected: FAIL — cannot resolve `./localDay` (module not created yet).

- [ ] **Step 9: Implement the module**

`lib/domain/src/localDay.ts`:
```ts
import type { Clock } from "./clock";

/**
 * The user-local calendar day for `instant`, as "YYYY-MM-DD", in the given IANA
 * time zone. Pure: the instant is supplied, never read from a clock.
 *
 * Assumes a validated IANA `timeZone` (validation is P1-5's job at the write
 * boundary). An unknown zone throws RangeError from Intl.
 */
export function localDayKey(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: "year" | "month" | "day"): string => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`missing ${type} in formatted date`);
    return part.value;
  };
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** The user's current local day — localDayKey composed with an injected clock. */
export function todayKey(clock: Clock, timeZone: string): string {
  return localDayKey(clock.now(), timeZone);
}
```

- [ ] **Step 10: Run the test — verify it passes**

Run: `pnpm --filter @workspace/domain run test`
Expected: PASS (4 tests).

- [ ] **Step 11: Commit**

```bash
git add lib/domain tsconfig.json pnpm-lock.yaml
git commit -m "P1-3: lib/domain package with injected Clock + localDayKey/todayKey"
```

---

### Task 2: `estimateOneRepMax` in `@workspace/domain`

**Files:**
- Create: `lib/domain/src/e1rm.ts`
- Create (test): `lib/domain/src/e1rm.test.ts`
- Modify: `lib/domain/src/index.ts` — add e1rm export

**Interfaces:**
- Produces: `type E1rmFormula = "epley" | "brzycki"`; `estimateOneRepMax(weightKg: number, reps: number, formula?: E1rmFormula): number`.

- [ ] **Step 1: Write the failing test**

`lib/domain/src/e1rm.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { estimateOneRepMax } from "./e1rm";

describe("estimateOneRepMax", () => {
  it("returns the lifted weight at 1 rep for both formulas", () => {
    expect(estimateOneRepMax(100, 1, "epley")).toBe(100);
    expect(estimateOneRepMax(100, 1, "brzycki")).toBe(100);
  });

  it("computes Epley (the default)", () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
  });

  it("computes Brzycki, distinct from Epley away from 10 reps", () => {
    // Brzycki: 100 * 36 / (37 - 5) = 112.5 (Epley at 5 reps would be ~116.67).
    expect(estimateOneRepMax(100, 5, "brzycki")).toBe(112.5);
  });

  it("throws on non-positive or non-integer reps", () => {
    expect(() => estimateOneRepMax(100, 0)).toThrow(RangeError);
    expect(() => estimateOneRepMax(100, 2.5)).toThrow(RangeError);
  });

  it("throws for Brzycki at reps >= 37 (outside the formula domain)", () => {
    expect(() => estimateOneRepMax(100, 37, "brzycki")).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `pnpm --filter @workspace/domain run test`
Expected: FAIL — cannot resolve `./e1rm`.

- [ ] **Step 3: Implement the module**

`lib/domain/src/e1rm.ts`:
```ts
export type E1rmFormula = "epley" | "brzycki";

/**
 * Estimated one-rep max (kg) from a submaximal set. Pure.
 * Epley:   w * (1 + reps/30)
 * Brzycki: w * 36 / (37 - reps)   (undefined at reps >= 37)
 * Both agree that a 1-rep set is itself the 1RM.
 */
export function estimateOneRepMax(
  weightKg: number,
  reps: number,
  formula: E1rmFormula = "epley",
): number {
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new RangeError(`weightKg must be a non-negative finite number, got ${weightKg}`);
  }
  if (!Number.isInteger(reps) || reps < 1) {
    throw new RangeError(`reps must be a positive integer, got ${reps}`);
  }
  if (reps === 1) return weightKg;
  if (formula === "epley") return weightKg * (1 + reps / 30);
  if (reps >= 37) {
    throw new RangeError(`brzycki is undefined for reps >= 37, got ${reps}`);
  }
  return (weightKg * 36) / (37 - reps);
}
```

- [ ] **Step 4: Add the export to the barrel**

Modify `lib/domain/src/index.ts` — append:
```ts
export * from "./e1rm";
```

- [ ] **Step 5: Run the test — verify it passes**

Run: `pnpm --filter @workspace/domain run test`
Expected: PASS (all localDay + e1rm tests green).

- [ ] **Step 6: Commit**

```bash
git add lib/domain/src
git commit -m "P1-3: add pure estimateOneRepMax (Epley/Brzycki) to lib/domain"
```

---

### Task 3: `userService.provisionUser` + refactor `requireAuth`

**Files:**
- Create: `artifacts/api-server/src/services/userService.ts`
- Create (test): `artifacts/api-server/src/services/userService.test.ts`
- Modify: `artifacts/api-server/src/middlewares/requireAuth.ts`

**Interfaces:**
- Consumes: `@workspace/db` (`db`, `usersTable`, `type User`).
- Produces: `provisionUser(input: { clerkUserId: string; email: string | null }): Promise<User | undefined>`.

- [ ] **Step 1: Write the failing service test**

`artifacts/api-server/src/services/userService.test.ts`:
```ts
import { describe, it, expect, afterEach } from "vitest";
import { createTestContext, type TestContext } from "../test/helpers";
import { provisionUser } from "./userService";

let ctx: TestContext;
afterEach(async () => {
  await ctx?.close();
});

describe("provisionUser", () => {
  it("creates a row on first call and returns the same row on the second (idempotent)", async () => {
    ctx = await createTestContext();

    const first = await provisionUser({ clerkUserId: "clerk_abc", email: "a@b.com" });
    const second = await provisionUser({ clerkUserId: "clerk_abc", email: "a@b.com" });

    expect(first?.id).toBeDefined();
    expect(second?.id).toBe(first?.id);
    expect(first?.clerkUserId).toBe("clerk_abc");
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `pnpm --filter @workspace/api-server run test -- userService`
Expected: FAIL — cannot resolve `./userService`.

- [ ] **Step 3: Create the service with `provisionUser`**

`artifacts/api-server/src/services/userService.ts`:
```ts
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

/**
 * Just-in-time user provisioning. Upserts on the unique clerk_user_id;
 * onConflictDoUpdate always returns the row (inserted or existing), avoiding a
 * select+insert race. Returns undefined only if the write returned no row.
 */
export async function provisionUser(input: {
  clerkUserId: string;
  email: string | null;
}): Promise<User | undefined> {
  const [user] = await db
    .insert(usersTable)
    .values({ clerkUserId: input.clerkUserId, email: input.email })
    .onConflictDoUpdate({
      target: usersTable.clerkUserId,
      set: { updatedAt: new Date() },
    })
    .returning();
  return user;
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `pnpm --filter @workspace/api-server run test -- userService`
Expected: PASS.

- [ ] **Step 5: Refactor `requireAuth` to delegate to the service**

Modify `artifacts/api-server/src/middlewares/requireAuth.ts` — replace the inline `db.insert(...).onConflictDoUpdate(...)` block (and the `db`/`usersTable`/`eq` imports it needed) with a call to the service. Final file:
```ts
import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { provisionUser } from "../services/userService";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      clerkUserId?: string;
    }
  }
}

/**
 * Authentication gate + JIT user provisioning. Verifies the Clerk session,
 * resolves (or creates) the internal users row, and attaches the internal uuid
 * to `req.userId`. All DB work lives in userService.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const claims = auth.sessionClaims as { email?: string } | undefined;
  const email = typeof claims?.email === "string" ? claims.email : null;

  const user = await provisionUser({ clerkUserId, email });

  if (!user) {
    req.log.error({ clerkUserId }, "Failed to provision internal user");
    res.status(500).json({ error: "Failed to resolve user" });
    return;
  }

  req.userId = user.id;
  req.clerkUserId = clerkUserId;
  next();
}
```

- [ ] **Step 6: Run the full api-server suite — verify still green**

Run: `pnpm --filter @workspace/api-server run test`
Expected: PASS — 16 existing integration tests + the new provisionUser test.

- [ ] **Step 7: Commit**

```bash
git add artifacts/api-server/src/services artifacts/api-server/src/middlewares/requireAuth.ts
git commit -m "P1-3: extract provisionUser into userService; thin requireAuth"
```

---

### Task 4: Move user/profile route logic into `userService`; thin `me.ts`

**Files:**
- Modify: `artifacts/api-server/src/services/userService.ts` — add 4 functions
- Modify: `artifacts/api-server/src/routes/me.ts`
- Modify (test): `artifacts/api-server/src/services/userService.test.ts` — add upsertProfile default test

**Interfaces:**
- Produces:
  - `getUserById(userId: string): Promise<User | undefined>`
  - `updateUser(userId: string, patch: UpdateUserPatch): Promise<User | undefined>` where `UpdateUserPatch = Partial<Pick<User, "timezone" | "units" | "onboardingComplete">>`
  - `getProfile(userId: string): Promise<Profile | undefined>`
  - `upsertProfile(userId: string, input: UpsertProfileInput): Promise<Profile | undefined>`
  - `interface UpsertProfileInput` (see Step 1)

- [ ] **Step 1: Add the four functions to `userService.ts`**

Append to `artifacts/api-server/src/services/userService.ts` (and extend the import to include `profilesTable`, `type Profile`):
```ts
import { eq } from "drizzle-orm";
import { db, usersTable, profilesTable, type User, type Profile } from "@workspace/db";

// ... provisionUser stays above ...

export type UpdateUserPatch = Partial<
  Pick<User, "timezone" | "units" | "onboardingComplete">
>;

export async function getUserById(userId: string): Promise<User | undefined> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user;
}

export async function updateUser(
  userId: string,
  patch: UpdateUserPatch,
): Promise<User | undefined> {
  const [user] = await db
    .update(usersTable)
    .set(patch)
    .where(eq(usersTable.id, userId))
    .returning();
  return user;
}

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  return profile;
}

/** The parsed UpsertMyProfileBody shape (only `goal` is required). */
export interface UpsertProfileInput {
  goal: Profile["goal"];
  displayName?: string;
  sex?: Profile["sex"];
  birthYear?: number;
  heightCm?: number;
  startWeightKg?: number;
  goalWeightKg?: number;
  targetDate?: string;
  activityLevel?: Profile["activityLevel"];
  trainingExperience?: Profile["trainingExperience"];
}

/**
 * Create or replace the user's profile. PUT is a full replace: every optional
 * field the client omits is reset to its null/default rather than retaining a
 * stale value (the P0 edit-plan data-loss contract). Only `goal` is required.
 */
export async function upsertProfile(
  userId: string,
  input: UpsertProfileInput,
): Promise<Profile | undefined> {
  const values = {
    userId,
    goal: input.goal,
    sex: input.sex ?? "unspecified",
    activityLevel: input.activityLevel ?? "moderate",
    trainingExperience: input.trainingExperience ?? "beginner",
    displayName: input.displayName ?? null,
    birthYear: input.birthYear ?? null,
    heightCm: input.heightCm ?? null,
    startWeightKg: input.startWeightKg ?? null,
    goalWeightKg: input.goalWeightKg ?? null,
    targetDate: input.targetDate ?? null,
  };
  const [profile] = await db
    .insert(profilesTable)
    .values(values)
    .onConflictDoUpdate({
      target: profilesTable.userId,
      set: {
        goal: values.goal,
        sex: values.sex,
        activityLevel: values.activityLevel,
        trainingExperience: values.trainingExperience,
        displayName: values.displayName,
        birthYear: values.birthYear,
        heightCm: values.heightCm,
        startWeightKg: values.startWeightKg,
        goalWeightKg: values.goalWeightKg,
        targetDate: values.targetDate,
        updatedAt: new Date(),
      },
    })
    .returning();
  return profile;
}
```

- [ ] **Step 2: Refactor `me.ts` to call the service**

Replace the body of `artifacts/api-server/src/routes/me.ts` with thin handlers:
```ts
import { Router, type IRouter } from "express";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
  GetMyProfileResponse,
  UpsertMyProfileBody,
  UpsertMyProfileResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  getUserById,
  updateUser,
  getProfile,
  upsertProfile,
} from "../services/userService";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = await getUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(GetMeResponse.parse(user));
});

router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await updateUser(req.userId!, parsed.data);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(UpdateMeResponse.parse(user));
});

router.get("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const profile = await getProfile(req.userId!);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(GetMyProfileResponse.parse(profile));
});

router.put("/me/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpsertMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const profile = await upsertProfile(req.userId!, parsed.data);
  res.json(UpsertMyProfileResponse.parse(profile));
});

export default router;
```

- [ ] **Step 3: Add a focused unit test for the full-replace null-defaulting**

Append to `artifacts/api-server/src/services/userService.test.ts`:
```ts
import { provisionUser, upsertProfile, getProfile } from "./userService";

describe("upsertProfile full-replace", () => {
  it("resets omitted optional fields to null on re-save", async () => {
    ctx = await createTestContext();
    const user = await provisionUser({ clerkUserId: "clerk_p", email: null });

    await upsertProfile(user!.id, {
      goal: "cut",
      heightCm: 180,
      startWeightKg: 90,
      targetDate: "2026-09-01",
    });
    // Second save omits height/weight/targetDate — full replace nulls them.
    await upsertProfile(user!.id, { goal: "maintain" });

    const profile = await getProfile(user!.id);
    expect(profile?.goal).toBe("maintain");
    expect(profile?.heightCm).toBeNull();
    expect(profile?.startWeightKg).toBeNull();
    expect(profile?.targetDate).toBeNull();
  });
});
```

- [ ] **Step 4: Run the full api-server suite — verify green**

Run: `pnpm --filter @workspace/api-server run test`
Expected: PASS — all integration tests + provisionUser + upsertProfile tests.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/services artifacts/api-server/src/routes/me.ts
git commit -m "P1-3: move user/profile I/O into userService; thin me.ts routes"
```

---

### Task 5: Wire `@workspace/domain` into api-server; add `PRODUCT_RULES.md`; full gate

**Files:**
- Modify: `artifacts/api-server/package.json` — add dep
- Modify: `artifacts/api-server/tsconfig.json` — add reference
- Create: `PRODUCT_RULES.md` (cut-main root)

**Interfaces:** none new (wiring + docs).

- [ ] **Step 1: Declare the domain dependency**

Modify `artifacts/api-server/package.json` `dependencies` — add (keep alphabetical near the other `@workspace/*`):
```json
    "@workspace/domain": "workspace:*",
```

- [ ] **Step 2: Add the tsconfig project reference**

Modify `artifacts/api-server/tsconfig.json` `references` — add:
```json
    { "path": "../../lib/domain" }
```

- [ ] **Step 3: Install to link**

Run: `pnpm install`
Expected: `@workspace/domain` linked into api-server, no errors.

- [ ] **Step 4: Create the rules-home doc**

`PRODUCT_RULES.md` (cut-main root):
```markdown
# Product rules

All **deterministic product rules** live in `lib/domain` (`@workspace/domain`):
pure, I/O-free functions with an injected clock/timezone. Examples today:
`localDayKey`/`todayKey` (user-local calendar day for daily rollups) and
`estimateOneRepMax`.

The seam, top to bottom:

- **`lib/domain`** — pure rules. No `db`, no `express`, no `new Date()` inside a
  rule (time enters via an injected `Clock`). Unit-tested with fixed inputs.
- **`api-server/src/services`** — I/O orchestration. Reads/writes via the
  `@workspace/db` `db` proxy and calls `lib/domain`. `userService` is the
  exemplar.
- **routes / RN screens** — thin. Auth, request/response validation, status
  codes, navigation. They call services; they never embed rule logic and never
  touch `db` directly.

When you add a rule (next-action, streaks, macro completion, e1RM progression),
it goes in `lib/domain` with tests — never inline in a route or screen (build
spec §29). The first Phase 2 consumer of `localDayKey` will be the streak /
Today-aggregate service.
```

- [ ] **Step 5: Full workspace gate**

Run: `pnpm run typecheck && pnpm run test`
Expected: PASS — composite build includes `lib/domain`; all suites green (26 existing + ~5 domain + ~3 service tests).

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/package.json artifacts/api-server/tsconfig.json pnpm-lock.yaml PRODUCT_RULES.md
git commit -m "P1-3: wire @workspace/domain into api-server; add PRODUCT_RULES.md"
```

---

## Self-Review

**Spec coverage:** lib/domain package (T1–T2) ✓; services layer (T3–T4) ✓; userService exemplar refactoring requireAuth + me.ts (T3–T4) ✓; global-db-proxy convention (T3–T4) ✓; injected Clock/timezone (T1) ✓; localDayKey + e1RM seeds (T1–T2) ✓; wiring root+api-server tsconfig + dep (T1,T5) ✓; PRODUCT_RULES.md (T5) ✓; vitest wiring (T1 test script + root `pnpm -r test`) ✓; verification gate (T5) ✓. No spec requirement left unassigned.

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows full code; every run step states expected output.

**Type consistency:** `provisionUser` input `{ clerkUserId; email: string|null }` matches requireAuth call (T3). `UpdateUserPatch` widens `units` to `string`, so `parsed.data` (enum) from `UpdateMeBody` is assignable (T4). `UpsertProfileInput.goal` is required, others optional — matches `UpsertMyProfileBody` (only `goal` required) and the null-defaulting reproduces the current route behavior verbatim (T4). `todayKey(clock, timeZone)` uses the `Clock` from T1. Barrel exports grow T1→T2 without renames.
