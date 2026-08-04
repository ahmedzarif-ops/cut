import { isIP } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_PUBLIC_URLS = [
  "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  "EXPO_PUBLIC_TERMS_URL",
  "EXPO_PUBLIC_SUPPORT_URL",
];

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

const NON_PRODUCTION_BUILD_PROFILES = new Set([
  "development",
  "preview",
  "ios-simulator",
]);

export function isProductionBuildProfile(profile) {
  return !NON_PRODUCTION_BUILD_PROFILES.has(profile);
}

function isValidDnsHostname(hostname) {
  if (!hostname || hostname.length > 253 || hostname.includes(":")) {
    return false;
  }

  return hostname
    .toLowerCase()
    .split(".")
    .every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    );
}

function requiredValue(environment, name, errors) {
  const value = environment[name]?.trim();
  if (!value) {
    errors.push(`${name} is required`);
    return null;
  }
  return value;
}

function parseHostnameOnly(value) {
  if (
    value.includes("://") ||
    value.includes("/") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("@")
  ) {
    return null;
  }

  try {
    const parsed = new URL(`https://${value}`);
    if (
      !parsed.hostname ||
      parsed.port ||
      value.endsWith(".") ||
      !isValidDnsHostname(parsed.hostname) ||
      parsed.host !== value.toLowerCase()
    ) {
      return null;
    }
    return parsed.hostname;
  } catch {
    return null;
  }
}

function isPrivateOrLocalHostname(hostname) {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    );
  }
  if (ipVersion !== 4) return false;

  const octets = normalized.split(".").map(Number);
  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function isPublicHostname(hostname) {
  if (hostname.endsWith(".")) return false;
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!isValidDnsHostname(normalized)) return false;
  if (isPrivateOrLocalHostname(normalized)) return false;
  if (isIP(normalized) !== 0) return false;
  if (!normalized.includes(".")) return false;
  return !NON_PUBLIC_DNS_SUFFIXES.some(
    (suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix),
  );
}

function decodeUnpaddedBase64(value) {
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

function parseClerkPublishableKey(value) {
  const parts = value.split("_");
  if (
    parts.length !== 3 ||
    parts[0] !== "pk" ||
    (parts[1] !== "test" && parts[1] !== "live")
  ) {
    return null;
  }

  const decoded = decodeUnpaddedBase64(parts[2] ?? "");
  if (!decoded?.endsWith("$")) return null;
  const frontendApi = decoded.slice(0, -1);
  if (frontendApi.includes("$") || !frontendApi.includes(".")) return null;
  return { type: parts[1] };
}

function parseRevenueCatIosApiKey(value) {
  const candidate = value.trim();
  if (!/^(?:appl|test)_[A-Za-z0-9]{8,}$/.test(candidate)) return null;
  return { type: candidate.startsWith("appl_") ? "production" : "test" };
}

function isSafeHttpsUrl(value, { allowQueryAndFragment }) {
  try {
    const parsed = new URL(value);
    return Boolean(
      parsed.protocol === "https:" &&
      parsed.hostname &&
      !parsed.username &&
      !parsed.password &&
      (allowQueryAndFragment || (!parsed.search && !parsed.hash)),
    );
  } catch {
    return false;
  }
}

export function validateReleaseEnvironment(environment) {
  const profile = environment.EAS_BUILD_PROFILE?.trim() || "production";
  const production = isProductionBuildProfile(profile);
  const errors = [];
  let apiHostname = null;

  const domain = requiredValue(environment, "EXPO_PUBLIC_DOMAIN", errors);
  if (domain) {
    const hostname = parseHostnameOnly(domain);
    if (!hostname) {
      errors.push("EXPO_PUBLIC_DOMAIN must contain only a valid hostname");
    } else if (production && !isPublicHostname(hostname)) {
      errors.push(
        "EXPO_PUBLIC_DOMAIN must be publicly reachable for production",
      );
    } else {
      apiHostname = hostname;
    }
  }

  const clerkKey = requiredValue(
    environment,
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    errors,
  );
  const parsedClerkKey = clerkKey ? parseClerkPublishableKey(clerkKey) : null;
  if (clerkKey && !parsedClerkKey) {
    errors.push(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key",
    );
  } else if (production && clerkKey && parsedClerkKey?.type !== "live") {
    errors.push(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a live key for production",
    );
  }

  const requiresProxy = production || parsedClerkKey?.type === "live";
  const proxyUrl = requiresProxy
    ? requiredValue(environment, "EXPO_PUBLIC_CLERK_PROXY_URL", errors)
    : environment.EXPO_PUBLIC_CLERK_PROXY_URL?.trim();
  if (proxyUrl) {
    let canonicalProxy = false;
    if (isSafeHttpsUrl(proxyUrl, { allowQueryAndFragment: false })) {
      const parsedProxy = new URL(proxyUrl);
      canonicalProxy = Boolean(
        apiHostname &&
        parsedProxy.origin === `https://${apiHostname}` &&
        parsedProxy.pathname.replace(/\/+$/, "") === "/api/__clerk",
      );
    }
    if (!canonicalProxy) {
      errors.push(
        "EXPO_PUBLIC_CLERK_PROXY_URL must use the API HTTPS origin and /api/__clerk path",
      );
    }
  }

  const revenueCatKey = production
    ? requiredValue(environment, "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY", errors)
    : environment.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  const parsedRevenueCatKey = revenueCatKey
    ? parseRevenueCatIosApiKey(revenueCatKey)
    : null;
  if (revenueCatKey && !parsedRevenueCatKey) {
    errors.push(
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY must be a RevenueCat public iOS SDK key",
    );
  } else if (
    production &&
    revenueCatKey &&
    parsedRevenueCatKey?.type !== "production"
  ) {
    errors.push(
      "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY must be an appl_ key for production",
    );
  }

  if (production) {
    for (const name of REQUIRED_PUBLIC_URLS) {
      const value = requiredValue(environment, name, errors);
      if (value) {
        const safeHttps = isSafeHttpsUrl(value, {
          allowQueryAndFragment: true,
        });
        const publicHostname = safeHttps
          ? isPublicHostname(new URL(value).hostname)
          : false;
        if (!safeHttps || !publicHostname) {
          errors.push(`${name} must be a public HTTPS URL without credentials`);
        }
      }
    }
  }

  return { profile, errors };
}

function run() {
  const result = validateReleaseEnvironment(process.env);
  if (result.errors.length) {
    console.error(
      `Release configuration failed for the ${result.profile} build profile:`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Release configuration is valid for the ${result.profile} build profile.`,
  );
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) run();
