import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIRECTORY = dirname(fileURLToPath(import.meta.url));
const APP_STORE_RELEASE_RECORD_PATH = resolve(
  DIRECTORY,
  "../../../app-store/app-store-submission.json",
);

const PUBLIC_LISTING_URL_BINDINGS = Object.freeze([
  Object.freeze({
    environmentName: "EXPO_PUBLIC_PRIVACY_POLICY_URL",
    listingField: "privacyPolicyUrl",
  }),
  Object.freeze({
    environmentName: "EXPO_PUBLIC_TERMS_URL",
    listingField: "termsUrl",
  }),
  Object.freeze({
    environmentName: "EXPO_PUBLIC_SUPPORT_URL",
    listingField: "supportUrl",
  }),
]);

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

const PLACEHOLDER_CLERK_FRONTEND_APIS = new Set([
  "example.accounts.dev",
  "example.clerk.accounts.dev",
  "clerk.example.com",
]);

function isClerkDevelopmentFrontendApi(frontendApi) {
  return frontendApi.endsWith(".accounts.dev");
}

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
  const frontendApi = decoded.slice(0, -1).toLowerCase();
  if (frontendApi.includes("$") || !isPublicHostname(frontendApi)) return null;
  return {
    type: parts[1],
    placeholder: PLACEHOLDER_CLERK_FRONTEND_APIS.has(frontendApi),
    environmentMismatch:
      parts[1] === "live" && isClerkDevelopmentFrontendApi(frontendApi),
  };
}

function parseRevenueCatIosApiKey(value) {
  const candidate = value.trim();
  if (!/^(?:appl|test)_[A-Za-z0-9]{8,}$/.test(candidate)) return null;
  return { type: candidate.startsWith("appl_") ? "production" : "test" };
}

function parseAppStoreProductIdentifier(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
  ) {
    return null;
  }
  return value;
}

function readAppStoreReleaseRecord() {
  try {
    const parsed = JSON.parse(
      readFileSync(APP_STORE_RELEASE_RECORD_PATH, "utf8"),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isLiteralUrlValue(value) {
  return Boolean(
    typeof value === "string" &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(value),
  );
}

function isSafeHttpsUrl(value, { allowQueryAndFragment }) {
  if (!isLiteralUrlValue(value)) return false;
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
  } else if (clerkKey && parsedClerkKey?.placeholder) {
    errors.push(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must not use a placeholder Clerk instance",
    );
  } else if (clerkKey && parsedClerkKey?.environmentMismatch) {
    errors.push(
      "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must match its Clerk environment",
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

  const rawProductIdentifier = environment.EXPO_PUBLIC_REVENUECAT_PRODUCT_ID;
  const productIdentifierRequired = production || Boolean(revenueCatKey);
  const productIdentifier = productIdentifierRequired
    ? requiredValue(environment, "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID", errors)
    : rawProductIdentifier?.trim();
  const parsedProductIdentifier = productIdentifier
    ? parseAppStoreProductIdentifier(rawProductIdentifier)
    : null;
  if (productIdentifier && !parsedProductIdentifier) {
    errors.push(
      "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID must be an App Store product identifier",
    );
  }

  if (production) {
    const appStoreReleaseRecord = readAppStoreReleaseRecord();
    if (!appStoreReleaseRecord) {
      errors.push("App Store release record must be readable");
    } else {
      const subscriptionReleaseRecord = appStoreReleaseRecord.subscription;
      if (
        !subscriptionReleaseRecord ||
        typeof subscriptionReleaseRecord !== "object" ||
        Array.isArray(subscriptionReleaseRecord)
      ) {
        errors.push("App Store subscription release record must be readable");
      }
      if (
        !parsedProductIdentifier ||
        subscriptionReleaseRecord?.productId !== parsedProductIdentifier
      ) {
        errors.push(
          "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID must match the App Store subscription release record",
        );
      }
      if (subscriptionReleaseRecord?.introductoryOfferDecision !== "none") {
        errors.push(
          "App Store subscription release record must disable introductory offers",
        );
      }

      const listingReleaseRecord = appStoreReleaseRecord.listing;
      if (
        !listingReleaseRecord ||
        typeof listingReleaseRecord !== "object" ||
        Array.isArray(listingReleaseRecord)
      ) {
        errors.push("App Store listing release record must be readable");
      }
      for (const {
        environmentName,
        listingField,
      } of PUBLIC_LISTING_URL_BINDINGS) {
        const rawValue = environment[environmentName];
        const value = requiredValue(environment, environmentName, errors);
        if (!value) continue;
        if (!isLiteralUrlValue(rawValue)) {
          errors.push(
            `${environmentName} must not contain surrounding whitespace or control characters`,
          );
        }
        const safeHttps = isSafeHttpsUrl(value, {
          allowQueryAndFragment: true,
        });
        const publicHostname = safeHttps
          ? isPublicHostname(new URL(value).hostname)
          : false;
        if (!safeHttps || !publicHostname) {
          errors.push(
            `${environmentName} must be a public HTTPS URL without credentials`,
          );
        }
        if (listingReleaseRecord?.[listingField] !== value) {
          errors.push(
            `${environmentName} must match the App Store listing release record`,
          );
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
