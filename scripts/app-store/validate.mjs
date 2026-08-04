import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");

export const ACCEPTED_SCREENSHOT_DIMENSIONS = Object.freeze([
  Object.freeze({ width: 1260, height: 2736 }),
  Object.freeze({ width: 1290, height: 2796 }),
  Object.freeze({ width: 1320, height: 2868 }),
]);

export const EXPECTED_SHOT_IDS = Object.freeze([
  "01-today-next-action",
  "02-today-weigh-in-complete",
  "03-balanced-options",
  "04-meal-preview",
  "05-today-nutrition-logged",
  "06-logged-meal-controls",
  "07-subscription-offer",
  "08-adult-eligibility",
  "09-settings-controls",
  "10-sign-up-18plus",
]);

const EXPECTED_SHOT_RELEASE_EVIDENCE = Object.freeze({
  "01-today-next-action": true,
  "02-today-weigh-in-complete": true,
  "03-balanced-options": true,
  "04-meal-preview": true,
  "05-today-nutrition-logged": true,
  "06-logged-meal-controls": true,
  "07-subscription-offer": true,
  "08-adult-eligibility": true,
  "09-settings-controls": true,
  "10-sign-up-18plus": false,
});

const EXPECTED_AGE_ANSWERS = Object.freeze({
  health_or_wellness_topics: "yes",
  medical_or_treatment_information: "none",
  age_assurance: "yes",
  social_media: "no",
  user_generated_content: "no",
  messaging_or_chat: "no",
  advertising: "no",
  unrestricted_web_access: "no",
});

const EXPECTED_EXTERNAL_PRIVACY_GATES = Object.freeze([
  "production_archive_and_embedded_sdks",
  "ip_network_metadata_mapping",
  "diagnostics_and_usage_data",
  "public_policy_reconciliation",
  "app_store_connect_reconciliation",
]);

const EXPECTED_AGE_APPROVAL_KEYS = Object.freeze([
  "owner",
  "legal",
  "qualifiedHealthNutritionReviewer",
  "finalBinaryVerified",
  "appStoreConnectConfirmed",
]);

const EXPECTED_PRIVACY_APPROVAL_KEYS = Object.freeze([
  "owner",
  "legal",
  "productionArchiveVerified",
  "vendorsVerified",
  "publicPolicyVerified",
  "appStoreConnectConfirmed",
]);

const EXPECTED_AVAILABILITY_APPROVAL_KEYS = Object.freeze([
  "owner",
  "appStoreConnectConfirmed",
]);

const EXPECTED_MEDICAL_DEVICE_APPROVAL_KEYS = Object.freeze([
  "owner",
  "legalOrQualifiedRegulatoryReviewer",
  "finalBinaryVerified",
  "appStoreConnectConfirmed",
]);

const EXPECTED_AUTHENTICATION_SECURITY_APPROVAL_KEYS = Object.freeze([
  "owner",
  "securityReviewer",
  "clerkSupportVerified",
  "productionTenantEvidenceVerified",
]);

const EXPECTED_AUTHENTICATION_SECURITY_KEYS = Object.freeze([
  "status",
  "source",
  "risk",
  "selectedRecoveryArchitecture",
  "clerkSupportEvidenceReference",
  "implementationEvidenceReference",
  "productionTenantEvidence",
  "approval",
]);

const EXPECTED_AUTHENTICATION_SECURITY_EVIDENCE_KEYS = Object.freeze([
  "genericPublicResponse",
  "responseEnvelopeParity",
  "timingParity",
  "rateLimitEnumerationResistance",
  "providerFailureBehavior",
  "safeAbuseLogging",
]);

const SUPPORTED_RECOVERY_ARCHITECTURES = Object.freeze([
  "clerk_hosted_or_prebuilt_recovery",
  "clerk_supported_server_or_proxy_recovery",
]);

const AUTHENTICATION_SECURITY_SOURCE =
  "artifacts/cut-os/AUTH_SECURITY_PRELAUNCH.md";
const AUTHENTICATION_SECURITY_RISK =
  "password_reset_account_enumeration_timing";
const AUTHENTICATION_SECURITY_PENDING_STATUS =
  "pending_supported_recovery_architecture_and_production_evidence";
const AUTHENTICATION_SECURITY_APPROVED_STATUS = "approved_for_release";

const EXPECTED_MEDICAL_DEVICE_REGION_KEYS = Object.freeze([
  "US",
  "EU_EEA",
  "UK",
]);

const MEDICAL_DEVICE_REFERENCE =
  "https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status";

const TERRITORY_CATALOG_CODE_FORMAT =
  "uppercase_two_letter_app_storefront_url_translation";
const TERRITORY_CATALOG_WORKING_STATUS =
  "public_snapshot_pending_app_store_connect_api_reconciliation";
const TERRITORY_CATALOG_RELEASE_STATUS =
  "confirmed_current_from_app_store_connect_api";
const TERRITORY_CATALOG_PUBLIC_SOURCE =
  "https://apps.apple.com/us/iphone/today";
const TERRITORY_CATALOG_AVAILABILITY_REFERENCE =
  "https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/manage-availability-for-your-app-on-the-app-store";
const TERRITORY_CATALOG_API_REFERENCE =
  "https://developer.apple.com/documentation/appstoreconnectapi/get-v1-territories";
const EXPECTED_APP_STORE_STOREFRONT_COUNT = 175;

