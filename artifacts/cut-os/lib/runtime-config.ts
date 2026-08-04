export type RuntimeConfig = {
  apiBaseUrl: string;
  clerkPublishableKey: string;
  clerkProxyUrl?: string;
  revenueCatIosApiKey?: string;
};

export type RuntimeConfigIssue =
  | "api_domain_missing"
  | "api_domain_invalid"
  | "clerk_publishable_key_missing"
  | "clerk_publishable_key_placeholder"
  | "clerk_publishable_key_invalid"
  | "clerk_proxy_url_missing"
  | "clerk_proxy_url_invalid"
  | "revenuecat_ios_api_key_invalid";

export type RuntimeConfigResult =
  | { ok: true; config: RuntimeConfig }
  | { ok: false; issues: RuntimeConfigIssue[] };

export type RuntimeLaunchDecision =
  | { surface: "configuration_error"; issues: RuntimeConfigIssue[] }
  | { surface: "asset_loading" }
  | { surface: "application"; config: RuntimeConfig };

type RuntimeEnvironment = {
  EXPO_PUBLIC_DOMAIN?: string;
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_CLERK_PROXY_URL?: string;
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?: string;
};

type ParsedClerkPublishableKey = {
  value: string;
  type: "test" | "live";
  frontendApi: string;
  placeholder: boolean;
  environmentMismatch: boolean;
};

const RUNTIME_CONFIG_ENVIRONMENT_BY_ISSUE: Record<RuntimeConfigIssue, string> =
  {
    api_domain_missing: "EXPO_PUBLIC_DOMAIN",
    api_domain_invalid: "EXPO_PUBLIC_DOMAIN",
    clerk_publishable_key_missing: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    clerk_publishable_key_placeholder: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    clerk_publishable_key_invalid: "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    clerk_proxy_url_missing: "EXPO_PUBLIC_CLERK_PROXY_URL",
    clerk_proxy_url_invalid: "EXPO_PUBLIC_CLERK_PROXY_URL",
    revenuecat_ios_api_key_invalid: "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  };

const PLACEHOLDER_CLERK_FRONTEND_APIS = new Set([
  "example.accounts.dev",
  "example.clerk.accounts.dev",
  "clerk.example.com",
]);

function isClerkDevelopmentFrontendApi(frontendApi: string): boolean {
  return frontendApi.endsWith(".accounts.dev");
}

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

function isValidDnsHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || hostname.includes(":")) {
    return false;
  }
  const labels = hostname.toLowerCase().split(".");
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
  );
}

function isPublicDnsHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return Boolean(
    isValidDnsHostname(normalized) &&
    normalized.includes(".") &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized) &&
    !NON_PUBLIC_DNS_SUFFIXES.some((suffix) => normalized.endsWith(suffix)),
  );
}

function parseApiDomain(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  // This variable is intentionally hostname-only. Rejecting URL syntax keeps
  // API requests from being redirected through credentials, paths, or query
  // strings that were accidentally pasted into the build environment.
  if (
    candidate.includes("://") ||
    candidate.includes("/") ||
    candidate.includes("?") ||
    candidate.includes("#") ||
    candidate.includes("@")
  ) {
    return null;
  }

  try {
    const parsed = new URL(`https://${candidate}`);
    if (
      !parsed.hostname ||
      parsed.port ||
      candidate.endsWith(".") ||
      !isValidDnsHostname(parsed.hostname) ||
      parsed.host !== candidate.toLowerCase()
    ) {
      return null;
    }
    return parsed.host;
  } catch {
    return null;
  }
}

function decodeUnpaddedBase64(value: string): string | null {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  if (!value || value.length % 4 === 1 || !/^[A-Za-z0-9+/]+$/.test(value)) {
    return null;
  }

  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const character of value) {
    buffer = (buffer << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }

  if (bits > 0 && buffer !== 0) return null;
  return output;
}

function parseClerkPublishableKey(
  value: string | undefined,
): ParsedClerkPublishableKey | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  const parts = candidate.split("_");
  if (
    parts.length !== 3 ||
    parts[0] !== "pk" ||
    (parts[1] !== "test" && parts[1] !== "live")
  ) {
    return null;
  }

  // Match Clerk's publishable-key contract so a build cannot pass preflight
  // and then fail while ClerkProvider initializes.
  const decoded = decodeUnpaddedBase64(parts[2] ?? "");
  if (!decoded?.endsWith("$")) return null;
  const frontendApi = decoded.slice(0, -1).toLowerCase();
  if (frontendApi.includes("$") || !isPublicDnsHostname(frontendApi)) {
    return null;
  }

  return {
    value: candidate,
    type: parts[1],
    frontendApi,
    placeholder: PLACEHOLDER_CLERK_FRONTEND_APIS.has(frontendApi),
    environmentMismatch:
      parts[1] === "live" && isClerkDevelopmentFrontendApi(frontendApi),
  };
}

