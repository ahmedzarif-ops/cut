import { isPublishableKey, parsePublishableKey } from "@clerk/shared/keys";
import { isIP } from "node:net";
import { parseProductionCanonicalOrigin } from "./allowedHosts";
import { parseAccountDeletionRetryInterval } from "./accountDeletionRetryInterval";
import {
  API_RATE_LIMIT_MAXIMUM,
  CLERK_RATE_LIMIT_MAXIMUM,
  parseBoundedInteger,
} from "./boundedInteger";

export type ProductionConfigurationIssue =
  | "DATABASE_URL"
  | "CLERK_PUBLISHABLE_KEY"
  | "CLERK_SECRET_KEY"
  | "REVENUECAT_SECRET_API_KEY"
  | "REVENUECAT_PROJECT_ID"
  | "REVENUECAT_ENTITLEMENT_REST_ID"
  | "REVENUECAT_APP_REST_ID"
  | "REVENUECAT_OFFERING_REST_ID"
  | "HTTPS_ALLOWED_ORIGIN"
  | "PUBLIC_APP_ORIGIN"
  | "BASE_PATH"
  | "BUILD_SHA"
  | "API_MAX_INSTANCES"
  | "SHARED_RATE_LIMIT_STORE"
  | "ACCOUNT_DELETION_RETRY_INTERVAL_MS"
  | "API_RATE_LIMIT"
  | "CLERK_RATE_LIMIT"
  | "PG_POOL_MAX";

const PLACEHOLDER_CLERK_FRONTEND_APIS = new Set([
  "example.accounts.dev",
  "example.clerk.accounts.dev",
  "clerk.example.com",
]);
const PG_POOL_MAXIMUM = 20;
const FULL_GIT_SHA = /^(?!0{40}$)[0-9a-f]{40}$/u;
const DNS_HOSTNAME =
  /^(?=.{1,253}\.?$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.?$/iu;

type ManagedProductionDatabaseUrl = {
  sslMode: "require" | "verify-full";
};

function isIpLiteralHostname(hostname: string): boolean {
  if (isIP(hostname) !== 0) return true;

  // WHATWG's special-scheme host parser canonicalizes legacy numeric IPv4
  // spellings (for example octal or hexadecimal) that `node:net.isIP` does
  // not recognize directly. Those are still IP literals, not DNS names.
  try {
    const canonicalHostname = new URL(`http://${hostname}`).hostname.replace(
      /^\[|\]$/gu,
      "",
    );
    return isIP(canonicalHostname) !== 0;
  } catch {
    return false;
  }
}

function parseManagedProductionDatabaseUrl(
  value: string | undefined,
): ManagedProductionDatabaseUrl | undefined {
  const candidate = value?.trim();
  if (!candidate || candidate !== value || /\s/u.test(candidate)) {
    return undefined;
  }

  try {
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.replace(/^\[|\]$/gu, "");
    const queryKeys = [...parsed.searchParams.keys()];
    const sslModes = parsed.searchParams.getAll("sslmode");
    const sslMode = sslModes[0];
    const hasAmbiguousTlsParameter = queryKeys.some(
      (key) =>
        (key.toLowerCase() === "sslmode" && key !== "sslmode") ||
        key.toLowerCase() === "ssl",
    );

    if (
      (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
      !parsed.username ||
      !parsed.password ||
      !hostname ||
      !DNS_HOSTNAME.test(hostname) ||
      isIpLiteralHostname(hostname) ||
      !parsed.pathname.slice(1).replaceAll("/", "") ||
      parsed.hash ||
      hasAmbiguousTlsParameter ||
      sslModes.length !== 1 ||
      (sslMode !== "require" && sslMode !== "verify-full")
    ) {
      return undefined;
    }

    return { sslMode };
  } catch {
    return undefined;
  }
}

/**
 * Accepts only the provider-managed PostgreSQL URL shape used in production.
 * An exact `sslmode=require` is upgraded without exposing credentials;
 * already verified URLs are returned unchanged.
 */
export function normalizeProductionDatabaseUrlForRuntime(
  value: string | undefined,
): string | undefined {
  const parsed = parseManagedProductionDatabaseUrl(value);
  if (!parsed || !value) return undefined;
  if (parsed.sslMode === "verify-full") return value;

  const normalized = value.replace(
    /([?&])sslmode=require(?=&|$)/u,
    "$1sslmode=verify-full",
  );
  return normalized === value ? undefined : normalized;
}

/**
 * Replit currently injects a read-only production DSN with `sslmode=require`.
 * Upgrade that one recognized shape before validation and before the lazy
 * database pool reads process.env. Invalid or ambiguous values remain
 * untouched so the existing production validator fails closed.
 */
export function prepareProductionEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV !== "production") return;
  const normalized = normalizeProductionDatabaseUrlForRuntime(env.DATABASE_URL);
  if (normalized !== undefined) env.DATABASE_URL = normalized;
}

