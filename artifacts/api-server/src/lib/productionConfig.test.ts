import { describe, expect, it } from "vitest";
import {
  assertProductionConfiguration,
  ProductionConfigurationError,
  validateProductionConfiguration,
} from "./productionConfig";

function publishableKey(frontendApi = "clerk.cut.example.com"): string {
  const encoded = Buffer.from(`${frontendApi}$`)
    .toString("base64")
    .replace(/=+$/, "");
  return `pk_live_${encoded}`;
}

const PLACEHOLDER_CLERK_FRONTEND_APIS = [
  "example.accounts.dev",
  "example.clerk.accounts.dev",
  "clerk.example.com",
] as const;

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  DATABASE_URL:
    "postgresql://cut_user:private-password@db.example.com/cut?sslmode=verify-full",
  CLERK_PUBLISHABLE_KEY: publishableKey(),
  CLERK_SECRET_KEY: "sk_live_ProductionSecretKey1234",
  REVENUECAT_SECRET_API_KEY: "sk_RevenueCatSecret1234",
  REVENUECAT_PROJECT_ID: "projProduction1234",
  REVENUECAT_ENTITLEMENT_REST_ID: "entlProduction1234",
  REVENUECAT_APP_REST_ID: "appProduction1234",
  REVENUECAT_OFFERING_REST_ID: "ofrngProduction1234",
  CORS_ALLOWED_ORIGINS: "https://api.cut.example.com",
  API_MAX_INSTANCES: "1",
  ACCOUNT_DELETION_RETRY_INTERVAL_MS: "60000",
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
        "REVENUECAT_APP_REST_ID",
        "REVENUECAT_OFFERING_REST_ID",
        "HTTPS_ALLOWED_ORIGIN",
        "API_MAX_INSTANCES",
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

  it.each(PLACEHOLDER_CLERK_FRONTEND_APIS)(
    "rejects placeholder live Clerk frontend %s",
    (frontendApi) => {
      expect(
        validateProductionConfiguration({
          ...validProductionEnvironment,
          CLERK_PUBLISHABLE_KEY: publishableKey(frontendApi),
        }),
      ).toContain("CLERK_PUBLISHABLE_KEY");
    },
  );

  it("rejects a live key that encodes a development Clerk frontend", () => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        CLERK_PUBLISHABLE_KEY: publishableKey("cut-os-13.clerk.accounts.dev"),
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
    ["REVENUECAT_APP_REST_ID", "iosapp_12345678"],
    ["REVENUECAT_APP_REST_ID", "app/bad-value"],
    ["REVENUECAT_APP_REST_ID", "app_________"],
    ["REVENUECAT_OFFERING_REST_ID", "offering_12345678"],
    ["REVENUECAT_OFFERING_REST_ID", "ofrng/bad-value"],
    ["REVENUECAT_OFFERING_REST_ID", "ofrng_________"],
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
    "api.cut.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://api.example",
    "https://user:password@api.cut.example.com",
    "https://api.cut.example.com:8443",
    "https://api.cut.example.com/path",
    "https://api.cut.example.com/",
    " https://api.cut.example.com",
    "https://api.cut.example.com ",
    "https://api.cut.example.com,https://other.cut.example.com",
    "https://api.cut.example.com,not-an-origin",
    "https://api.cut.example.com,",
  ])("rejects an absent or unusable HTTPS origin: %s", (origin) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        CORS_ALLOWED_ORIGINS: origin,
      }),
    ).toContain("HTTPS_ALLOWED_ORIGIN");
  });

  it.each(["REPLIT_DEV_DOMAIN", "REPLIT_EXPO_DEV_DOMAIN", "REPLIT_DOMAINS"])(
    "does not accept %s in place of the explicit canonical origin",
    (name) => {
      const environment = { ...validProductionEnvironment };
      delete environment.CORS_ALLOWED_ORIGINS;
      environment[name] = "cut-api.replit.app";

      expect(validateProductionConfiguration(environment)).toContain(
        "HTTPS_ALLOWED_ORIGIN",
      );
    },
  );

  it("ignores provider-injected domains when one canonical origin is explicit", () => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        REPLIT_DEV_DOMAIN: "dev-injection.replit.dev",
        REPLIT_EXPO_DEV_DOMAIN: "expo-injection.replit.dev",
        REPLIT_DOMAINS: "deployment-injection.replit.app,other.replit.app",
      }),
    ).toEqual([]);
  });

  it.each([undefined, "", "0", "01", "1.5", "two", " 1", "1 "])(
    "requires an explicit positive-integer API_MAX_INSTANCES topology: %s",
    (value) => {
      expect(
        validateProductionConfiguration({
          ...validProductionEnvironment,
          API_MAX_INSTANCES: value,
        }),
      ).toContain("API_MAX_INSTANCES");
    },
  );

  it("fails closed for multiple replicas until a real shared limiter store is integrated", () => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        API_MAX_INSTANCES: "2",
        // An invented setting cannot claim an implementation that is absent.
        RATE_LIMIT_STORE: "redis",
      }),
    ).toContain("SHARED_RATE_LIMIT_STORE");
  });

  it.each(["1000.5", "999", "300001", "2147483648", " 60000", "60000 "])(
    "rejects an unsafe account-deletion retry interval: %s",
    (value) => {
      expect(
        validateProductionConfiguration({
          ...validProductionEnvironment,
          ACCOUNT_DELETION_RETRY_INTERVAL_MS: value,
        }),
      ).toContain("ACCOUNT_DELETION_RETRY_INTERVAL_MS");
    },
  );

  it.each([undefined, "1000", "60000", "300000"])(
    "accepts the default or a bounded account-deletion retry interval: %s",
    (value) => {
      const environment = { ...validProductionEnvironment };
      if (value === undefined) {
        delete environment.ACCOUNT_DELETION_RETRY_INTERVAL_MS;
      } else {
        environment.ACCOUNT_DELETION_RETRY_INTERVAL_MS = value;
      }
      expect(validateProductionConfiguration(environment)).toEqual([]);
    },
  );

  it.each([
    ["API_RATE_LIMIT", "0"],
    ["API_RATE_LIMIT", "1.5"],
    ["API_RATE_LIMIT", "10001"],
    ["CLERK_RATE_LIMIT", "NaN"],
    ["CLERK_RATE_LIMIT", "01"],
    ["CLERK_RATE_LIMIT", "1001"],
    ["PG_POOL_MAX", "0"],
    ["PG_POOL_MAX", "2.5"],
    ["PG_POOL_MAX", "21"],
  ] as const)("rejects unsafe production tuning %s=%s", (name, value) => {
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        [name]: value,
      }),
    ).toContain(name);
  });

  it("accepts absent defaults and exact tuning boundaries", () => {
    expect(validateProductionConfiguration(validProductionEnvironment)).toEqual(
      [],
    );
    expect(
      validateProductionConfiguration({
        ...validProductionEnvironment,
        API_RATE_LIMIT: "10000",
        CLERK_RATE_LIMIT: "1000",
        PG_POOL_MAX: "20",
      }),
    ).toEqual([]);
  });

  it("never includes a DSN or secret value in a production startup error", () => {
    const environment = {
      ...validProductionEnvironment,
      DATABASE_URL:
        "postgresql://private-user:do-not-print@db.example.com/cut?sslmode=require",
      CLERK_SECRET_KEY: "sk_test_do-not-print-this-secret",
      ACCOUNT_DELETION_RETRY_INTERVAL_MS: "2147483648",
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
    expect(message).toContain("ACCOUNT_DELETION_RETRY_INTERVAL_MS");
    expect(message).not.toContain("private-user");
    expect(message).not.toContain("do-not-print");
    expect(message).not.toContain("db.example.com");
    expect(message).not.toContain("2147483648");
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
