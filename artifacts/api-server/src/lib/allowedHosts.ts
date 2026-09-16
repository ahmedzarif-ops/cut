/**
 * Shared client-facing host/origin allowlist — the single source of truth
 * for which public hostnames this deployment answers as.
 *
 * Both the CORS allowlist (app.ts) and Clerk host resolution
 * (getClerkProxyHost → publishableKeyFromHost / Clerk-Proxy-Url) build from
 * the same source.
 *
 * Production accepts exactly one explicit, canonical HTTPS origin from
 * CORS_ALLOWED_ORIGINS. Provider-injected REPLIT_* domains never expand the
 * production trust boundary. Development retains the existing convenience
 * behavior: Replit's development domains plus comma-separated origins or bare
 * domains from CORS_ALLOWED_ORIGINS.
 *
 * Plaintext http:// entries are rejected in BOTH shapes — credentialed
 * browser traffic and Clerk handshakes must only happen over TLS.
 */

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

interface ProductionCanonicalOrigin {
  readonly origin: string;
  readonly hostname: string;
}

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
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(label),
    ) &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(normalized) &&
    !NON_PUBLIC_DNS_SUFFIXES.some((suffix) => normalized.endsWith(suffix)),
  );
}

/**
 * Parse the sole production browser/Clerk ingress. Canonical means the env
 * value is already exactly `https://<public-host>`: no normalization, list,
 * credentials, port, path, query, fragment, or surrounding whitespace.
 */
export function parseProductionCanonicalOrigin(
  value: string | undefined,
): ProductionCanonicalOrigin | undefined {
  if (!value || value !== value.trim() || value.includes(",")) return undefined;

  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.origin !== value ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      !isValidPublicHostname(parsed.hostname)
    ) {
      return undefined;
    }
    return { origin: parsed.origin, hostname: parsed.hostname };
  } catch {
    return undefined;
  }
}

function sourceValues(env: NodeJS.ProcessEnv): string[] {
  if (env.NODE_ENV === "production") {
    const canonical = parseProductionCanonicalOrigin(env.CORS_ALLOWED_ORIGINS);
    return canonical ? [canonical.origin] : [];
  }

  return [
    env.REPLIT_DEV_DOMAIN,
    env.REPLIT_EXPO_DEV_DOMAIN,
    ...(env.CORS_ALLOWED_ORIGINS?.split(",") ?? []),
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => !value.startsWith("http://"));
}

/**
 * CORS shape: full `https://…` origins. Bare domains are normalized to
 * https; plaintext http:// entries were already dropped at the source.
 */
export function buildAllowedOrigins(
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  return new Set(
    sourceValues(env).map((value) =>
      value.startsWith("https://") ? value : `https://${value}`,
    ),
  );
}

/**
 * Clerk shape: bare lowercase hostnames (no scheme, path, or port) — what
 * getClerkProxyHost compares request host headers against.
 */
export function buildAllowedHosts(
  env: NodeJS.ProcessEnv = process.env,
): Set<string> {
  return new Set(
    sourceValues(env)
      // Scheme is stripped here (not in normalizeHost) because normalizeHost
      // is shared with raw request-header input, which never carries a scheme.
      .map((value) => normalizeHost(value.replace(/^https:\/\//, "")))
      .filter((value): value is string => Boolean(value)),
  );
}

/**
 * Reduce a host candidate (env entry or request header value) to a bare
 * lowercase hostname: strip any path and any `:port` suffix. Returns
 * undefined for empty input.
 */
export function normalizeHost(value: string | undefined): string | undefined {
  const hostname = value
    ?.trim()
    .toLowerCase()
    .split("/")[0]
    ?.replace(/:\d+$/, "");
  return hostname || undefined;
}
