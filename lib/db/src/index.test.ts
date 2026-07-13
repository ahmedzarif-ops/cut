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
    expect(poolConfig({ PG_POOL_MAX: "1" }).max).toBe(1);
  });

  it("clamps garbage PG_POOL_MAX to the default (never pg's own 10)", () => {
    // Without the clamp, pg receives NaN/0 and silently uses ITS default (10).
    expect(poolConfig({ PG_POOL_MAX: "abc" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: " " }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "0" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "-3" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "2.5" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "Infinity" }).max).toBe(5);
  });

  it("passes DATABASE_URL through as the connection string", () => {
    expect(poolConfig({ DATABASE_URL: "postgres://x" }).connectionString).toBe(
      "postgres://x",
    );
  });
});