const EU_EEA_TERRITORY_CODES = Object.freeze([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

const REQUIRED_OWNER_FIELDS = Object.freeze([
  "listing.sellerLegalOperator",
  "listing.sku",
  "listing.copyright",
  "listing.contentRightsDeclaration",
  "listing.supportUrl",
  "listing.privacyPolicyUrl",
  "listing.termsUrl",
  "listing.initialTerritories",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function arraysEqual(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function dimensionsEqual(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every(
      (dimension, index) =>
        isObject(dimension) &&
        dimension.width === right[index].width &&
        dimension.height === right[index].height,
    )
  );
}

function hasExactKeys(value, expectedKeys) {
  return (
    isObject(value) &&
    arraysEqual(Object.keys(value).sort(), [...expectedKeys].sort())
  );
}

function validateApprovalRecord({
  approval,
  expectedKeys,
  label,
  release,
  check,
}) {
  check(
    hasExactKeys(approval, expectedKeys),
    `${label} must contain exactly the required approval keys`,
  );
  for (const key of expectedKeys) {
    check(
      typeof approval?.[key] === "boolean",
      `${label}.${key} must be a boolean`,
    );
    if (release) {
      check(approval?.[key] === true, `release mode requires ${label}.${key}`);
    }
  }
}

function medicalDeviceRegionGroups(territories) {
  const codes = new Set(Array.isArray(territories) ? territories : []);
  const groups = [];
  if (codes.has("US")) groups.push("US");
  if (codes.has("GB")) groups.push("UK");
  if (EU_EEA_TERRITORY_CODES.some((code) => codes.has(code))) {
    groups.push("EU_EEA");
  }
  return groups;
}

function validateTerritoryCatalog({ catalog, release, check }) {
  check(isObject(catalog), "territory catalog must be an object");
  if (!isObject(catalog)) return new Set();

  check(
    catalog.schemaVersion === 1,
    "territory catalog schemaVersion must be 1",
  );
  check(
    catalog.codeFormat === TERRITORY_CATALOG_CODE_FORMAT,
    "territory catalog must retain the documented two-letter storefront translation format",
  );
  check(
    [
      TERRITORY_CATALOG_WORKING_STATUS,
      TERRITORY_CATALOG_RELEASE_STATUS,
    ].includes(catalog.status),
    "territory catalog status must be pending reconciliation or API-confirmed",
  );
  check(
    catalog.snapshot?.publicStorefrontSource ===
      TERRITORY_CATALOG_PUBLIC_SOURCE &&
      catalog.snapshot?.availabilityReference ===
        TERRITORY_CATALOG_AVAILABILITY_REFERENCE &&
      catalog.snapshot?.territoriesApiReference ===
        TERRITORY_CATALOG_API_REFERENCE,
    "territory catalog must retain its official Apple source references",
  );
  check(
    validIsoTimestamp(catalog.snapshot?.capturedAtUtc),
    "territory catalog snapshot must include a UTC capture timestamp",
  );

  const codes = Array.isArray(catalog.storefrontCodes)
    ? catalog.storefrontCodes
    : [];
  check(codes.length > 0, "territory catalog must contain storefront codes");
  check(
    codes.every((code) => typeof code === "string" && /^[A-Z]{2}$/u.test(code)),
    "territory catalog storefront codes must be uppercase two-letter values",
  );
  check(
    new Set(codes).size === codes.length,
    "territory catalog storefront codes must be unique",
  );
  check(
    arraysEqual(codes, [...codes].sort()),
    "territory catalog storefront codes must remain sorted",
  );
  check(
    catalog.snapshot?.activeStorefrontCount ===
      EXPECTED_APP_STORE_STOREFRONT_COUNT &&
      codes.length === EXPECTED_APP_STORE_STOREFRONT_COUNT,
    "territory catalog must retain the reviewed 175-storefront snapshot",
  );
  check(
    codes.includes("GB") && !codes.includes("UK") && !codes.includes("ZZ"),
    "territory catalog must retain GB and reject the UK alias and ZZ sentinel",
  );

  const review = catalog.review;
  check(isObject(review), "territory catalog review must be an object");
  if (release) {
    check(
      catalog.status === TERRITORY_CATALOG_RELEASE_STATUS,
      "release mode requires the territory catalog reconciled with the App Store Connect Territories API",
    );
    check(
      review?.status === "confirmed_current",
      "release mode requires a current territory catalog review",
    );
    check(
      validIsoTimestamp(review?.reconciledAtUtc),
      "release mode requires a UTC territory-catalog reconciliation timestamp",
    );
    for (const field of ["reviewer", "evidenceReference"]) {
      check(
        typeof review?.[field] === "string" && review[field].trim().length > 0,
        `release mode requires territory catalog review.${field}`,
      );
    }
  } else if (isObject(review)) {
    check(
      ["pending", "confirmed_current"].includes(review.status),
      "territory catalog review status must be pending or confirmed_current",
    );
  }

  return new Set(codes);
}

function validateAuthenticationSecurity({ value, release, check }) {
  check(isObject(value), "submission.authenticationSecurity must be an object");
  if (!isObject(value)) return;

  check(
    hasExactKeys(value, EXPECTED_AUTHENTICATION_SECURITY_KEYS),
    "authenticationSecurity must contain exactly the required keys",
  );
  check(
    [
      AUTHENTICATION_SECURITY_PENDING_STATUS,
      AUTHENTICATION_SECURITY_APPROVED_STATUS,
    ].includes(value.status),
    "authenticationSecurity.status must be pending or approved_for_release",
  );
  check(
    value.source === AUTHENTICATION_SECURITY_SOURCE,
    "authenticationSecurity must retain the prelaunch security source",
  );
  check(
    value.risk === AUTHENTICATION_SECURITY_RISK,
    "authenticationSecurity must retain the password-reset timing risk",
  );

  const architectureSupported = SUPPORTED_RECOVERY_ARCHITECTURES.includes(
    value.selectedRecoveryArchitecture,
  );
  check(
    value.selectedRecoveryArchitecture === null || architectureSupported,
    "authenticationSecurity.selectedRecoveryArchitecture must be null or a Clerk-supported option",
  );
  for (const field of [
    "clerkSupportEvidenceReference",
    "implementationEvidenceReference",
  ]) {
    check(
      value[field] === null ||
        (typeof value[field] === "string" && value[field].trim().length > 0),
      `authenticationSecurity.${field} must be null or a non-empty evidence reference`,
    );
  }

  const productionEvidence = value.productionTenantEvidence;
  check(
    hasExactKeys(productionEvidence, [
      "clerkTenantAlias",
      "testedAtUtc",
      "checks",
    ]),
    "authenticationSecurity.productionTenantEvidence must contain exactly the required keys",
  );
  check(
    productionEvidence?.clerkTenantAlias === null ||
      (typeof productionEvidence?.clerkTenantAlias === "string" &&
        productionEvidence.clerkTenantAlias.trim().length > 0),
    "authenticationSecurity.productionTenantEvidence.clerkTenantAlias must be null or a non-empty non-secret alias",
  );
  check(
    productionEvidence?.testedAtUtc === null ||
      validIsoTimestamp(productionEvidence?.testedAtUtc),
    "authenticationSecurity.productionTenantEvidence.testedAtUtc must be null or a UTC ISO timestamp",
  );
  check(
    hasExactKeys(
      productionEvidence?.checks,
      EXPECTED_AUTHENTICATION_SECURITY_EVIDENCE_KEYS,
    ),
    "authenticationSecurity production evidence checks must contain exactly the required keys",
  );

  for (const evidenceKey of EXPECTED_AUTHENTICATION_SECURITY_EVIDENCE_KEYS) {
    const evidence = productionEvidence?.checks?.[evidenceKey];
    const label = `authenticationSecurity.productionTenantEvidence.checks.${evidenceKey}`;
    check(
      hasExactKeys(evidence, ["status", "evidenceReference"]),
      `${label} must contain exactly status and evidenceReference`,
    );
    check(
      ["pending", "verified"].includes(evidence?.status),
      `${label}.status must be pending or verified`,
    );
    check(
      evidence?.evidenceReference === null ||
        (typeof evidence?.evidenceReference === "string" &&
          evidence.evidenceReference.trim().length > 0),
      `${label}.evidenceReference must be null or non-empty`,
    );
    if (evidence?.status === "verified") {
      check(
        typeof evidence.evidenceReference === "string" &&
          evidence.evidenceReference.trim().length > 0,
        `${label} cannot be verified without evidence`,
      );
    }
  }

  const approvalRequired =
    release || value.status === AUTHENTICATION_SECURITY_APPROVED_STATUS;
  validateApprovalRecord({
    approval: value.approval,
    expectedKeys: EXPECTED_AUTHENTICATION_SECURITY_APPROVAL_KEYS,
    label: "authenticationSecurity.approval",
    release: approvalRequired,
    check,
  });

  if (approvalRequired) {
    const prefix = release ? "release mode" : "approved authenticationSecurity";
    check(
      value.status === AUTHENTICATION_SECURITY_APPROVED_STATUS,
      `${prefix} requires authenticationSecurity.status approved_for_release`,
    );
    check(
      architectureSupported,
      `${prefix} requires authenticationSecurity.selectedRecoveryArchitecture to select a Clerk-supported recovery architecture`,
    );
    for (const field of [
      "clerkSupportEvidenceReference",
      "implementationEvidenceReference",
    ]) {
      check(
        typeof value[field] === "string" && value[field].trim().length > 0,
        `${prefix} requires authenticationSecurity.${field}`,
      );
    }
    check(
      typeof productionEvidence?.clerkTenantAlias === "string" &&
        productionEvidence.clerkTenantAlias.trim().length > 0,
      `${prefix} requires authenticationSecurity.productionTenantEvidence.clerkTenantAlias`,
    );
    check(
      validIsoTimestamp(productionEvidence?.testedAtUtc),
      `${prefix} requires authenticationSecurity.productionTenantEvidence.testedAtUtc`,
    );
    for (const evidenceKey of EXPECTED_AUTHENTICATION_SECURITY_EVIDENCE_KEYS) {
      const evidence = productionEvidence?.checks?.[evidenceKey];
      check(
        evidence?.status === "verified" &&
          typeof evidence?.evidenceReference === "string" &&
          evidence.evidenceReference.trim().length > 0,
        `${prefix} requires authenticationSecurity.productionTenantEvidence.checks.${evidenceKey} verified production-tenant evidence`,
      );
    }
  }
}

function getPath(object, dottedPath) {
  return dottedPath
    .split(".")
    .reduce((value, key) => (isObject(value) ? value[key] : undefined), object);
}

function validHttpsUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.username === "" &&
      parsed.password === ""
    );
  } catch {
    return false;
  }
}

function validIsoTimestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listingFromMarkdown(markdown) {
  const subtitle = markdown.match(/^\*\*Subtitle draft:\*\*[ \t]*(.+)$/m)?.[1];
  const description = markdown.match(
    /^\*\*Description draft:\*\*[ \t]*\n([\s\S]*?)\n\*\*Keywords draft:\*\*/m,
  )?.[1];
  const keywords = markdown.match(/^\*\*Keywords draft:\*\*[ \t]*(.+)$/m)?.[1];
  return {
    subtitle: subtitle?.trim(),
    description: description?.trim(),
    keywords: keywords?.trim(),
  };
}

function manifestDataTypes(appConfig) {
  return appConfig?.expo?.ios?.privacyManifests?.NSPrivacyCollectedDataTypes;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChannels(colorType) {
  return { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
}

function validPngBitDepth(colorType, bitDepth) {
  const validDepths = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  return validDepths[colorType]?.includes(bitDepth) === true;
}

export function inspectPng(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error("invalid PNG signature or truncated IHDR");
  }

  const ihdrLength = buffer.readUInt32BE(8);
  const ihdrType = buffer.toString("ascii", 12, 16);
  if (ihdrType !== "IHDR" || ihdrLength !== 13) {
    throw new Error("PNG must begin with a 13-byte IHDR chunk");
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const compressionMethod = buffer[26];
  const filterMethod = buffer[27];
  const interlaceMethod = buffer[28];
  if (
    width === 0 ||
    height === 0 ||
    !validPngBitDepth(colorType, bitDepth) ||
    compressionMethod !== 0 ||
    filterMethod !== 0 ||
    ![0, 1].includes(interlaceMethod)
  ) {
    throw new Error("invalid PNG IHDR values");
  }

  let hasTransparencyChunk = false;
  let hasImageData = false;
  let hasEnd = false;
  const imageDataChunks = [];
  let offset = 8;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) {
      throw new Error("truncated PNG chunk");
    }
    const chunkLength = buffer.readUInt32BE(offset);
    const nextOffset = offset + 12 + chunkLength;
    if (nextOffset > buffer.length) {
      throw new Error("truncated PNG chunk");
    }
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength);
    const expectedCrc = buffer.readUInt32BE(offset + 8 + chunkLength);
    const actualCrc = crc32(
      buffer.subarray(offset + 4, offset + 8 + chunkLength),
    );
    if (actualCrc !== expectedCrc) {
      throw new Error(`invalid PNG ${chunkType} checksum`);
    }
    if (chunkType === "tRNS") hasTransparencyChunk = true;
    if (chunkType === "IDAT") {
      if (chunkLength > 0) hasImageData = true;
      imageDataChunks.push(chunkData);
    }
    if (chunkType === "IEND") {
      if (chunkLength !== 0 || nextOffset !== buffer.length) {
        throw new Error("invalid PNG IEND chunk");
      }
      hasEnd = true;
    }
    offset = nextOffset;
    if (chunkType === "IEND") break;
  }

  if (!hasImageData || !hasEnd) {
    throw new Error("missing PNG image data or IEND");
  }

  const channels = pngChannels(colorType);
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
  const expectedInflatedLength = (rowBytes + 1) * height;
  const maximumInflatedLength = Math.max(
    expectedInflatedLength,
    width * height * 8 + height * 8,
  );
  let inflated;
  try {
    inflated = inflateSync(Buffer.concat(imageDataChunks), {
      maxOutputLength: maximumInflatedLength,
    });
  } catch {
    throw new Error("invalid PNG compressed image data");
  }
  if (interlaceMethod === 0 && inflated.length !== expectedInflatedLength) {
    throw new Error("PNG image data does not match its dimensions");
  }

  return {
    format: "png",
    width,
    height,
    hasAlpha: colorType === 4 || colorType === 6 || hasTransparencyChunk,
  };
}

