import { describe, it, expect } from "vitest";
import {
  PG_QUERY_TIMEOUT_MS,
  PG_STATEMENT_TIMEOUT_MS,
  poolConfig,
} from "./index";

describe("poolConfig", () => {
  it("defaults max to 5 and sets conservative timeouts", () => {
    const config = poolConfig({});
    expect(config.max).toBe(5);
    expect(config.idleTimeoutMillis).toBe(30_000);
    expect(config.connectionTimeoutMillis).toBe(10_000);
    expect(config.query_timeout).toBe(PG_QUERY_TIMEOUT_MS);
    expect(config.statement_timeout).toBe(PG_STATEMENT_TIMEOUT_MS);
  });

  it("reads PG_POOL_MAX from the environment", () => {
    expect(poolConfig({ PG_POOL_MAX: "12" }).max).toBe(12);
    expect(poolConfig({ PG_POOL_MAX: "20" }).max).toBe(20);
    expect(poolConfig({ PG_POOL_MAX: "1" }).max).toBe(1);
  });

  it("clamps garbage PG_POOL_MAX to the default (never pg's own 10)", () => {
    // Each of these must fall back to 5, never pg's own default of 10.
    expect(poolConfig({ PG_POOL_MAX: "abc" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: " " }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "0" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "-3" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "2.5" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "Infinity" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "01" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "21" }).max).toBe(5);
    expect(poolConfig({ PG_POOL_MAX: "100000" }).max).toBe(5);
  });

  it("passes DATABASE_URL through as the connection string", () => {
    expect(poolConfig({ DATABASE_URL: "postgres://x" }).connectionString).toBe(
      "postgres://x",
    );
  });
});
