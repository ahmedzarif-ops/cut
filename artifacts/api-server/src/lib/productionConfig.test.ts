import { describe, expect, it } from "vitest";
import {
  assertProductionConfiguration,
  ProductionConfigurationError,
  validateProductionConfiguration,
} from "./productionConfig";

function publishableKey(): string {
  const encoded = Buffer.from("clerk.cut.example.com$")
    .toString("base64")
    .replace(/=+$/, "");
  return `pk_live_${encoded}`;
}

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://cut_user:private-password@db.example.com/cut?sslmode=verify-full",
  CLERK_PUBLISHABLE_KEY: publishableKey(),
  CLERK_SECRET_KEY: "sk_live_ProductionSecretKey1234",
  REVENUECAT_SECRET_API_KEY: "sk_RevenueCatSecret1234",
  REVENUECAT_PROJECT_ID: "projProduction1234",
  REVENUECAT_ENTITLEMENT_REST_ID: "entlProduction1234",
  CORS_ALLOWED_ORIGINS: "https://api.cut.example.com",
};

describe("production configuration", () => {
  it("accepts complete live configuration with verified PostgreSQL TLS", () => {
    expect(validateProductionConfiguration(validProductionEnvironment)).toEqual(
      [],
    );
    expect(() =>
      assertProductionConfiguration(validProductionEnvironment),
    ).not.toThrow();
  });

  it("rejects every missing required production value", () => {
    expect(validateProductionConfiguration({ NODE_ENV: "production" })).toEqual(
      [
        "DATABASE_URL",
        "CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "REVENUECAT_SECRET_API_KEY",
        "REVENUECAT_PROJECT_ID",
        "REVENUECAT_ENTITLEMENT_REST_ID",
        "HTTPS_ALLOWED_ORIGIN",
      ],
    );
  });

  it.each([
    "not-a-url",
    "mysql://db.example.com/cut?sslmode=verify-full",
    "postgresql://db.example.com/cut",
    "postgresql://db.example.com/cut?sslmode=disable",
    "postgresql://db.example.com/cut?sslmode=require",
    "postgresql://db.example.com/cut?sslmode=verify-ca",
    "postgresql://db.example.com/cut?sslmode=verify-full&sslmode=require",
    "postgresql://db.example.com/cut?sslmode=verify-full&ssl=false",
  ])("rejects a database URL without unambiguous verified TLS: %s", (value) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        DATABASE_URL: value,
      }),
    ).toContain("DATABASE_URL");
  });

  it.each([
    "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
    "pk_live_not-a-real-publishable-key",
    "sk_live_ProductionSecretKey1234",
  ])("rejects a non-live or malformed Clerk publishable key", (value) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        CLERK_PUBLISHABLE_KEY: value,
      }),
    ).toContain("CLERK_PUBLISHABLE_KEY");
  });

  it.each([
    ["sk", "test", "DevelopmentSecretKey1234"].join("_"),
    "sk_live_short",
    "sk_live_secret with spaces",
    "sk_live_________________",
    "pk_live_NotASecretKey123456",
  ])("rejects a non-live or malformed Clerk secret key", (value) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        CLERK_SECRET_KEY: value,
      }),
    ).toContain("CLERK_SECRET_KEY");
  });

  it.each([
    ["REVENUECAT_SECRET_API_KEY", "public_not_a_secret"],
    ["REVENUECAT_SECRET_API_KEY", "sk_short"],
    ["REVENUECAT_SECRET_API_KEY", "sk_________"],
    ["REVENUECAT_PROJECT_ID", "prj_12345678"],
    ["REVENUECAT_PROJECT_ID", "proj bad value"],
    ["REVENUECAT_PROJECT_ID", "proj_________"],
    ["REVENUECAT_ENTITLEMENT_REST_ID", "entitlement_12345678"],
    ["REVENUECAT_ENTITLEMENT_REST_ID", "entl/bad-value"],
    ["REVENUECAT_ENTITLEMENT_REST_ID", "entl_________"],
  ] as const)("rejects malformed %s", (name, value) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        [name]: value,
      }),
    ).toContain(name);
  });

  it.each([
    "http://api.cut.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://api.example",
    "https://user:password@api.cut.example.com",
    "https://api.cut.example.com/path",
    "https://api.cut.example.com/",
  ])("rejects an absent or unusable HTTPS origin: %s", (origin) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        CORS_ALLOWED_ORIGINS: origin,
      }),
    ).toContain("HTTPS_ALLOWED_ORIGIN");
  });

  it("accepts a usable Replit-injected domain as an HTTPS origin", () => {
    const environment = { ...validProductionEnvironment };
    delete environment.CORS_ALLOWED_ORIGINS;
    environment.REPLIT_DEV_DOMAIN = "cut-api.replit.app";
    expect(validateProductionConfiguration(environment)).toEqual([]);
  });

  it("never includes a DSN or secret value in a production startup error", () => {
    const environment = {
      ...validProductionEnvironment,
      DATABASE_URL:
        "postgresql://private-user:do-not-print@db.example.com/cut?sslmode=require",
      CLERK_SECRET_KEY: "sk_test_do-not-print-this-secret",
    };

    let thrown: unknown;
    try {
      assertProductionConfiguration(environment);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ProductionConfigurationError);
    const message = (thrown as Error).message;
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("CLERK_SECRET_KEY");
    expect(message).not.toContain("private-user");
    expect(message).not.toContain("do-not-print");
    expect(message).not.toContain("db.example.com");
  });

  it("does not enforce production-only configuration in development or test", () => {
    expect(() =>
      assertProductionConfiguration({ NODE_ENV: "development" }),
    ).not.toThrow();
    expect(() =>
      assertProductionConfiguration({ NODE_ENV: "test" }),
    ).not.toThrow();
  });
});