function parseClerkProxyUrl(
  value: string | undefined,
  apiDomain: string | null,
): string | null | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !apiDomain ||
      parsed.origin !== `https://${apiDomain}` ||
      parsed.pathname.replace(/\/+$/, "") !== "/api/__clerk"
    ) {
      return null;
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * RevenueCat iOS SDK keys are public application identifiers. Production keys
 * use `appl_`; RevenueCat Test Store keys use `test_`. Rejecting whitespace,
 * punctuation, and secret-key prefixes prevents a malformed or privileged key
 * from being embedded in the native bundle.
 */
export function parseRevenueCatIosApiKey(
  value: string | undefined,
): string | null | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  if (!/^(?:appl|test)_[A-Za-z0-9]{8,}$/.test(candidate)) return null;
  return candidate;
}

export function resolveRuntimeConfig(
  environment: RuntimeEnvironment,
): RuntimeConfigResult {
  const issues: RuntimeConfigIssue[] = [];
  const apiDomain = parseApiDomain(environment.EXPO_PUBLIC_DOMAIN);
  const parsedPublishableKey = parseClerkPublishableKey(
    environment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  const publishableKey =
    parsedPublishableKey &&
    !parsedPublishableKey.placeholder &&
    !parsedPublishableKey.environmentMismatch
      ? parsedPublishableKey.value
      : null;
  const proxyUrl = parseClerkProxyUrl(
    environment.EXPO_PUBLIC_CLERK_PROXY_URL,
    apiDomain,
  );
  const revenueCatIosApiKey = parseRevenueCatIosApiKey(
    environment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  );

  if (!environment.EXPO_PUBLIC_DOMAIN?.trim()) {
    issues.push("api_domain_missing");
  } else if (!apiDomain) {
    issues.push("api_domain_invalid");
  } else if (
    parsedPublishableKey?.type === "live" &&
    !parsedPublishableKey.placeholder &&
    !isPublicDnsHostname(apiDomain)
  ) {
    issues.push("api_domain_invalid");
  }

  if (!environment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    issues.push("clerk_publishable_key_missing");
  } else if (!parsedPublishableKey) {
    issues.push("clerk_publishable_key_invalid");
  } else if (parsedPublishableKey.placeholder) {
    issues.push("clerk_publishable_key_placeholder");
  } else if (parsedPublishableKey.environmentMismatch) {
    issues.push("clerk_publishable_key_invalid");
  }

  if (
    parsedPublishableKey?.type === "live" &&
    !parsedPublishableKey.placeholder &&
    !parsedPublishableKey.environmentMismatch &&
    !environment.EXPO_PUBLIC_CLERK_PROXY_URL?.trim()
  ) {
    issues.push("clerk_proxy_url_missing");
  } else if (proxyUrl === null) {
    issues.push("clerk_proxy_url_invalid");
  }

  if (revenueCatIosApiKey === null) {
    issues.push("revenuecat_ios_api_key_invalid");
  }

  if (issues.length || !apiDomain || !publishableKey) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    config: {
      apiBaseUrl: `https://${apiDomain}`,
      clerkPublishableKey: publishableKey,
      clerkProxyUrl: proxyUrl ?? undefined,
      ...(revenueCatIosApiKey ? { revenueCatIosApiKey } : {}),
    },
  };
}

/** Returns only public environment-variable names for local setup guidance. */
export function runtimeConfigEnvironmentNames(
  issues: readonly RuntimeConfigIssue[],
): string[] {
  return [
    ...new Set(
      issues.map((issue) => RUNTIME_CONFIG_ENVIRONMENT_BY_ISSUE[issue]),
    ),
  ];
}

/** Invalid configuration always wins over optional launch-asset loading. */
export function resolveRuntimeLaunchDecision(
  result: RuntimeConfigResult,
  assets: { loaded: boolean; failed: boolean },
): RuntimeLaunchDecision {
  if (!result.ok) {
    return { surface: "configuration_error", issues: result.issues };
  }
  if (!assets.loaded && !assets.failed) return { surface: "asset_loading" };
  return { surface: "application", config: result.config };
}
