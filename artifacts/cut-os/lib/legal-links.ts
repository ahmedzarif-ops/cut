export const LEGAL_LINK_IDS = ["privacyPolicy", "terms", "support"] as const;

export type LegalLinkId = (typeof LEGAL_LINK_IDS)[number];

export type LegalLinkEnvironmentName =
  | "EXPO_PUBLIC_PRIVACY_POLICY_URL"
  | "EXPO_PUBLIC_TERMS_URL"
  | "EXPO_PUBLIC_SUPPORT_URL";

export interface LegalLinkDefinition {
  id: LegalLinkId;
  label: string;
  environmentName: LegalLinkEnvironmentName;
}

export interface LegalLink extends LegalLinkDefinition {
  url: string;
}

export interface LegalLinkEnvironment {
  privacyPolicy?: string;
  terms?: string;
  support?: string;
}

export interface LegalLinkConfiguration {
  links: readonly LegalLink[];
  unavailable: readonly {
    id: LegalLinkId;
    environmentName: LegalLinkEnvironmentName;
    reason: "missing" | "invalid";
  }[];
}

export const LEGAL_LINK_DEFINITIONS: readonly LegalLinkDefinition[] = [
  {
    id: "privacyPolicy",
    label: "Privacy Policy",
    environmentName: "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  },
  {
    id: "terms",
    label: "Terms of Use",
    environmentName: "EXPO_PUBLIC_TERMS_URL",
  },
  {
    id: "support",
    label: "Support",
    environmentName: "EXPO_PUBLIC_SUPPORT_URL",
  },
];

type ParsedPublicUrl =
  { status: "valid"; url: string } | { status: "missing" | "invalid" };

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

function isPublicHostname(hostname: string): boolean {
  if (hostname.endsWith(".")) return false;
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !isValidDnsHostname(normalized) ||
    NON_PUBLIC_DNS_SUFFIXES.some(
      (suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix),
    ) ||
    !normalized.includes(".") ||
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)
  ) {
    return false;
  }
  return true;
}

/**
 * Public legal and support destinations must be absolute HTTPS URLs without
 * embedded credentials. Invalid or absent build configuration is never opened.
 */
export function parsePublicHttpsUrl(
  value: string | undefined,
): ParsedPublicUrl {
  const candidate = value?.trim();
  if (!candidate) return { status: "missing" };

  try {
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname === "" ||
      !isPublicHostname(parsed.hostname) ||
      parsed.username !== "" ||
      parsed.password !== ""
    ) {
      return { status: "invalid" };
    }
    return { status: "valid", url: parsed.toString() };
  } catch {
    return { status: "invalid" };
  }
}

export function resolveLegalLinkConfiguration(
  environment: LegalLinkEnvironment,
): LegalLinkConfiguration {
  const links: LegalLink[] = [];
  const unavailable: LegalLinkConfiguration["unavailable"][number][] = [];

  for (const definition of LEGAL_LINK_DEFINITIONS) {
    const parsed = parsePublicHttpsUrl(environment[definition.id]);
    if (parsed.status === "valid") {
      links.push({ ...definition, url: parsed.url });
    } else {
      unavailable.push({
        id: definition.id,
        environmentName: definition.environmentName,
        reason: parsed.status,
      });
    }
  }

  return { links, unavailable };
}

export function selectLegalLinks(
  configuration: LegalLinkConfiguration,
  includedIds: readonly LegalLinkId[] = LEGAL_LINK_IDS,
): readonly LegalLink[] {
  const included = new Set<LegalLinkId>(includedIds);
  return configuration.links.filter((link) => included.has(link.id));
}

export type ExternalBrowserOpener = (url: string) => Promise<unknown>;

/** Returns false instead of allowing a browser failure to become unhandled. */
export async function openLegalLinkSafely(
  link: LegalLink,
  openBrowser: ExternalBrowserOpener,
): Promise<boolean> {
  try {
    await openBrowser(link.url);
    return true;
  } catch {
    return false;
  }
}