function isClerkDevelopmentFrontendApi(frontendApi: string): boolean {
  return frontendApi.endsWith(".accounts.dev");
}

function hasVerifiedTlsDatabaseUrl(value: string | undefined): boolean {
  return parseManagedProductionDatabaseUrl(value)?.sslMode === "verify-full";
}

function isLiveClerkPublishableKey(value: string | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate || candidate !== value || !candidate.startsWith("pk_live_")) {
    return false;
  }
  const parsed = parsePublishableKey(candidate);
  const frontendApi = parsed?.frontendApi.toLowerCase();
  if (
    !isPublishableKey(candidate) ||
    parsed?.instanceType !== "production" ||
    !frontendApi
  ) {
    return false;
  }
  return (
    !PLACEHOLDER_CLERK_FRONTEND_APIS.has(frontendApi) &&
    !isClerkDevelopmentFrontendApi(frontendApi)
  );
}

function isLiveClerkSecretKey(value: string | undefined): boolean {
  const candidate = value?.trim();
  const suffix = candidate?.slice("sk_live_".length);
  return Boolean(
    candidate &&
    candidate === value &&
    /^sk_live_[A-Za-z0-9_-]{16,}$/.test(candidate) &&
    suffix &&
    /[A-Za-z0-9]/.test(suffix),
  );
}

function isRevenueCatSecretKey(value: string | undefined): boolean {
  const candidate = value?.trim();
  const suffix = candidate?.slice("sk_".length);
  return Boolean(
    candidate &&
    candidate === value &&
    candidate.length <= 255 &&
    /^sk_[A-Za-z0-9_-]{8,}$/.test(candidate) &&
    suffix &&
    /[A-Za-z0-9]/.test(suffix),
  );
}

function isRevenueCatResourceId(
  value: string | undefined,
  prefix: "proj" | "entl" | "app" | "ofrng",
): boolean {
  const candidate = value?.trim();
  const suffix = candidate?.slice(prefix.length);
  return Boolean(
    candidate &&
    candidate === value &&
    candidate.length <= 255 &&
    new RegExp(`^${prefix}[A-Za-z0-9_-]{8,}$`).test(candidate) &&
    suffix &&
    /[A-Za-z0-9]/.test(suffix),
  );
}

function hasCanonicalHttpsAllowedOrigin(env: NodeJS.ProcessEnv): boolean {
  return parseProductionCanonicalOrigin(env.CORS_ALLOWED_ORIGINS) !== undefined;
}

function hasMatchingPublicAppOrigin(env: NodeJS.ProcessEnv): boolean {
  const allowedOrigin = parseProductionCanonicalOrigin(
    env.CORS_ALLOWED_ORIGINS,
  );
  const publicOrigin = parseProductionCanonicalOrigin(env.PUBLIC_APP_ORIGIN);
  return Boolean(
    allowedOrigin &&
    publicOrigin &&
    allowedOrigin.origin === publicOrigin.origin,
  );
}

/**
 * The combined production ingress is rooted at `/`. Accept the two explicit
 * root spellings plus an absent value, but reject normalization-dependent
 * aliases and every mounted path so API, Clerk, public, and legal URLs cannot
 * silently diverge.
 */
export function hasRootProductionBasePath(value: string | undefined): boolean {
  return value === undefined || value === "" || value === "/";
}

function hasExactBuildSha(value: string | undefined): boolean {
  return typeof value === "string" && FULL_GIT_SHA.test(value);
}