export function inspectImage(buffer, extension) {
  const normalized = extension.toLowerCase().replace(/^\./, "");
  if (normalized === "png") return inspectPng(buffer);
  throw new Error(`unsupported image extension: ${extension}`);
}

export function validateMetadata({
  submission,
  appConfig,
  metadataMarkdown,
  territoryCatalog,
  release = false,
}) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  check(submission?.schemaVersion === 1, "submission.schemaVersion must be 1");
  check(
    submission?.status === "working_not_approved" ||
      submission?.status === "approved_for_submission",
    "submission.status is invalid",
  );
  const listing = submission?.listing;
  check(isObject(listing), "submission.listing must be an object");
  if (!isObject(listing)) return errors;
  const allowedTerritoryCodes = validateTerritoryCatalog({
    catalog: territoryCatalog,
    release,
    check,
  });

  const expo = appConfig?.expo;
  check(listing.appName === expo?.name, "listing.appName must match app.json");
  check(
    listing.bundleId === expo?.ios?.bundleIdentifier,
    "listing.bundleId must match app.json",
  );
  check(
    listing.appVersion === expo?.version,
    "listing.appVersion must match app.json",
  );
  check(
    listing.initialRelease === true,
    "listing.initialRelease must be true for v1",
  );
  check(
    listing.primaryLanguage === "en-US",
    "listing.primaryLanguage must remain the approved safe v1 default en-US",
  );
  check(
    typeof listing.appName === "string" && [...listing.appName].length <= 30,
    "listing.appName must be 30 characters or fewer",
  );
  check(
    typeof listing.subtitle === "string" && [...listing.subtitle].length <= 30,
    "listing.subtitle must be 30 characters or fewer",
  );
  check(
    typeof listing.description === "string" &&
      [...listing.description].length <= 4000,
    "listing.description must be 4000 characters or fewer",
  );
  check(
    typeof listing.keywords === "string" &&
      Buffer.byteLength(listing.keywords, "utf8") <= 100,
    "listing.keywords must be 100 UTF-8 bytes or fewer",
  );

  if (typeof listing.keywords === "string") {
    const keywords = listing.keywords.split(",");
    check(
      keywords.length > 0 &&
        keywords.every(
          (keyword) => keyword === keyword.trim() && [...keyword].length > 2,
        ),
      "every comma-separated keyword must be trimmed and longer than 2 characters",
    );
    check(
      new Set(keywords.map((keyword) => keyword.toLowerCase())).size ===
        keywords.length,
      "listing.keywords must not contain duplicates",
    );
  }

  if (listing.promotionalText !== null) {
    check(
      typeof listing.promotionalText === "string" &&
        [...listing.promotionalText].length <= 170,
      "listing.promotionalText must be null or 170 characters or fewer",
    );
  }
  check(
    listing.secondaryCategory === null,
    "listing.secondaryCategory must remain null unless owner-approved metadata is added",
  );
  check(listing.madeForKids === false, "listing.madeForKids must be false");
  check(
    listing.marketingUrl === null || validHttpsUrl(listing.marketingUrl),
    "listing.marketingUrl must be null or a credential-free HTTPS URL",
  );
  check(
    listing.whatsNewPosition === "not_applicable_initial_release" &&
      listing.whatsNew === null,
    "What's New must remain not applicable for the initial v1 submission",
  );
  check(
    listing.releaseMethod === "manual",
    "listing.releaseMethod must remain manual until owner approval",
  );
  check(
    listing.primaryCategory === "Health & Fitness",
    "listing.primaryCategory must match the provisional Health & Fitness position",
  );

  const requiredListingPhrases = [
    /adults age 18 and older/i,
    /not medical advice/i,
    /auto-renewable Apple\s+subscription/i,
    /localized price and billing period/i,
    /restore purchases/i,
    /manage or cancel/i,
  ];
  for (const phrase of requiredListingPhrases) {
    check(
      phrase.test(listing.description ?? ""),
      `listing.description is missing required disclosure ${phrase}`,
    );
  }

  const prohibitedUnshippedClaims = [
    /adaptive coaching/i,
    /personalized (?:calorie|protein) targets?/i,
    /workout logging/i,
    /restaurant guidance/i,
    /photo recognition/i,
    /AI chat/i,
    /social community/i,
  ];
  for (const claim of prohibitedUnshippedClaims) {
    check(
      !claim.test(listing.description ?? ""),
      `listing.description advertises an unshipped feature matching ${claim}`,
    );
  }

  const documentedListing = listingFromMarkdown(metadataMarkdown ?? "");
  check(
    documentedListing.subtitle === listing.subtitle,
    "machine-readable subtitle must match APP_STORE_METADATA.md",
  );
  check(
    documentedListing.description === listing.description,
    "machine-readable description must match APP_STORE_METADATA.md",
  );
  check(
    documentedListing.keywords === listing.keywords,
    "machine-readable keywords must match APP_STORE_METADATA.md",
  );

  check(
    arraysEqual(submission.ownerControlledFields, REQUIRED_OWNER_FIELDS),
    "ownerControlledFields must enumerate every required owner-controlled value",
  );
  for (const field of [
    "listing.sellerLegalOperator",
    "listing.sku",
    "listing.copyright",
  ]) {
    const value = getPath(submission, field);
    check(
      value === null || (typeof value === "string" && value.trim().length > 0),
      `${field} must be null or a non-empty owner-supplied string`,
    );
  }
  check(
    listing.contentRightsDeclaration === null ||
      typeof listing.contentRightsDeclaration === "boolean",
    "listing.contentRightsDeclaration must be null or an owner-supplied boolean",
  );
  for (const field of [
    "listing.supportUrl",
    "listing.privacyPolicyUrl",
    "listing.termsUrl",
  ]) {
    const value = getPath(submission, field);
    check(
      value === null || validHttpsUrl(value),
      `${field} must be null or HTTPS`,
    );
  }
  const initialTerritories = listing.initialTerritories;
  check(
    initialTerritories === null ||
      (Array.isArray(initialTerritories) && initialTerritories.length > 0),
    "listing.initialTerritories must be null or a non-empty array",
  );
  if (Array.isArray(initialTerritories)) {
    check(
      initialTerritories.every(
        (territory) =>
          typeof territory === "string" && /^[A-Z]{2}$/u.test(territory),
      ),
      "listing.initialTerritories must use uppercase two-letter territory codes",
    );
    check(
      new Set(initialTerritories).size === initialTerritories.length,
      "listing.initialTerritories must not contain duplicates",
    );
    check(
      initialTerritories.every((territory) =>
        allowedTerritoryCodes.has(territory),
      ),
      "listing.initialTerritories must use current codes from app-store/app-store-connect-territories.json",
    );
  }
  const validatedInitialTerritories =
    Array.isArray(initialTerritories) &&
    initialTerritories.length > 0 &&
    initialTerritories.every((territory) =>
      allowedTerritoryCodes.has(territory),
    )
      ? initialTerritories
      : [];

  const availability = submission.availability;
  check(isObject(availability), "submission.availability must be an object");
  if (isObject(availability)) {
    check(
      [
        "pending_owner_and_app_store_connect",
        "confirmed_in_app_store_connect",
      ].includes(availability.status),
      "availability.status must remain pending or be confirmed in App Store Connect",
    );
    validateApprovalRecord({
      approval: availability.approval,
      expectedKeys: EXPECTED_AVAILABILITY_APPROVAL_KEYS,
      label: "availability.approval",
      release,
      check,
    });
  }
  if (release) {
    check(
      submission.status === "approved_for_submission",
      "release mode requires submission.status approved_for_submission",
    );
    for (const field of REQUIRED_OWNER_FIELDS) {
      const value = getPath(submission, field);
      check(value !== null && value !== "", `release mode requires ${field}`);
    }
    for (const field of [
      "listing.supportUrl",
      "listing.privacyPolicyUrl",
      "listing.termsUrl",
    ]) {
      check(
        validHttpsUrl(getPath(submission, field)),
        `${field} must be HTTPS`,
      );
    }
    check(
      typeof listing.contentRightsDeclaration === "boolean",
      "release mode requires a boolean content-rights declaration",
    );
    check(
      Array.isArray(initialTerritories) && initialTerritories.length > 0,
      "release mode requires at least one owner-approved initial territory",
    );
    check(
      availability?.status === "confirmed_in_app_store_connect",
      "release mode requires initial territories confirmed in App Store Connect",
    );
  }

  validateAuthenticationSecurity({
    value: submission.authenticationSecurity,
    release,
    check,
  });

  const regulatedMedicalDevice = submission.regulatedMedicalDevice;
  check(
    isObject(regulatedMedicalDevice),
    "submission.regulatedMedicalDevice must be an object",
  );
  if (isObject(regulatedMedicalDevice)) {
    check(
      regulatedMedicalDevice.appleReference === MEDICAL_DEVICE_REFERENCE,
      "regulated-medical-device declaration must retain the official Apple reference",
    );
    check(
      regulatedMedicalDevice.workingPosition ===
        "general_wellness_not_a_regulated_medical_device",
      "regulated-medical-device working position must remain general_wellness_not_a_regulated_medical_device",
    );
    check(
      typeof regulatedMedicalDevice.basis === "string" &&
        regulatedMedicalDevice.basis.length > 40,
      "regulated-medical-device declaration must include an evidence basis",
    );
    check(
      [
        "provisional_pending_territories_and_confirmation",
        "confirmed_in_app_store_connect",
      ].includes(regulatedMedicalDevice.status),
      "regulatedMedicalDevice.status must remain provisional or be confirmed in App Store Connect",
    );
    check(
      hasExactKeys(
        regulatedMedicalDevice.regionalDeclarations,
        EXPECTED_MEDICAL_DEVICE_REGION_KEYS,
      ),
      "regulatedMedicalDevice.regionalDeclarations must contain US, EU_EEA, and UK",
    );
    for (const region of EXPECTED_MEDICAL_DEVICE_REGION_KEYS) {
      const declaration = regulatedMedicalDevice.regionalDeclarations?.[region];
      check(
        declaration?.workingAnswer === "not_regulated_medical_device",
        `${region} regulated-medical-device working answer must remain not_regulated_medical_device`,
      );
      check(
        [
          "provisional_pending_confirmation",
          "confirmed_in_app_store_connect",
        ].includes(declaration?.status),
        `${region} regulated-medical-device status must remain provisional or be confirmed in App Store Connect`,
      );
    }

    const requiredMedicalDeviceRegions =
      ["Health & Fitness", "Medical"].includes(listing.primaryCategory) ||
      ["Health & Fitness", "Medical"].includes(listing.secondaryCategory)
        ? medicalDeviceRegionGroups(validatedInitialTerritories)
        : [];
    const requiresMedicalDeviceConfirmation =
      release && requiredMedicalDeviceRegions.length > 0;
    validateApprovalRecord({
      approval: regulatedMedicalDevice.approval,
      expectedKeys: EXPECTED_MEDICAL_DEVICE_APPROVAL_KEYS,
      label: "regulatedMedicalDevice.approval",
      release: requiresMedicalDeviceConfirmation,
      check,
    });
    if (requiresMedicalDeviceConfirmation) {
      check(
        regulatedMedicalDevice.status === "confirmed_in_app_store_connect",
        "release mode requires the regulated-medical-device declaration confirmed in App Store Connect for selected Health & Fitness territories",
      );
      for (const region of requiredMedicalDeviceRegions) {
        check(
          regulatedMedicalDevice.regionalDeclarations?.[region]?.status ===
            "confirmed_in_app_store_connect",
          `release mode requires the ${region} regulated-medical-device declaration confirmed in App Store Connect`,
        );
      }
    }
  }

  const ageRating = submission.ageRating;
  check(isObject(ageRating), "submission.ageRating must be an object");
  if (isObject(ageRating)) {
    check(
      ageRating.targetAudience === "18_plus",
      "target audience must be 18_plus",
    );
    const answers = Array.isArray(ageRating.workingAnswers)
      ? ageRating.workingAnswers
      : [];
    check(
      answers.length === Object.keys(EXPECTED_AGE_ANSWERS).length,
      "ageRating.workingAnswers must contain the complete v1 answer set",
    );
    for (const [id, expectedAnswer] of Object.entries(EXPECTED_AGE_ANSWERS)) {
      const entry = answers.find((answer) => answer?.id === id);
      check(Boolean(entry), `missing provisional age answer ${id}`);
      if (!entry) continue;
      check(
        entry.answer === expectedAnswer,
        `${id} must match the evidence-backed working answer ${expectedAnswer}`,
      );
      check(
        typeof entry.basis === "string" && entry.basis.length > 20,
        `${id} must include an evidence basis`,
      );
      check(
        Array.isArray(entry.evidence) && entry.evidence.length > 0,
        `${id} must cite repository evidence`,
      );
      check(
        Array.isArray(entry.confirmationGates) &&
          entry.confirmationGates.includes("owner") &&
          entry.confirmationGates.includes("app_store_connect"),
        `${id} must retain owner and App Store Connect confirmation gates`,
      );
      if (release) {
        check(
          entry.status === "confirmed",
          `release mode requires ${id} confirmation`,
        );
      } else {
        check(
          ["provisional_pending_confirmation", "confirmed"].includes(
            entry.status,
          ),
          `${id} status must be provisional_pending_confirmation or confirmed`,
        );
      }
    }
    check(
      ageRating.higherAgeOverride?.target === "18_plus",
      "higher-age override target must be 18_plus",
    );
    check(
      hasExactKeys(ageRating.approval, EXPECTED_AGE_APPROVAL_KEYS),
      "ageRating.approval must contain exactly the required approval keys",
    );
    for (const approval of EXPECTED_AGE_APPROVAL_KEYS) {
      check(
        typeof ageRating.approval?.[approval] === "boolean",
        `ageRating.approval.${approval} must be a boolean`,
      );
    }
    if (release) {
      check(
        ageRating.higherAgeOverride?.status ===
          "confirmed_in_app_store_connect",
        "release mode requires the 18+ override to be confirmed in App Store Connect",
      );
      for (const approval of EXPECTED_AGE_APPROVAL_KEYS) {
        check(
          ageRating.approval?.[approval] === true,
          `release mode requires ageRating.approval.${approval}`,
        );
      }
    } else {
      check(
        String(ageRating.higherAgeOverride?.status).startsWith("pending_") ||
          ageRating.higherAgeOverride?.status ===
            "confirmed_in_app_store_connect",
        "18+ override status must remain pending or be confirmed in App Store Connect",
      );
    }
  }

  const privacy = submission.privacy;
  const appManifest = appConfig?.expo?.ios?.privacyManifests;
  check(isObject(privacy), "submission.privacy must be an object");
  check(isObject(appManifest), "app.json must contain an iOS privacy manifest");
  if (isObject(privacy) && isObject(appManifest)) {
    check(
      privacy.tracking === appManifest.NSPrivacyTracking,
      "privacy.tracking must match app.json",
    );
    check(
      arraysEqual(
        privacy.trackingDomains,
        appManifest.NSPrivacyTrackingDomains,
      ),
      "privacy.trackingDomains must match app.json",
    );

    const actualDataTypes = manifestDataTypes(appConfig);
    const workingDataTypes = Array.isArray(privacy.dataTypes)
      ? privacy.dataTypes
      : [];
    check(
      Array.isArray(actualDataTypes) &&
        workingDataTypes.length === actualDataTypes.length,
      "privacy.dataTypes must contain exactly the app-manifest data types",
    );
    if (Array.isArray(actualDataTypes)) {
      actualDataTypes.forEach((manifestEntry, index) => {
        const workingEntry = workingDataTypes[index];
        check(
          workingEntry?.manifestType ===
            manifestEntry.NSPrivacyCollectedDataType,
          `privacy.dataTypes[${index}] type must match app.json`,
        );
        check(
          workingEntry?.collected === true,
          `privacy.dataTypes[${index}] must be marked collected`,
        );
        check(
          workingEntry?.linked ===
            manifestEntry.NSPrivacyCollectedDataTypeLinked,
          `privacy.dataTypes[${index}] linkage must match app.json`,
        );
        check(
          workingEntry?.tracking ===
            manifestEntry.NSPrivacyCollectedDataTypeTracking,
          `privacy.dataTypes[${index}] tracking must match app.json`,
        );
        check(
          arraysEqual(
            workingEntry?.manifestPurposes,
            manifestEntry.NSPrivacyCollectedDataTypePurposes,
          ),
          `privacy.dataTypes[${index}] purposes must match app.json`,
        );
        check(
          typeof workingEntry?.ascDataType === "string" &&
            workingEntry.ascDataType.length > 0,
          `privacy.dataTypes[${index}] must provide a copy-ready App Store label`,
        );
        check(
          Array.isArray(workingEntry?.ascPurposes) &&
            workingEntry.ascPurposes.length > 0,
          `privacy.dataTypes[${index}] must provide copy-ready App Store purposes`,
        );
      });
    }
    const fitnessEntry = workingDataTypes.find(
      (entry) => entry?.manifestType === "NSPrivacyCollectedDataTypeFitness",
    );
    check(
      /no workout logger ships in v1/i.test(fitnessEntry?.v1Data ?? ""),
      "Fitness disclosure must explicitly state that no workout logger ships in v1",
    );
    check(
      workingDataTypes.every((entry) => entry?.tracking === false),
      "every current privacy row must remain tracking No",
    );

    const externalGates = Array.isArray(privacy.externalVerificationGates)
      ? privacy.externalVerificationGates
      : [];
    check(
      arraysEqual(
        externalGates.map((gate) => gate?.id),
        EXPECTED_EXTERNAL_PRIVACY_GATES,
      ),
      "privacy external verification gates are incomplete or reordered",
    );
    check(
      hasExactKeys(privacy.approval, EXPECTED_PRIVACY_APPROVAL_KEYS),
      "privacy.approval must contain exactly the required approval keys",
    );
    for (const approval of EXPECTED_PRIVACY_APPROVAL_KEYS) {
      check(
        typeof privacy.approval?.[approval] === "boolean",
        `privacy.approval.${approval} must be a boolean`,
      );
    }
    if (release) {
      for (const gate of externalGates) {
        check(
          gate?.status === "verified",
          `release mode requires privacy gate ${gate?.id}`,
        );
      }
      for (const approval of EXPECTED_PRIVACY_APPROVAL_KEYS) {
        check(
          privacy.approval?.[approval] === true,
          `release mode requires privacy.approval.${approval}`,
        );
      }
    } else {
      for (const gate of externalGates) {
        check(
          ["pending", "verified"].includes(gate?.status),
          `privacy gate ${gate?.id} status must be pending or verified`,
        );
      }
    }
  }

  return errors;
}

