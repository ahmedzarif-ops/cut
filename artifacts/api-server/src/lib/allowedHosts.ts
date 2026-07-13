/**
 * Shared client-facing host/origin allowlist — the single source of truth
 * for which public hostnames this deployment answers as.
 *
 * Both the CORS allowlist (app.ts) and Clerk host resolution
 * (getClerkProxyHost → publishableKeyFromHost / Clerk-Proxy-Url) build from
 * the same env vars, so adding a custom domain is a one-place change:
 *
 *   - REPLIT_DEV_DOMAIN / REPLIT_EXPO_DEV_DOMAIN (injected by Replit)
 *   - CORS_ALLOWED_ORIGINS (comma-separated origins or bare domains)
 *
 * Plaintext http:// entries are rejected in BOTH shapes — credentialed
 * browser traffic and Clerk handshakes must only happen over TLS.
 */

function sourceValues(env: NodeJS.ProcessEnv): string[] {
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