function parseMaximumInstanceCount(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Pure production preflight. Issue identifiers name configuration fields only;
 * configuration values are deliberately never copied into the result.
 */
export function validateProductionConfiguration(
  env: NodeJS.ProcessEnv,
): ProductionConfigurationIssue[] {
  const issues: ProductionConfigurationIssue[] = [];

  if (!hasVerifiedTlsDatabaseUrl(env.DATABASE_URL)) {
    issues.push("DATABASE_URL");
  }
  if (!isLiveClerkPublishableKey(env.CLERK_PUBLISHABLE_KEY)) {
    issues.push("CLERK_PUBLISHABLE_KEY");
  }
  if (!isLiveClerkSecretKey(env.CLERK_SECRET_KEY)) {
    issues.push("CLERK_SECRET_KEY");
  }
  if (!isRevenueCatSecretKey(env.REVENUECAT_SECRET_API_KEY)) {
    issues.push("REVENUECAT_SECRET_API_KEY");
  }
  if (!isRevenueCatResourceId(env.REVENUECAT_PROJECT_ID, "proj")) {
    issues.push("REVENUECAT_PROJECT_ID");
  }
  if (!isRevenueCatResourceId(env.REVENUECAT_ENTITLEMENT_REST_ID, "entl")) {
    issues.push("REVENUECAT_ENTITLEMENT_REST_ID");
  }
  if (!isRevenueCatResourceId(env.REVENUECAT_APP_REST_ID, "app")) {
    issues.push("REVENUECAT_APP_REST_ID");
  }
  if (!isRevenueCatResourceId(env.REVENUECAT_OFFERING_REST_ID, "ofrng")) {
    issues.push("REVENUECAT_OFFERING_REST_ID");
  }
  if (!hasCanonicalHttpsAllowedOrigin(env)) {
    issues.push("HTTPS_ALLOWED_ORIGIN");
  }
  if (!hasMatchingPublicAppOrigin(env)) {
    issues.push("PUBLIC_APP_ORIGIN");
  }
  if (!hasRootProductionBasePath(env.BASE_PATH)) {
    issues.push("BASE_PATH");
  }
  if (!hasExactBuildSha(env.BUILD_SHA)) {
    issues.push("BUILD_SHA");
  }
  if (
    parseAccountDeletionRetryInterval(
      env.ACCOUNT_DELETION_RETRY_INTERVAL_MS,
    ) === null
  ) {
    issues.push("ACCOUNT_DELETION_RETRY_INTERVAL_MS");
  }
  if (
    parseBoundedInteger(env.API_RATE_LIMIT, {
      minimum: 1,
      maximum: API_RATE_LIMIT_MAXIMUM,
      defaultValue: 100,
    }) === null
  ) {
    issues.push("API_RATE_LIMIT");
  }
  if (
    parseBoundedInteger(env.CLERK_RATE_LIMIT, {
      minimum: 1,
      maximum: CLERK_RATE_LIMIT_MAXIMUM,
      defaultValue: 30,
    }) === null
  ) {
    issues.push("CLERK_RATE_LIMIT");
  }
  if (
    parseBoundedInteger(env.PG_POOL_MAX, {
      minimum: 1,
      maximum: PG_POOL_MAXIMUM,
      defaultValue: 5,
    }) === null
  ) {
    issues.push("PG_POOL_MAX");
  }

  const maximumInstances = parseMaximumInstanceCount(env.API_MAX_INSTANCES);
  if (maximumInstances === null) {
    issues.push("API_MAX_INSTANCES");
  } else if (maximumInstances > 1) {
    // Both current express-rate-limit instances use process-local MemoryStore.
    // No shared backend is integrated, so no env name can truthfully opt in.
    issues.push("SHARED_RATE_LIMIT_STORE");
  }

  return issues;
}

export class ProductionConfigurationError extends Error {
  readonly issues: readonly ProductionConfigurationIssue[];

  constructor(issues: readonly ProductionConfigurationIssue[]) {
    super(`Invalid production configuration: ${issues.join(", ")}`);
    this.name = "ProductionConfigurationError";
    this.issues = [...issues];
  }
}

/** Development and tests stay permissive; production always fails before bind. */
export function assertProductionConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.NODE_ENV !== "production") return;
  const issues = validateProductionConfiguration(env);
  if (issues.length > 0) throw new ProductionConfigurationError(issues);
}
