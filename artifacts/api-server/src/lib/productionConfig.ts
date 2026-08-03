import { isPublishableKey, parsePublishableKey } from "@clerk/shared/keys";
import { buildAllowedOrigins } from "./allowedHosts";

export type ProductionConfigurationIssue =
  | "DATABASE_URL"
  | "CLERK_PUBLISHABLE_KEY"
  | "CLERK_SECRET_KEY"
  | "REVENUECAT_SECRET_API_KEY"
  | "REVENUECAT_PROJECT_ID"
  | "REVENUECAT_ENTITLEMENT_REST_ID"
  | "HTTPS_ALLOWED_ORIGIN";

const NON_PUBLIC_DNS_SUFFIXES = [
  ".example",
  ".home",
  ".home.arpa",
  ".internal",
  ".invalid",
  ".lan",
  ".local",
  ".localhost",
  ".onion",
  ".test",
];

function isValidPublicHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const labels = normalized.split(".");
  return Boolean(
    normalized.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    ) &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized) &&
    !NON_PUBLIC_DNS_SUFFIXES.some((suffix) => normalized.endsWith(suffix)),
  );
}

function hasVerifiedTlsDatabaseUrl(value: string | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate || candidate !== value || /\s/.test(candidate)) return false;

  try {
    const parsed = new URL(candidate);
    const sslModes = parsed.searchParams.getAll("sslmode");
    return Boolean(
      (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") &&
      parsed.hostname &&
      !parsed.hash &&
      sslModes.length === 1 &&
      sslModes[0] === "verify-full" &&
      !parsed.searchParams.has("ssl"),
    );
  } catch {
    return false;
  }
}

function isLiveClerkPublishableKey(value: string | undefined): boolean {
  const candidate = value?.trim();
  if (!candidate || candidate !== value || !candidate.startsWith("pk_live_")) {
    return false;
  }
  return (
    isPublishableKey(candidate) &&
    parsePublishableKey(candidate)?.instanceType === "production"
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
  prefix: "proj" | "entl",
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

function hasUsableHttpsAllowedOrigin(env: NodeJS.ProcessEnv): boolean {
  return [...buildAllowedOrigins(env)].some((candidate) => {
    try {
      const parsed = new URL(candidate);
      return Boolean(
        parsed.protocol === "https:" &&
        parsed.origin === candidate &&
        !parsed.username &&
        !parsed.password &&
        parsed.pathname === "/" &&
        !parsed.search &&
        !parsed.hash &&
        isValidPublicHostname(parsed.hostname),
      );
    } catch {
      return false;
    }
  });
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
  if (!hasUsableHttpsAllowedOrigin(env)) {
    issues.push("HTTPS_ALLOWED_ORIGIN");
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