function imagePathForShot(repoRoot, manifest, shot) {
  if (typeof shot.file !== "string" || shot.file.length === 0) return null;
  if (path.isAbsolute(shot.file) || shot.file !== path.basename(shot.file)) {
    return null;
  }
  const assetDirectory = path.resolve(repoRoot, manifest.assetDirectory ?? "");
  const candidate = path.resolve(assetDirectory, shot.file);
  if (!candidate.startsWith(`${assetDirectory}${path.sep}`)) return null;
  return candidate;
}

export function validateScreenshotManifest({
  manifest,
  repoRoot = DEFAULT_REPO_ROOT,
  release = false,
  readFile = fs.readFileSync,
  fileExists = fs.existsSync,
}) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  check(manifest?.schemaVersion === 1, "screenshots.schemaVersion must be 1");
  check(
    [
      "planned_not_captured",
      "capture_complete_pending_approval",
      "approved_for_submission",
    ].includes(manifest?.status),
    "screenshots.status is invalid",
  );
  check(
    manifest?.assetDirectory === "app-store/screenshots/files",
    "screenshots.assetDirectory must remain app-store/screenshots/files",
  );
  const requirements = manifest?.technicalRequirements;
  check(
    isObject(requirements),
    "screenshots.technicalRequirements must be an object",
  );
  if (isObject(requirements)) {
    check(
      requirements.slot === "iPhone 6.9-inch portrait",
      "screenshot slot must be iPhone 6.9-inch portrait",
    );
    check(
      arraysEqual(requirements.acceptedFormats, ["png"]),
      "accepted screenshot formats must be png",
    );
    check(
      dimensionsEqual(
        requirements.acceptedPixelDimensions,
        ACCEPTED_SCREENSHOT_DIMENSIONS,
      ),
      "accepted 6.9-inch portrait dimensions are stale or incomplete",
    );
    check(
      requirements.alphaAllowed === false,
      "screenshot alpha must be disallowed",
    );
    check(
      requirements.minimumListingScreenshots === 1 &&
        requirements.maximumListingScreenshots === 10,
      "listing screenshot count must remain 1 through 10",
    );
  }

  const defaults = manifest?.captureDefaults;
  check(isObject(defaults), "screenshots.captureDefaults must be an object");
  if (isObject(defaults)) {
    check(
      defaults.locale === "en-US",
      "initial screenshot locale must be en-US",
    );
    check(
      defaults.appStoreConnectDeviceSlot === "iPhone 6.9-inch portrait",
      "capture device slot must match the technical requirement",
    );
    if (release) {
      for (const field of [
        "appVersion",
        "buildNumber",
        "gitCommit",
        "easBuildReference",
        "captureDevice",
        "iosVersion",
        "locale",
        "appearance",
        "capturedBy",
        "capturedAtUtc",
      ]) {
        check(
          defaults[field] !== null && defaults[field] !== "",
          `release mode requires screenshots.captureDefaults.${field}`,
        );
      }
      check(
        validIsoTimestamp(defaults.capturedAtUtc),
        "captureDefaults.capturedAtUtc must be a UTC ISO timestamp",
      );
      check(
        /^[0-9a-f]{40}$/i.test(defaults.gitCommit ?? ""),
        "captureDefaults.gitCommit must be a full 40-character Git SHA",
      );
    }
  }

  const shots = Array.isArray(manifest?.shots) ? manifest.shots : [];
  check(
    shots.length === EXPECTED_SHOT_IDS.length,
    "screenshot shot plan must contain 10 entries",
  );
  check(
    arraysEqual(
      shots.map((shot) => shot?.id),
      EXPECTED_SHOT_IDS,
    ),
    "screenshot shot IDs must match the approved ordered plan",
  );

  const capturedIds = new Set();
  const capturedFiles = new Set();
  shots.forEach((shot, index) => {
    const label = shot?.id ?? `shot[${index}]`;
    check(shot?.order === index + 1, `${label} has an invalid order`);
    check(
      typeof shot?.intendedUse === "string" && shot.intendedUse.length > 0,
      `${label} must state its intended use`,
    );
    check(
      typeof shot?.requiredForReleaseEvidence === "boolean",
      `${label} must declare whether it is required release evidence`,
    );
    check(
      shot?.requiredForReleaseEvidence ===
        EXPECTED_SHOT_RELEASE_EVIDENCE[label],
      `${label} requiredForReleaseEvidence must match the approved plan`,
    );
    check(
      isObject(shot?.piiReview),
      `${label} must include a PII review record`,
    );

    if (shot?.file === null) {
      check(
        shot?.evidenceReference === null,
        `${label} cannot have evidence without an image file`,
      );
      check(
        shot?.piiReview?.status === "pending",
        `${label} without a file must keep PII review pending`,
      );
      if (release && EXPECTED_SHOT_RELEASE_EVIDENCE[label] === true) {
        errors.push(`release mode requires image file for ${label}`);
      }
      return;
    }

    const imagePath = imagePathForShot(repoRoot, manifest, shot);
    check(
      Boolean(imagePath),
      `${label} file must be a safe filename inside the asset directory`,
    );
    if (!imagePath) return;
    const extension = path.extname(imagePath).slice(1).toLowerCase();
    check(
      requirements?.acceptedFormats?.includes(extension),
      `${label} uses unsupported extension .${extension}`,
    );
    check(
      fileExists(imagePath),
      `${label} image file does not exist: ${shot.file}`,
    );
    if (!fileExists(imagePath)) return;

    check(
      !capturedFiles.has(shot.file),
      "captured screenshot filenames must be unique",
    );
    capturedFiles.add(shot.file);

    try {
      const inspection = inspectImage(readFile(imagePath), extension);
      check(
        inspection.format === "png",
        `${label} extension does not match its image signature`,
      );
      check(
        ACCEPTED_SCREENSHOT_DIMENSIONS.some(
          ({ width, height }) =>
            inspection.width === width && inspection.height === height,
        ),
        `${label} has unsupported dimensions ${inspection.width}x${inspection.height}`,
      );
      check(
        !inspection.hasAlpha,
        `${label} must not contain an alpha channel or transparency`,
      );
    } catch (error) {
      errors.push(`${label} image inspection failed: ${error.message}`);
    }

    capturedIds.add(label);
    if (release) {
      check(
        typeof shot.evidenceReference === "string" &&
          shot.evidenceReference.length > 0,
        `release mode requires an evidence reference for ${label}`,
      );
      check(
        shot.piiReview?.status === "approved_no_personal_data",
        `release mode requires approved PII review for ${label}`,
      );
      check(
        typeof shot.piiReview?.reviewer === "string" &&
          shot.piiReview.reviewer.length > 0,
        `release mode requires a PII reviewer for ${label}`,
      );
      check(
        validIsoTimestamp(shot.piiReview?.reviewedAtUtc),
        `release mode requires a UTC PII review timestamp for ${label}`,
      );
    }
  });

  for (const selectionName of ["listingSelection", "reviewEvidenceSelection"]) {
    const selection = Array.isArray(manifest?.[selectionName])
      ? manifest[selectionName]
      : [];
    check(
      new Set(selection).size === selection.length,
      `${selectionName} must not contain duplicates`,
    );
    check(
      selection.every((id) => EXPECTED_SHOT_IDS.includes(id)),
      `${selectionName} contains an unknown shot ID`,
    );
    const selectedOrders = selection.map((id) => EXPECTED_SHOT_IDS.indexOf(id));
    check(
      selectedOrders.every(
        (order, index) => index === 0 || order > selectedOrders[index - 1],
      ),
      `${selectionName} must preserve shot order`,
    );
    if (release) {
      check(
        selection.every((id) => capturedIds.has(id)),
        `${selectionName} must reference only captured images`,
      );
    }
  }

  if (release) {
    const listingSelection = manifest.listingSelection ?? [];
    check(
      listingSelection.length >= 1 && listingSelection.length <= 10,
      "release mode requires 1 through 10 listing screenshots",
    );
    const requiredIds = EXPECTED_SHOT_IDS.filter(
      (id) => EXPECTED_SHOT_RELEASE_EVIDENCE[id],
    );
    check(
      requiredIds.every((id) => manifest.reviewEvidenceSelection?.includes(id)),
      "reviewEvidenceSelection must include every required release-evidence shot",
    );
    check(
      manifest.status === "approved_for_submission",
      "release mode requires screenshot manifest approval",
    );
  }

  return errors;
}

