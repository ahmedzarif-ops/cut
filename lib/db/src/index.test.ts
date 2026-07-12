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