export function validateBundle({
  repoRoot = DEFAULT_REPO_ROOT,
  release = false,
} = {}) {
  const submission = readJson(
    path.join(repoRoot, "app-store/app-store-submission.json"),
  );
  const screenshotManifest = readJson(
    path.join(repoRoot, "app-store/screenshots/manifest.json"),
  );
  const appConfig = readJson(path.join(repoRoot, "artifacts/cut-os/app.json"));
  const territoryCatalog = readJson(
    path.join(repoRoot, "app-store/app-store-connect-territories.json"),
  );
  const metadataMarkdown = fs.readFileSync(
    path.join(repoRoot, "APP_STORE_METADATA.md"),
    "utf8",
  );
  const errors = [
    ...validateMetadata({
      submission,
      appConfig,
      metadataMarkdown,
      territoryCatalog,
      release,
    }),
    ...validateScreenshotManifest({
      manifest: screenshotManifest,
      repoRoot,
      release,
    }),
  ];

  if (release) {
    const screenshotVersion = screenshotManifest?.captureDefaults?.appVersion;
    if (screenshotVersion !== submission?.listing?.appVersion) {
      errors.push(
        "screenshot appVersion must match the submitted listing version",
      );
    }
  }
  return errors;
}

function main() {
  const unknownArguments = process.argv
    .slice(2)
    .filter((argument) => argument !== "--release");
  if (unknownArguments.length > 0) {
    console.error(`Unknown argument(s): ${unknownArguments.join(", ")}`);
    process.exitCode = 2;
    return;
  }

  const release = process.argv.includes("--release");
  let errors;
  try {
    errors = validateBundle({ release });
  } catch (error) {
    console.error(`App Store validation could not run: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (errors.length > 0) {
    console.error(
      `${release ? "Release" : "Working-record"} App Store validation failed with ${errors.length} error(s):`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `${release ? "Release" : "Working-record"} App Store validation passed.`,
  );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  main();
}
