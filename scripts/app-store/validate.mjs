import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

import {
  EasSubmitConfigurationError,
  validateEasSubmitConfig,
} from "../../ops/scripts/eas-submit-config-verify.mjs";
import {
  PostBuildEvidenceError,
  verifyPostBuildEvidenceBoundary,
} from "../../ops/scripts/post-build-evidence-verify.mjs";

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

export const MAX_REVIEW_ACCOUNT_EVIDENCE_AGE_MS = 24 * 60 * 60 * 1000;
const EXACT_BUILD_IDENTITY_FIELDS = Object.freeze([
  "appVersion",
  "buildNumber",
  "gitCommit",
  "easBuildId",
  "appStoreConnectBuildId",
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
  parental_controls: "no",
  age_assurance: "yes",
  unrestricted_web_access: "no",
  user_generated_content: "no",
  social_media: "no",
  social_media_disabled_for_users_under_13: "not_applicable",
  messaging_or_chat: "no",
  advertising: "no",
  profanity_or_crude_humor: "none",
  horror_or_fear_themes: "none",
  alcohol_tobacco_or_drug_use_or_references: "none",
  medical_or_treatment_information: "none",
  health_or_wellness_topics: "yes",
  mature_or_suggestive_themes: "none",
  sexual_content_or_nudity: "none",
  graphic_sexual_content_and_nudity: "none",
  cartoon_or_fantasy_violence: "none",
  realistic_violence: "none",
  prolonged_graphic_or_sadistic_realistic_violence: "none",
  guns_or_other_weapons: "none",
  gambling: "none",
  simulated_gambling: "none",
  contests: "none",
  loot_boxes: "none",
});
const EXPECTED_SUBMISSION_KEYS = Object.freeze([
  "schemaVersion",
  "status",
  "updated",
  "references",
  "listing",
  "ownerControlledFields",
  "availability",
  "commercialAndLegal",
  "appReview",
  "subscription",
  "accessibility",
  "authenticationSecurity",
  "regulatedMedicalDevice",
  "ageRating",
  "privacy",
]);
const EXPECTED_SUBMISSION_REFERENCE_KEYS = Object.freeze([
  "humanRecord",
  "appConfig",
  "privacyDataMap",
  "reviewRunbook",
  "testFlightRecord",
  "screenshotManifest",
]);
const EXPECTED_AGE_RATING_KEYS = Object.freeze([
  "targetAudience",
  "questionnaireCheckedAt",
  "questionnaireSource",
  "savedQuestionnaireEvidence",
  "workingAnswers",
  "higherAgeOverride",
  "approval",
]);
const EXPECTED_AGE_ANSWER_KEYS = Object.freeze([
  "id",
  "answer",
  "status",
  "basis",
  "evidence",
  "confirmationGates",
]);
const EXPECTED_PRIVACY_KEYS = Object.freeze([
  "status",
  "manifestPath",
  "tracking",
  "trackingDomains",
  "requiredReasonApis",
  "dataTypes",
  "externalVerificationGates",
  "approval",
]);

const AGE_QUESTIONNAIRE_SOURCE =
  "https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/";
const CURRENT_APPLE_AGE_RATING_VALUES = Object.freeze([
  "4+",
  "9+",
  "13+",
  "16+",
  "18+",
  "Unrated",
]);

const EXPECTED_APP_REVIEW_KEYS = Object.freeze([
  "status",
  "signInRequired",
  "credentialPolicy",
  "configuration",
  "finalResolvedNotesEvidence",
  "accountStates",
  "exactBuild",
  "approval",
]);
const EXPECTED_FINAL_REVIEW_NOTES_EVIDENCE_KEYS = Object.freeze([
  "templateSha256",
  "resolvedUtf8ByteCount",
  "placeholdersRemaining",
  "measuredAtUtc",
  "savedInAppStoreConnect",
  "evidenceReference",
]);
const EXPECTED_APP_REVIEW_EXACT_BUILD_KEYS = Object.freeze([
  ...EXACT_BUILD_IDENTITY_FIELDS,
  "verifiedAtUtc",
  "navigationEvidenceReference",
]);
const EXPECTED_APP_REVIEW_CONFIGURATION_KEYS = Object.freeze([
  "contactConfigured",
  "notesConfigured",
  "primaryDemoAccountConfigured",
  "additionalSyntheticAccountsConfiguredInNotes",
]);
const EXPECTED_REVIEW_ACCOUNT_KEYS = Object.freeze([
  "fullAccess",
  "purchase",
  "adultGate",
  "restricted",
  "deletion",
]);
const EXPECTED_APP_REVIEW_APPROVAL_KEYS = Object.freeze([
  "owner",
  "reviewQa",
  "appStoreConnectConfirmed",
]);

const EXPECTED_SUBSCRIPTION_KEYS = Object.freeze([
  "status",
  "entitlementId",
  "subscriptionGroupReferenceName",
  "productReferenceName",
  "productId",
  "duration",
  "priceScheduleEvidenceReference",
  "usPricing",
  "availabilityEvidenceReference",
  "introductoryOfferDecision",
  "introductoryOfferTerms",
  "familySharingDecision",
  "taxCategory",
  "localizations",
  "appStoreConnect",
  "revenueCat",
  "exactBuildEvidence",
  "approval",
]);
const EXPECTED_US_PRICING_KEYS = Object.freeze([
  "storefront",
  "currency",
  "amount",
  "effectiveStatus",
  "effectiveAtUtc",
  "evidenceReference",
  "ownerDecisionRevision",
  "ownerDecisionEvidenceReference",
]);
const EXPECTED_INTRODUCTORY_OFFER_TERMS_KEYS = Object.freeze([
  "duration",
  "numberOfPeriods",
  "priceAmount",
  "eligibility",
  "evidenceReference",
]);
const EXPECTED_REVIEW_SCREENSHOT_UPLOAD_KEYS = Object.freeze([
  "status",
  "shotId",
  "sha256",
  "uploadedAtUtc",
  "evidenceReference",
]);
const EXPECTED_SUBSCRIPTION_APPROVAL_KEYS = Object.freeze([
  "owner",
  "appStoreConnectConfirmed",
  "revenueCatVerified",
  "nativeQaVerified",
]);
const EXPECTED_SUBSCRIPTION_EXACT_BUILD_KEYS = Object.freeze([
  ...EXACT_BUILD_IDENTITY_FIELDS,
  "storeKitOfferStatus",
  "purchaseQaStatus",
  "testFlightStatus",
  "testedAtUtc",
  "evidenceReference",
]);
const SUPPORTED_SUBSCRIPTION_DURATIONS = Object.freeze([
  "1_week",
  "1_month",
  "2_months",
  "3_months",
  "6_months",
  "1_year",
]);

const EXPECTED_ACCESSIBILITY_KEYS = Object.freeze([
  "status",
  "device",
  "source",
  "accessibilityUrl",
  "exactBuildEvidence",
  "commonTasks",
  "features",
  "appStoreConnectDecision",
  "approval",
]);
const EXPECTED_ACCESSIBILITY_EXACT_BUILD_KEYS = Object.freeze([
  ...EXACT_BUILD_IDENTITY_FIELDS,
  "testedAtUtc",
  "evidenceReference",
]);
const ACCESSIBILITY_SOURCE =
  "https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/";
const EXPECTED_ACCESSIBILITY_TASK_KEYS = Object.freeze([
  "firstLaunchAndSignUp",
  "signIn",
  "adultEligibility",
  "purchaseAndRestore",
  "onboarding",
  "todayAndWeighIn",
  "balancedMealLogging",
  "settingsAndDeletion",
]);
const EXPECTED_ACCESSIBILITY_FEATURE_KEYS = Object.freeze([
  "voiceOver",
  "voiceControl",
  "largerText",
  "darkInterface",
  "differentiateWithoutColorAlone",
  "sufficientContrast",
  "reducedMotion",
  "captions",
  "audioDescriptions",
]);
const EXPECTED_ACCESSIBILITY_APPROVAL_KEYS = Object.freeze([
  "owner",
  "accessibilityReviewer",
  "exactBuildVerified",
  "appStoreConnectConfirmed",
]);
const EXPECTED_ACCESSIBILITY_ASC_DECISION_KEYS = Object.freeze([
  "status",
  "decision",
  "savedAtUtc",
  "evidenceReference",
]);

const EXPECTED_COMMERCIAL_LEGAL_KEYS = Object.freeze([
  "status",
  "appDownloadPrice",
  "licenseAgreement",
  "appTaxCategory",
  "dsaStatus",
  "appStoreServerNotifications",
  "approval",
]);
const EXPECTED_COMMERCIAL_LEGAL_APPROVAL_KEYS = Object.freeze([
  "owner",
  "legal",
  "appStoreConnectConfirmed",
]);

const EXPECTED_TESTFLIGHT_KEYS = Object.freeze([
  "schemaVersion",
  "status",
  "updated",
  "distributionScope",
  "betaAppDescription",
  "whatToTest",
  "feedbackEmailConfiguredInAppStoreConnect",
  "externalBetaReview",
  "exactBuildEvidence",
  "approval",
]);
const EXPECTED_TESTFLIGHT_APPROVAL_KEYS = Object.freeze([
  "owner",
  "mobileQa",
  "appStoreConnectConfirmed",
]);
const EXPECTED_EXTERNAL_BETA_REVIEW_KEYS = Object.freeze([
  "required",
  "contactConfigured",
  "primaryDemoAccountConfigured",
  "notesConfigured",
]);
const EXPECTED_TESTFLIGHT_BUILD_EVIDENCE_KEYS = Object.freeze([
  ...EXACT_BUILD_IDENTITY_FIELDS,
  "internalGroupConfigured",
  "testedAtUtc",
  "qaReportReference",
  "purchaseQaReportReference",
  "appReviewRunbookReference",
]);

const EXPECTED_SCREENSHOT_SHOT_KEYS = Object.freeze([
  "order",
  "id",
  "intendedUse",
  "requiredForReleaseEvidence",
  "file",
  "sha256",
  "evidenceReference",
  "piiReview",
]);
const EXPECTED_SCREENSHOT_CAPTURE_DEFAULT_KEYS = Object.freeze([
  ...EXACT_BUILD_IDENTITY_FIELDS,
  "easBuildReference",
  "appStoreConnectDeviceSlot",
  "captureDevice",
  "iosVersion",
  "locale",
  "appearance",
  "capturedBy",
  "capturedAtUtc",
]);
const EXPECTED_SCREENSHOT_PII_REVIEW_KEYS = Object.freeze([
  "status",
  "reviewedSha256",
  "reviewer",
  "reviewedAtUtc",
  "notes",
]);

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
const EU_TERRITORY_CODES = Object.freeze(
  EU_EEA_TERRITORY_CODES.filter((code) => !["IS", "LI", "NO"].includes(code)),
);

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

function nullableNonEmptyString(value) {
  return (
    value === null || (typeof value === "string" && value.trim().length > 0)
  );
}

function fullLowercaseGitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

function literalProviderId(value) {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[A-Za-z0-9._:-]+$/u.test(value) &&
    !/(?:placeholder|pending|unknown|tbd|todo)/iu.test(value)
  );
}

function fixedTwoDecimalAmount(value) {
  return (
    typeof value === "string" && /^(?:0|[1-9][0-9]*)\.[0-9]{2}$/u.test(value)
  );
}

function validateExactBuildIdentity({
  value,
  label,
  expectedAppVersion,
  required,
  check,
}) {
  check(
    value?.appVersion === expectedAppVersion,
    `${label}.appVersion must match listing.appVersion`,
  );
  check(
    value?.buildNumber === null ||
      (typeof value?.buildNumber === "string" &&
        value.buildNumber.trim().length > 0),
    `${label}.buildNumber must be null or non-empty`,
  );
  check(
    value?.gitCommit === null || fullLowercaseGitSha(value?.gitCommit),
    `${label}.gitCommit must be null or a full lowercase Git SHA`,
  );
  for (const field of ["easBuildId", "appStoreConnectBuildId"]) {
    check(
      value?.[field] === null || literalProviderId(value?.[field]),
      `${label}.${field} must be null or a literal non-placeholder provider ID`,
    );
  }
  if (required) {
    check(
      typeof value?.buildNumber === "string" &&
        value.buildNumber.trim().length > 0,
      `${label}.buildNumber is required`,
    );
    check(
      fullLowercaseGitSha(value?.gitCommit),
      `${label}.gitCommit full lowercase Git SHA is required`,
    );
    for (const field of ["easBuildId", "appStoreConnectBuildId"]) {
      check(literalProviderId(value?.[field]), `${label}.${field} is required`);
    }
  }
}

function currentTimeMilliseconds(clock) {
  try {
    const value = typeof clock === "function" ? clock() : clock;
    const milliseconds =
      value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isFinite(milliseconds) ? milliseconds : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function validatePendingEvidenceRecord({
  value,
  label,
  release,
  allowedCompletedStatuses = ["verified"],
  check,
}) {
  check(
    hasExactKeys(value, ["status", "evidenceReference"]),
    `${label} must contain exactly status and evidenceReference`,
  );
  check(
    ["pending", ...allowedCompletedStatuses].includes(value?.status),
    `${label}.status is invalid`,
  );
  check(
    nullableNonEmptyString(value?.evidenceReference),
    `${label}.evidenceReference must be null or non-empty`,
  );
  if (release || allowedCompletedStatuses.includes(value?.status)) {
    check(
      allowedCompletedStatuses.includes(value?.status),
      `release mode requires ${label} completed evidence status`,
    );
    check(
      typeof value?.evidenceReference === "string" &&
        value.evidenceReference.trim().length > 0,
      `release mode requires ${label}.evidenceReference`,
    );
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

  release = release || catalog.status === TERRITORY_CATALOG_RELEASE_STATUS;

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

function validateCommercialAndLegal({ value, release, check }) {
  check(isObject(value), "submission.commercialAndLegal must be an object");
  if (!isObject(value)) return;

  check(
    hasExactKeys(value, EXPECTED_COMMERCIAL_LEGAL_KEYS),
    "commercialAndLegal must contain exactly the required keys",
  );
  check(
    [
      "pending_owner_legal_and_app_store_connect",
      "confirmed_in_app_store_connect",
    ].includes(value.status),
    "commercialAndLegal.status must remain pending or be confirmed in App Store Connect",
  );
  check(
    value.appDownloadPrice === null ||
      ["free_download", "paid_download"].includes(value.appDownloadPrice),
    "commercialAndLegal.appDownloadPrice must be null, free_download, or paid_download",
  );
  check(
    value.licenseAgreement === null ||
      ["standard_apple_eula", "custom_eula"].includes(value.licenseAgreement),
    "commercialAndLegal.licenseAgreement must be null or an approved EULA option",
  );
  check(
    nullableNonEmptyString(value.appTaxCategory),
    "commercialAndLegal.appTaxCategory must be null or a non-empty owner-supplied value",
  );
  check(
    value.dsaStatus === null ||
      ["trader", "non_trader", "not_applicable_no_eu_distribution"].includes(
        value.dsaStatus,
      ),
    "commercialAndLegal.dsaStatus must be null or an approved DSA position",
  );

  const notifications = value.appStoreServerNotifications;
  check(
    hasExactKeys(notifications, [
      "status",
      "productionUrl",
      "sandboxUrl",
      "evidenceReference",
    ]),
    "commercialAndLegal.appStoreServerNotifications must contain exactly the required keys",
  );
  check(
    ["pending_configuration", "confirmed_in_app_store_connect"].includes(
      notifications?.status,
    ),
    "commercialAndLegal.appStoreServerNotifications.status is invalid",
  );
  for (const field of ["productionUrl", "sandboxUrl"]) {
    check(
      notifications?.[field] === null || validHttpsUrl(notifications[field]),
      `commercialAndLegal.appStoreServerNotifications.${field} must be null or HTTPS`,
    );
  }
  check(
    nullableNonEmptyString(notifications?.evidenceReference),
    "commercialAndLegal.appStoreServerNotifications.evidenceReference must be null or non-empty",
  );
  if (notifications?.status === "confirmed_in_app_store_connect") {
    for (const field of ["productionUrl", "sandboxUrl"]) {
      check(
        validHttpsUrl(notifications?.[field]),
        `confirmed App Store Server Notifications requires commercialAndLegal.appStoreServerNotifications.${field}`,
      );
    }
    check(
      typeof notifications?.evidenceReference === "string" &&
        notifications.evidenceReference.trim().length > 0,
      "confirmed App Store Server Notifications requires an evidence reference",
    );
  }

  const approvalRequired =
    release || value.status === "confirmed_in_app_store_connect";
  validateApprovalRecord({
    approval: value.approval,
    expectedKeys: EXPECTED_COMMERCIAL_LEGAL_APPROVAL_KEYS,
    label: "commercialAndLegal.approval",
    release: approvalRequired,
    check,
  });
  if (!approvalRequired) return;

  const prefix = release ? "release mode" : "confirmed commercialAndLegal";
  check(
    value.status === "confirmed_in_app_store_connect",
    `${prefix} requires commercialAndLegal.status confirmed_in_app_store_connect`,
  );
  for (const field of [
    "appDownloadPrice",
    "licenseAgreement",
    "appTaxCategory",
    "dsaStatus",
  ]) {
    check(
      value[field] !== null && value[field] !== "",
      `${prefix} requires commercialAndLegal.${field}`,
    );
  }
  check(
    notifications?.status === "confirmed_in_app_store_connect",
    `${prefix} requires App Store Server Notifications confirmation`,
  );
  for (const field of ["productionUrl", "sandboxUrl"]) {
    check(
      validHttpsUrl(notifications?.[field]),
      `${prefix} requires commercialAndLegal.appStoreServerNotifications.${field}`,
    );
  }
  check(
    typeof notifications?.evidenceReference === "string" &&
      notifications.evidenceReference.trim().length > 0,
    `${prefix} requires commercialAndLegal.appStoreServerNotifications.evidenceReference`,
  );
}

function validateAppReview({
  value,
  listing,
  release,
  nowMs,
  notesTemplateSha256,
  check,
}) {
  check(isObject(value), "submission.appReview must be an object");
  if (!isObject(value)) return;

  check(
    hasExactKeys(value, EXPECTED_APP_REVIEW_KEYS),
    "appReview must contain exactly the required keys",
  );
  check(
    [
      "pending_app_store_connect_and_exact_build_verification",
      "ready_for_review",
    ].includes(value.status),
    "appReview.status must remain pending or be ready_for_review",
  );
  check(value.signInRequired === true, "appReview.signInRequired must be true");
  check(
    value.credentialPolicy ===
      "credentials_only_in_app_store_connect_or_approved_secret_manager",
    "appReview must retain the credential-storage policy",
  );

  check(
    hasExactKeys(value.configuration, EXPECTED_APP_REVIEW_CONFIGURATION_KEYS),
    "appReview.configuration must contain exactly the required keys",
  );
  for (const key of EXPECTED_APP_REVIEW_CONFIGURATION_KEYS) {
    check(
      typeof value.configuration?.[key] === "boolean",
      `appReview.configuration.${key} must be a boolean`,
    );
  }

  const finalNotes = value.finalResolvedNotesEvidence;
  check(
    hasExactKeys(finalNotes, EXPECTED_FINAL_REVIEW_NOTES_EVIDENCE_KEYS),
    "appReview.finalResolvedNotesEvidence must contain exactly the required non-secret attestation keys",
  );
  check(
    finalNotes?.templateSha256 === null ||
      /^[0-9a-f]{64}$/u.test(finalNotes?.templateSha256 ?? ""),
    "appReview.finalResolvedNotesEvidence.templateSha256 must be null or a lowercase SHA-256",
  );
  if (finalNotes?.templateSha256 !== null) {
    check(
      typeof notesTemplateSha256 === "string" &&
        finalNotes.templateSha256 === notesTemplateSha256,
      "appReview final resolved notes templateSha256 must match the credential-free repository draft",
    );
  }
  check(
    finalNotes?.resolvedUtf8ByteCount === null ||
      (Number.isInteger(finalNotes?.resolvedUtf8ByteCount) &&
        finalNotes.resolvedUtf8ByteCount >= 0 &&
        finalNotes.resolvedUtf8ByteCount <= 4000),
    "appReview.finalResolvedNotesEvidence.resolvedUtf8ByteCount must be null or an integer from 0 through 4000",
  );
  check(
    finalNotes?.placeholdersRemaining === null ||
      (Number.isInteger(finalNotes?.placeholdersRemaining) &&
        finalNotes.placeholdersRemaining >= 0),
    "appReview.finalResolvedNotesEvidence.placeholdersRemaining must be null or a non-negative integer",
  );
  check(
    finalNotes?.measuredAtUtc === null ||
      validIsoTimestamp(finalNotes?.measuredAtUtc),
    "appReview.finalResolvedNotesEvidence.measuredAtUtc must be null or a UTC ISO timestamp",
  );
  check(
    typeof finalNotes?.savedInAppStoreConnect === "boolean",
    "appReview.finalResolvedNotesEvidence.savedInAppStoreConnect must be a boolean",
  );
  check(
    nullableNonEmptyString(finalNotes?.evidenceReference),
    "appReview.finalResolvedNotesEvidence.evidenceReference must be null or non-empty",
  );
  if (finalNotes?.savedInAppStoreConnect === false) {
    for (const field of [
      "templateSha256",
      "resolvedUtf8ByteCount",
      "placeholdersRemaining",
      "measuredAtUtc",
      "evidenceReference",
    ]) {
      check(
        finalNotes?.[field] === null,
        `unsaved App Review Notes must keep appReview.finalResolvedNotesEvidence.${field} null`,
      );
    }
  }
  if (finalNotes?.savedInAppStoreConnect === true) {
    check(
      typeof notesTemplateSha256 === "string" &&
        finalNotes?.templateSha256 === notesTemplateSha256,
      "saved App Review Notes require the exact credential-free template SHA-256",
    );
    check(
      Number.isInteger(finalNotes?.resolvedUtf8ByteCount) &&
        finalNotes.resolvedUtf8ByteCount >= 0 &&
        finalNotes.resolvedUtf8ByteCount <= 4000,
      "saved App Review Notes require a resolved UTF-8 byte count no greater than 4000",
    );
    check(
      finalNotes?.placeholdersRemaining === 0,
      "saved App Review Notes require zero placeholders remaining",
    );
    check(
      validIsoTimestamp(finalNotes?.measuredAtUtc),
      "saved App Review Notes require a UTC measurement timestamp",
    );
    check(
      typeof finalNotes?.evidenceReference === "string" &&
        finalNotes.evidenceReference.trim().length > 0,
      "saved App Review Notes require a non-secret evidence reference",
    );
  }

  check(
    hasExactKeys(value.accountStates, EXPECTED_REVIEW_ACCOUNT_KEYS),
    "appReview.accountStates must contain exactly the required review accounts",
  );
  for (const key of EXPECTED_REVIEW_ACCOUNT_KEYS) {
    const record = value.accountStates?.[key];
    const label = `appReview.accountStates.${key}`;
    check(
      hasExactKeys(record, [
        "status",
        "nonExpiring",
        "noMfaOrOutOfBandTrap",
        "testedAtUtc",
        "evidenceReference",
      ]),
      `${label} must contain exactly the required review-account evidence keys`,
    );
    check(
      ["pending", "verified_fresh"].includes(record?.status),
      `${label}.status must be pending or verified_fresh`,
    );
    check(
      record?.testedAtUtc === null || validIsoTimestamp(record.testedAtUtc),
      `${label}.testedAtUtc must be null or a UTC ISO timestamp`,
    );
    check(
      nullableNonEmptyString(record?.evidenceReference),
      `${label}.evidenceReference must be null or non-empty`,
    );
    for (const field of ["nonExpiring", "noMfaOrOutOfBandTrap"]) {
      check(
        typeof record?.[field] === "boolean",
        `${label}.${field} must be a boolean`,
      );
    }
    if (record?.status === "verified_fresh") {
      check(
        validIsoTimestamp(record.testedAtUtc) &&
          typeof record.evidenceReference === "string" &&
          record.evidenceReference.trim().length > 0,
        `${label} cannot be verified without UTC and evidence`,
      );
      check(
        record.nonExpiring === true,
        `${label} verified_fresh evidence requires a non-expiring review account`,
      );
      check(
        record.noMfaOrOutOfBandTrap === true,
        `${label} verified_fresh evidence requires no MFA or out-of-band access trap`,
      );
      if (validIsoTimestamp(record.testedAtUtc) && Number.isFinite(nowMs)) {
        const testedAtMs = Date.parse(record.testedAtUtc);
        if (testedAtMs > nowMs) {
          check(false, `${label}.testedAtUtc cannot be in the future`);
        } else {
          check(
            nowMs - testedAtMs <= MAX_REVIEW_ACCOUNT_EVIDENCE_AGE_MS,
            `${label} verified_fresh evidence must be no more than 24 hours old`,
          );
        }
      }
    }
  }

  const exactBuild = value.exactBuild;
  check(
    hasExactKeys(exactBuild, EXPECTED_APP_REVIEW_EXACT_BUILD_KEYS),
    "appReview.exactBuild must contain exactly the required keys",
  );
  const approvalRequired = release || value.status === "ready_for_review";
  validateExactBuildIdentity({
    value: exactBuild,
    label: "appReview.exactBuild",
    expectedAppVersion: listing?.appVersion,
    required: approvalRequired,
    check,
  });
  check(
    exactBuild?.verifiedAtUtc === null ||
      validIsoTimestamp(exactBuild.verifiedAtUtc),
    "appReview.exactBuild.verifiedAtUtc must be null or a UTC ISO timestamp",
  );
  check(
    nullableNonEmptyString(exactBuild?.navigationEvidenceReference),
    "appReview.exactBuild.navigationEvidenceReference must be null or non-empty",
  );

  validateApprovalRecord({
    approval: value.approval,
    expectedKeys: EXPECTED_APP_REVIEW_APPROVAL_KEYS,
    label: "appReview.approval",
    release: approvalRequired,
    check,
  });
  if (!approvalRequired) return;

  const prefix = release ? "release mode" : "ready appReview";
  check(
    value.status === "ready_for_review",
    `${prefix} requires appReview.status ready_for_review`,
  );
  for (const key of EXPECTED_APP_REVIEW_CONFIGURATION_KEYS) {
    check(
      value.configuration?.[key] === true,
      `${prefix} requires appReview.configuration.${key}`,
    );
  }
  for (const key of EXPECTED_REVIEW_ACCOUNT_KEYS) {
    const record = value.accountStates?.[key];
    check(
      record?.status === "verified_fresh" &&
        validIsoTimestamp(record?.testedAtUtc) &&
        typeof record?.evidenceReference === "string" &&
        record.evidenceReference.trim().length > 0,
      `${prefix} requires fresh evidence for appReview.accountStates.${key}`,
    );
  }
  check(
    finalNotes?.savedInAppStoreConnect === true &&
      finalNotes?.templateSha256 === notesTemplateSha256 &&
      Number.isInteger(finalNotes?.resolvedUtf8ByteCount) &&
      finalNotes.resolvedUtf8ByteCount <= 4000 &&
      finalNotes?.placeholdersRemaining === 0 &&
      validIsoTimestamp(finalNotes?.measuredAtUtc) &&
      typeof finalNotes?.evidenceReference === "string" &&
      finalNotes.evidenceReference.trim().length > 0,
    `${prefix} requires appReview.finalResolvedNotesEvidence saved attestation`,
  );
  check(
    typeof exactBuild?.buildNumber === "string" &&
      exactBuild.buildNumber.trim().length > 0,
    `${prefix} requires appReview.exactBuild.buildNumber`,
  );
  check(
    validIsoTimestamp(exactBuild?.verifiedAtUtc),
    `${prefix} requires appReview.exactBuild.verifiedAtUtc`,
  );
  check(
    typeof exactBuild?.navigationEvidenceReference === "string" &&
      exactBuild.navigationEvidenceReference.trim().length > 0,
    `${prefix} requires appReview.exactBuild.navigationEvidenceReference`,
  );
}

function validateSubscription({ value, listing, release, check }) {
  check(isObject(value), "submission.subscription must be an object");
  if (!isObject(value)) return;

  check(
    hasExactKeys(value, EXPECTED_SUBSCRIPTION_KEYS),
    "subscription must contain exactly the required keys",
  );
  check(
    [
      "pending_owner_app_store_connect_and_exact_build_evidence",
      "ready_for_submission",
    ].includes(value.status),
    "subscription.status must remain pending or be ready_for_submission",
  );
  check(
    value.entitlementId === "CUT_OS_PRO",
    "subscription.entitlementId must remain CUT_OS_PRO",
  );
  for (const field of [
    "subscriptionGroupReferenceName",
    "productReferenceName",
    "productId",
    "priceScheduleEvidenceReference",
    "availabilityEvidenceReference",
    "taxCategory",
  ]) {
    check(
      nullableNonEmptyString(value[field]),
      `subscription.${field} must be null or non-empty`,
    );
  }
  check(
    value.productId === null || /^[A-Za-z0-9._-]+$/u.test(value.productId),
    "subscription.productId must contain only App Store-safe identifier characters",
  );
  check(
    value.duration === null ||
      SUPPORTED_SUBSCRIPTION_DURATIONS.includes(value.duration),
    "subscription.duration must be null or an Apple-supported duration",
  );
  check(
    value.introductoryOfferDecision === null ||
      ["none", "free_trial", "pay_as_you_go", "pay_up_front"].includes(
        value.introductoryOfferDecision,
      ),
    "subscription.introductoryOfferDecision is invalid",
  );
  check(
    value.familySharingDecision === null ||
      ["enabled", "disabled"].includes(value.familySharingDecision),
    "subscription.familySharingDecision must be null, enabled, or disabled",
  );

  const usPricing = value.usPricing;
  check(
    hasExactKeys(usPricing, EXPECTED_US_PRICING_KEYS),
    "subscription.usPricing must contain exactly the required structured US pricing keys",
  );
  check(
    usPricing?.storefront === "US",
    "subscription.usPricing.storefront must remain US",
  );
  check(
    usPricing?.currency === "USD",
    "subscription.usPricing.currency must remain USD",
  );
  check(
    usPricing?.amount === null || fixedTwoDecimalAmount(usPricing?.amount),
    "subscription.usPricing.amount must be null or a two-decimal USD amount string",
  );
  check(
    ["pending", "scheduled", "effective"].includes(usPricing?.effectiveStatus),
    "subscription.usPricing.effectiveStatus must be pending, scheduled, or effective",
  );
  check(
    usPricing?.effectiveAtUtc === null ||
      validIsoTimestamp(usPricing?.effectiveAtUtc),
    "subscription.usPricing.effectiveAtUtc must be null or a UTC ISO timestamp",
  );
  for (const field of [
    "evidenceReference",
    "ownerDecisionRevision",
    "ownerDecisionEvidenceReference",
  ]) {
    check(
      nullableNonEmptyString(usPricing?.[field]),
      `subscription.usPricing.${field} must be null or non-empty`,
    );
  }
  if (usPricing?.effectiveStatus !== "pending") {
    check(
      fixedTwoDecimalAmount(usPricing?.amount) &&
        Number.parseFloat(usPricing.amount) > 0,
      "scheduled or effective US pricing requires a positive two-decimal amount",
    );
    check(
      validIsoTimestamp(usPricing?.effectiveAtUtc),
      "scheduled or effective US pricing requires effectiveAtUtc",
    );
    for (const field of [
      "evidenceReference",
      "ownerDecisionRevision",
      "ownerDecisionEvidenceReference",
    ]) {
      check(
        typeof usPricing?.[field] === "string" &&
          usPricing[field].trim().length > 0,
        `scheduled or effective US pricing requires subscription.usPricing.${field}`,
      );
    }
  }

  const introductoryTerms = value.introductoryOfferTerms;
  check(
    hasExactKeys(introductoryTerms, EXPECTED_INTRODUCTORY_OFFER_TERMS_KEYS),
    "subscription.introductoryOfferTerms must contain exactly the required keys",
  );
  check(
    introductoryTerms?.duration === null ||
      SUPPORTED_SUBSCRIPTION_DURATIONS.includes(introductoryTerms?.duration),
    "subscription.introductoryOfferTerms.duration must be null or an Apple-supported duration",
  );
  check(
    introductoryTerms?.numberOfPeriods === null ||
      (Number.isInteger(introductoryTerms?.numberOfPeriods) &&
        introductoryTerms.numberOfPeriods > 0),
    "subscription.introductoryOfferTerms.numberOfPeriods must be null or a positive integer",
  );
  check(
    introductoryTerms?.priceAmount === null ||
      fixedTwoDecimalAmount(introductoryTerms?.priceAmount),
    "subscription.introductoryOfferTerms.priceAmount must be null or a two-decimal amount string",
  );
  for (const field of ["eligibility", "evidenceReference"]) {
    check(
      nullableNonEmptyString(introductoryTerms?.[field]),
      `subscription.introductoryOfferTerms.${field} must be null or non-empty`,
    );
  }
  if (value.introductoryOfferDecision === "none") {
    for (const field of EXPECTED_INTRODUCTORY_OFFER_TERMS_KEYS) {
      check(
        introductoryTerms?.[field] === null,
        `subscription introductoryOfferDecision none requires introductoryOfferTerms.${field} null`,
      );
    }
  } else if (
    ["free_trial", "pay_as_you_go", "pay_up_front"].includes(
      value.introductoryOfferDecision,
    )
  ) {
    check(
      SUPPORTED_SUBSCRIPTION_DURATIONS.includes(introductoryTerms?.duration),
      "configured introductory offer requires a supported duration",
    );
    check(
      Number.isInteger(introductoryTerms?.numberOfPeriods) &&
        introductoryTerms.numberOfPeriods > 0,
      "configured introductory offer requires numberOfPeriods",
    );
    check(
      fixedTwoDecimalAmount(introductoryTerms?.priceAmount),
      "configured introductory offer requires priceAmount",
    );
    if (value.introductoryOfferDecision === "free_trial") {
      check(
        introductoryTerms?.priceAmount === "0.00",
        "free_trial introductory offer requires priceAmount 0.00",
      );
    } else {
      check(
        Number.parseFloat(introductoryTerms?.priceAmount) > 0,
        "paid introductory offer requires a positive priceAmount",
      );
    }
    for (const field of ["eligibility", "evidenceReference"]) {
      check(
        typeof introductoryTerms?.[field] === "string" &&
          introductoryTerms[field].trim().length > 0,
        `configured introductory offer requires introductoryOfferTerms.${field}`,
      );
    }
  }

  check(
    hasExactKeys(value.localizations, ["en-US"]),
    "subscription.localizations must contain exactly en-US for initial release",
  );
  const localization = value.localizations?.["en-US"];
  check(
    hasExactKeys(localization, [
      "groupDisplayName",
      "productDisplayName",
      "description",
      "appNameDisplayOption",
      "customAppName",
    ]),
    "subscription en-US localization must contain exactly the required fields",
  );
  for (const field of [
    "groupDisplayName",
    "productDisplayName",
    "description",
    "customAppName",
  ]) {
    check(
      nullableNonEmptyString(localization?.[field]),
      `subscription.localizations.en-US.${field} must be null or non-empty`,
    );
  }
  check(
    localization?.appNameDisplayOption === null ||
      ["use_app_name", "custom_name"].includes(
        localization?.appNameDisplayOption,
      ),
    "subscription.localizations.en-US.appNameDisplayOption is invalid",
  );
  if (localization?.appNameDisplayOption === "custom_name") {
    check(
      typeof localization.customAppName === "string" &&
        localization.customAppName.trim().length > 0,
      "subscription custom app-name display option requires customAppName",
    );
  }
  if (localization?.appNameDisplayOption === "use_app_name") {
    check(
      localization.customAppName === null,
      "subscription use_app_name display option requires customAppName null",
    );
  }

  const appStoreConnect = value.appStoreConnect;
  check(
    hasExactKeys(appStoreConnect, [
      "groupStatus",
      "productStatus",
      "firstSubmission",
      "attachedToVersion",
      "reviewNotesConfigured",
      "reviewScreenshotShotId",
      "reviewScreenshotUpload",
    ]),
    "subscription.appStoreConnect must contain exactly the required keys",
  );
  for (const field of ["groupStatus", "productStatus"]) {
    check(
      ["pending", "confirmed_in_app_store_connect"].includes(
        appStoreConnect?.[field],
      ),
      `subscription.appStoreConnect.${field} is invalid`,
    );
  }
  for (const field of [
    "firstSubmission",
    "attachedToVersion",
    "reviewNotesConfigured",
  ]) {
    check(
      typeof appStoreConnect?.[field] === "boolean",
      `subscription.appStoreConnect.${field} must be a boolean`,
    );
  }
  check(
    appStoreConnect?.firstSubmission === true,
    "subscription.appStoreConnect.firstSubmission must remain true for v1",
  );
  check(
    appStoreConnect?.reviewScreenshotShotId === "07-subscription-offer",
    "subscription review screenshot must remain shot 07-subscription-offer",
  );
  const screenshotUpload = appStoreConnect?.reviewScreenshotUpload;
  check(
    hasExactKeys(screenshotUpload, EXPECTED_REVIEW_SCREENSHOT_UPLOAD_KEYS),
    "subscription.appStoreConnect.reviewScreenshotUpload must contain exactly the required keys",
  );
  check(
    ["pending", "uploaded_in_app_store_connect"].includes(
      screenshotUpload?.status,
    ),
    "subscription review screenshot upload status is invalid",
  );
  check(
    screenshotUpload?.shotId === "07-subscription-offer",
    "subscription review screenshot upload must bind shot 07-subscription-offer",
  );
  check(
    screenshotUpload?.sha256 === null ||
      /^[0-9a-f]{64}$/u.test(screenshotUpload?.sha256 ?? ""),
    "subscription review screenshot upload sha256 must be null or lowercase SHA-256",
  );
  check(
    screenshotUpload?.uploadedAtUtc === null ||
      validIsoTimestamp(screenshotUpload?.uploadedAtUtc),
    "subscription review screenshot upload uploadedAtUtc must be null or UTC",
  );
  check(
    nullableNonEmptyString(screenshotUpload?.evidenceReference),
    "subscription review screenshot upload evidenceReference must be null or non-empty",
  );
  if (screenshotUpload?.status === "pending") {
    for (const field of ["sha256", "uploadedAtUtc", "evidenceReference"]) {
      check(
        screenshotUpload?.[field] === null,
        `pending subscription review screenshot upload requires ${field} null`,
      );
    }
  } else if (screenshotUpload?.status === "uploaded_in_app_store_connect") {
    check(
      /^[0-9a-f]{64}$/u.test(screenshotUpload?.sha256 ?? "") &&
        validIsoTimestamp(screenshotUpload?.uploadedAtUtc) &&
        typeof screenshotUpload?.evidenceReference === "string" &&
        screenshotUpload.evidenceReference.trim().length > 0,
      "uploaded subscription review screenshot requires SHA-256, UTC, and evidence",
    );
  }

  check(
    hasExactKeys(value.revenueCat, [
      "productionMappingStatus",
      "evidenceReference",
    ]),
    "subscription.revenueCat must contain exactly the required keys",
  );
  check(
    ["pending", "verified"].includes(value.revenueCat?.productionMappingStatus),
    "subscription.revenueCat.productionMappingStatus must be pending or verified",
  );
  check(
    nullableNonEmptyString(value.revenueCat?.evidenceReference),
    "subscription.revenueCat.evidenceReference must be null or non-empty",
  );
  if (value.revenueCat?.productionMappingStatus === "verified") {
    check(
      typeof value.revenueCat?.evidenceReference === "string" &&
        value.revenueCat.evidenceReference.trim().length > 0,
      "verified subscription RevenueCat mapping requires evidence",
    );
  }

  const exactBuild = value.exactBuildEvidence;
  check(
    hasExactKeys(exactBuild, EXPECTED_SUBSCRIPTION_EXACT_BUILD_KEYS),
    "subscription.exactBuildEvidence must contain exactly the required keys",
  );
  const approvalRequired = release || value.status === "ready_for_submission";
  validateExactBuildIdentity({
    value: exactBuild,
    label: "subscription.exactBuildEvidence",
    expectedAppVersion: listing?.appVersion,
    required: approvalRequired,
    check,
  });
  for (const field of [
    "storeKitOfferStatus",
    "purchaseQaStatus",
    "testFlightStatus",
  ]) {
    check(
      ["pending", "verified"].includes(exactBuild?.[field]),
      `subscription.exactBuildEvidence.${field} must be pending or verified`,
    );
  }
  check(
    exactBuild?.testedAtUtc === null ||
      validIsoTimestamp(exactBuild.testedAtUtc),
    "subscription.exactBuildEvidence.testedAtUtc must be null or a UTC ISO timestamp",
  );
  check(
    nullableNonEmptyString(exactBuild?.evidenceReference),
    "subscription.exactBuildEvidence.evidenceReference must be null or non-empty",
  );
  if (
    ["storeKitOfferStatus", "purchaseQaStatus", "testFlightStatus"].some(
      (field) => exactBuild?.[field] === "verified",
    )
  ) {
    check(
      validIsoTimestamp(exactBuild?.testedAtUtc) &&
        typeof exactBuild?.evidenceReference === "string" &&
        exactBuild.evidenceReference.trim().length > 0,
      "verified subscription exact-build status requires UTC evidence",
    );
  }

  validateApprovalRecord({
    approval: value.approval,
    expectedKeys: EXPECTED_SUBSCRIPTION_APPROVAL_KEYS,
    label: "subscription.approval",
    release: approvalRequired,
    check,
  });
  if (!approvalRequired) return;

  const prefix = release ? "release mode" : "ready subscription";
  check(
    value.status === "ready_for_submission",
    `${prefix} requires subscription.status ready_for_submission`,
  );
  for (const field of [
    "subscriptionGroupReferenceName",
    "productReferenceName",
    "productId",
    "duration",
    "priceScheduleEvidenceReference",
    "availabilityEvidenceReference",
    "introductoryOfferDecision",
    "familySharingDecision",
    "taxCategory",
  ]) {
    check(
      value[field] !== null && value[field] !== "",
      `${prefix} requires subscription.${field}`,
    );
  }
  check(
    ["scheduled", "effective"].includes(usPricing?.effectiveStatus) &&
      fixedTwoDecimalAmount(usPricing?.amount) &&
      Number.parseFloat(usPricing.amount) > 0 &&
      validIsoTimestamp(usPricing?.effectiveAtUtc),
    `${prefix} requires scheduled or effective structured US pricing`,
  );
  for (const field of [
    "evidenceReference",
    "ownerDecisionRevision",
    "ownerDecisionEvidenceReference",
  ]) {
    check(
      typeof usPricing?.[field] === "string" &&
        usPricing[field].trim().length > 0,
      `${prefix} requires subscription.usPricing.${field}`,
    );
  }
  for (const field of [
    "groupDisplayName",
    "productDisplayName",
    "description",
    "appNameDisplayOption",
  ]) {
    check(
      localization?.[field] !== null && localization?.[field] !== "",
      `${prefix} requires subscription.localizations.en-US.${field}`,
    );
  }
  for (const field of ["groupStatus", "productStatus"]) {
    check(
      appStoreConnect?.[field] === "confirmed_in_app_store_connect",
      `${prefix} requires subscription.appStoreConnect.${field} confirmation`,
    );
  }
  for (const field of ["attachedToVersion", "reviewNotesConfigured"]) {
    check(
      appStoreConnect?.[field] === true,
      `${prefix} requires subscription.appStoreConnect.${field}`,
    );
  }
  check(
    screenshotUpload?.status === "uploaded_in_app_store_connect",
    `${prefix} requires subscription review screenshot uploaded in App Store Connect`,
  );
  check(
    value.revenueCat?.productionMappingStatus === "verified" &&
      typeof value.revenueCat?.evidenceReference === "string" &&
      value.revenueCat.evidenceReference.trim().length > 0,
    `${prefix} requires verified RevenueCat production mapping evidence`,
  );
  for (const field of [
    "storeKitOfferStatus",
    "purchaseQaStatus",
    "testFlightStatus",
  ]) {
    check(
      exactBuild?.[field] === "verified",
      `${prefix} requires subscription.exactBuildEvidence.${field} verified`,
    );
  }
  check(
    validIsoTimestamp(exactBuild?.testedAtUtc) &&
      typeof exactBuild?.evidenceReference === "string" &&
      exactBuild.evidenceReference.trim().length > 0,
    `${prefix} requires subscription exact-build UTC evidence`,
  );
}

function validateAccessibility({ value, listing, release, check }) {
  check(isObject(value), "submission.accessibility must be an object");
  if (!isObject(value)) return;

  check(
    hasExactKeys(value, EXPECTED_ACCESSIBILITY_KEYS),
    "accessibility must contain exactly the required keys",
  );
  check(
    [
      "pending_exact_build_common_task_evaluation",
      "evaluated_for_release",
    ].includes(value.status),
    "accessibility.status must remain pending or be evaluated_for_release",
  );
  check(value.device === "iPhone", "accessibility.device must remain iPhone");
  check(
    value.source === ACCESSIBILITY_SOURCE,
    "accessibility must retain Apple's Accessibility Nutrition Label source",
  );
  check(
    value.accessibilityUrl === null || validHttpsUrl(value.accessibilityUrl),
    "accessibility.accessibilityUrl must be null or HTTPS",
  );
  const appStoreConnectDecision = value.appStoreConnectDecision;
  const appStoreConnectDecisionConfirmed =
    appStoreConnectDecision?.status === "confirmed_in_app_store_connect";
  const approvalRequired =
    release ||
    value.status === "evaluated_for_release" ||
    appStoreConnectDecisionConfirmed;
  const exactBuild = value.exactBuildEvidence;
  check(
    hasExactKeys(exactBuild, EXPECTED_ACCESSIBILITY_EXACT_BUILD_KEYS),
    "accessibility.exactBuildEvidence must contain exactly the required keys",
  );
  validateExactBuildIdentity({
    value: exactBuild,
    label: "accessibility.exactBuildEvidence",
    expectedAppVersion: listing?.appVersion,
    required: approvalRequired,
    check,
  });
  check(
    exactBuild?.testedAtUtc === null ||
      validIsoTimestamp(exactBuild?.testedAtUtc),
    "accessibility.exactBuildEvidence.testedAtUtc must be null or a UTC ISO timestamp",
  );
  check(
    nullableNonEmptyString(exactBuild?.evidenceReference),
    "accessibility.exactBuildEvidence.evidenceReference must be null or non-empty",
  );
  check(
    hasExactKeys(value.commonTasks, EXPECTED_ACCESSIBILITY_TASK_KEYS),
    "accessibility.commonTasks must contain exactly the required common tasks",
  );
  for (const key of EXPECTED_ACCESSIBILITY_TASK_KEYS) {
    validatePendingEvidenceRecord({
      value: value.commonTasks?.[key],
      label: `accessibility.commonTasks.${key}`,
      release: approvalRequired,
      check,
    });
  }
  check(
    hasExactKeys(value.features, EXPECTED_ACCESSIBILITY_FEATURE_KEYS),
    "accessibility.features must contain exactly Apple's nine feature labels",
  );
  for (const key of EXPECTED_ACCESSIBILITY_FEATURE_KEYS) {
    const feature = value.features?.[key];
    const label = `accessibility.features.${key}`;
    check(
      hasExactKeys(feature, [
        "status",
        "commonTasksVerified",
        "evidenceReference",
      ]),
      `${label} must contain exactly status, commonTasksVerified, and evidenceReference`,
    );
    const completedStatuses = [
      "verified_supported",
      "verified_not_supported",
      "not_applicable_no_media",
    ];
    check(
      ["pending", ...completedStatuses].includes(feature?.status),
      `${label}.status is invalid`,
    );
    check(
      Array.isArray(feature?.commonTasksVerified) &&
        feature.commonTasksVerified.every((task) =>
          EXPECTED_ACCESSIBILITY_TASK_KEYS.includes(task),
        ) &&
        new Set(feature.commonTasksVerified).size ===
          feature.commonTasksVerified.length,
      `${label}.commonTasksVerified must contain unique known common-task IDs`,
    );
    check(
      nullableNonEmptyString(feature?.evidenceReference),
      `${label}.evidenceReference must be null or non-empty`,
    );
    if (feature?.status === "verified_supported") {
      check(
        arraysEqual(
          feature?.commonTasksVerified,
          EXPECTED_ACCESSIBILITY_TASK_KEYS,
        ),
        `${label} verified_supported must cover every expected common task in canonical order`,
      );
    } else {
      check(
        Array.isArray(feature?.commonTasksVerified) &&
          feature.commonTasksVerified.length === 0,
        `${label} may list common tasks only when status is verified_supported`,
      );
    }
    if (feature?.status === "not_applicable_no_media") {
      check(
        ["captions", "audioDescriptions"].includes(key),
        `${label} may use not_applicable_no_media only for Captions or Audio Descriptions`,
      );
    }
    if (approvalRequired || completedStatuses.includes(feature?.status)) {
      check(
        completedStatuses.includes(feature?.status),
        `release mode requires ${label} completed evidence status`,
      );
      check(
        typeof feature?.evidenceReference === "string" &&
          feature.evidenceReference.trim().length > 0,
        `release mode requires ${label}.evidenceReference`,
      );
    }
  }
  check(
    hasExactKeys(
      appStoreConnectDecision,
      EXPECTED_ACCESSIBILITY_ASC_DECISION_KEYS,
    ),
    "accessibility.appStoreConnectDecision must contain exactly the required keys",
  );
  check(
    ["pending", "confirmed_in_app_store_connect"].includes(
      appStoreConnectDecision?.status,
    ),
    "accessibility.appStoreConnectDecision.status is invalid",
  );
  check(
    appStoreConnectDecision?.decision === null ||
      [
        "drafted_verified_support",
        "support_not_indicated_for_initial_release",
      ].includes(appStoreConnectDecision?.decision),
    "accessibility.appStoreConnectDecision.decision is invalid",
  );
  check(
    appStoreConnectDecision?.savedAtUtc === null ||
      validIsoTimestamp(appStoreConnectDecision?.savedAtUtc),
    "accessibility.appStoreConnectDecision.savedAtUtc must be null or a UTC ISO timestamp",
  );
  check(
    nullableNonEmptyString(appStoreConnectDecision?.evidenceReference),
    "accessibility.appStoreConnectDecision.evidenceReference must be null or non-empty",
  );
  if (appStoreConnectDecision?.decision === "drafted_verified_support") {
    check(
      EXPECTED_ACCESSIBILITY_FEATURE_KEYS.some(
        (key) => value.features?.[key]?.status === "verified_supported",
      ),
      "accessibility drafted_verified_support requires at least one verified_supported feature",
    );
  }
  validateApprovalRecord({
    approval: value.approval,
    expectedKeys: EXPECTED_ACCESSIBILITY_APPROVAL_KEYS,
    label: "accessibility.approval",
    release: approvalRequired,
    check,
  });
  if (!approvalRequired) return;

  const prefix = release ? "release mode" : "evaluated accessibility";
  check(
    value.status === "evaluated_for_release",
    `${prefix} requires accessibility.status evaluated_for_release`,
  );
  check(
    appStoreConnectDecision?.status === "confirmed_in_app_store_connect",
    `${prefix} requires accessibility decision saved in App Store Connect`,
  );
  check(
    [
      "drafted_verified_support",
      "support_not_indicated_for_initial_release",
    ].includes(appStoreConnectDecision?.decision),
    `${prefix} requires an accessibility App Store Connect decision`,
  );
  check(
    validIsoTimestamp(appStoreConnectDecision?.savedAtUtc) &&
      typeof appStoreConnectDecision?.evidenceReference === "string" &&
      appStoreConnectDecision.evidenceReference.trim().length > 0,
    `${prefix} requires accessibility App Store Connect saved UTC evidence`,
  );
  check(
    validIsoTimestamp(exactBuild?.testedAtUtc) &&
      typeof exactBuild?.evidenceReference === "string" &&
      exactBuild.evidenceReference.trim().length > 0,
    `${prefix} requires accessibility exact-build UTC evidence`,
  );
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

function manifestRequiredReasonApis(appConfig) {
  const entries =
    appConfig?.expo?.ios?.privacyManifests?.NSPrivacyAccessedAPITypes;
  if (!Array.isArray(entries)) return entries;
  return entries.map((entry) => ({
    type: entry?.NSPrivacyAccessedAPIType,
    reasons: entry?.NSPrivacyAccessedAPITypeReasons,
  }));
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
  notesTemplateSha256 = null,
  clock = () => new Date(),
  release = false,
}) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const nowMs = currentTimeMilliseconds(clock);
  check(
    Number.isFinite(nowMs),
    "App Store validation clock must return a valid time",
  );

  check(isObject(submission), "submission must be an object");
  if (!isObject(submission)) return errors;
  check(
    hasExactKeys(submission, EXPECTED_SUBMISSION_KEYS),
    "submission must contain exactly the required top-level keys",
  );
  check(submission?.schemaVersion === 1, "submission.schemaVersion must be 1");
  check(
    submission?.status === "working_not_approved" ||
      submission?.status === "approved_for_submission",
    "submission.status is invalid",
  );
  release = release || submission.status === "approved_for_submission";
  check(
    /^\d{4}-\d{2}-\d{2}$/u.test(submission.updated ?? "") &&
      !Number.isNaN(Date.parse(`${submission.updated}T00:00:00Z`)),
    "submission.updated must be an ISO calendar date",
  );
  check(
    hasExactKeys(submission.references, EXPECTED_SUBMISSION_REFERENCE_KEYS),
    "submission.references must contain exactly the required keys",
  );
  const expectedReferences = {
    humanRecord: "APP_STORE_METADATA.md",
    appConfig: "artifacts/cut-os/app.json",
    privacyDataMap: "PRIVACY_DATA_MAP.md",
    reviewRunbook: "APP_REVIEW_RUNBOOK.md",
    testFlightRecord: "app-store/testflight-submission.json",
    screenshotManifest: "app-store/screenshots/manifest.json",
  };
  for (const [key, expected] of Object.entries(expectedReferences)) {
    check(
      submission.references?.[key] === expected,
      `submission.references.${key} must remain ${expected}`,
    );
  }
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
      hasExactKeys(availability, ["status", "approval"]),
      "availability must contain exactly status and approval",
    );
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
      release:
        release || availability.status === "confirmed_in_app_store_connect",
      check,
    });
    if (availability.status === "confirmed_in_app_store_connect") {
      check(
        validatedInitialTerritories.length > 0,
        "confirmed availability requires at least one valid initial territory",
      );
    }
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

  validateCommercialAndLegal({
    value: submission.commercialAndLegal,
    release,
    check,
  });
  if (
    submission.commercialAndLegal?.dsaStatus ===
      "not_applicable_no_eu_distribution" &&
    validatedInitialTerritories.some((territory) =>
      EU_TERRITORY_CODES.includes(territory),
    )
  ) {
    errors.push(
      "commercialAndLegal.dsaStatus cannot claim no EU distribution while an EU territory is selected",
    );
  }
  validateAppReview({
    value: submission.appReview,
    listing,
    release,
    nowMs,
    notesTemplateSha256,
    check,
  });
  validateSubscription({
    value: submission.subscription,
    listing,
    release,
    check,
  });
  validateAccessibility({
    value: submission.accessibility,
    listing,
    release,
    check,
  });

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
      hasExactKeys(ageRating, EXPECTED_AGE_RATING_KEYS),
      "ageRating must contain exactly the required keys",
    );
    check(
      ageRating.targetAudience === "18_plus",
      "target audience must be 18_plus",
    );
    check(
      ageRating.questionnaireSource === AGE_QUESTIONNAIRE_SOURCE,
      "ageRating must retain Apple's current questionnaire source",
    );
    const savedQuestionnaireEvidence = ageRating.savedQuestionnaireEvidence;
    check(
      hasExactKeys(savedQuestionnaireEvidence, [
        "status",
        "questionnaireVersionOrRevision",
        "calculatedRating",
        "effectiveRatingAfterOverride",
        "confirmedAtUtc",
        "evidenceReference",
      ]),
      "ageRating.savedQuestionnaireEvidence must contain exactly the required keys",
    );
    check(
      ["pending_app_store_connect", "confirmed_in_app_store_connect"].includes(
        savedQuestionnaireEvidence?.status,
      ),
      "ageRating.savedQuestionnaireEvidence.status must remain pending or be confirmed in App Store Connect",
    );
    for (const field of [
      "questionnaireVersionOrRevision",
      "calculatedRating",
      "effectiveRatingAfterOverride",
      "evidenceReference",
    ]) {
      check(
        nullableNonEmptyString(savedQuestionnaireEvidence?.[field]),
        `ageRating.savedQuestionnaireEvidence.${field} must be null or non-empty`,
      );
    }
    for (const field of ["calculatedRating", "effectiveRatingAfterOverride"]) {
      check(
        savedQuestionnaireEvidence?.[field] === null ||
          CURRENT_APPLE_AGE_RATING_VALUES.includes(
            savedQuestionnaireEvidence?.[field],
          ),
        `ageRating.savedQuestionnaireEvidence.${field} must be null or a current Apple age-rating value`,
      );
    }
    check(
      savedQuestionnaireEvidence?.confirmedAtUtc === null ||
        validIsoTimestamp(savedQuestionnaireEvidence?.confirmedAtUtc),
      "ageRating.savedQuestionnaireEvidence.confirmedAtUtc must be null or a UTC ISO timestamp",
    );
    const questionnaireEvidenceRequired =
      release ||
      savedQuestionnaireEvidence?.status === "confirmed_in_app_store_connect";
    if (questionnaireEvidenceRequired) {
      check(
        savedQuestionnaireEvidence?.status === "confirmed_in_app_store_connect",
        "release mode requires saved App Store Connect age-questionnaire evidence",
      );
      for (const field of [
        "questionnaireVersionOrRevision",
        "calculatedRating",
        "effectiveRatingAfterOverride",
        "evidenceReference",
      ]) {
        check(
          typeof savedQuestionnaireEvidence?.[field] === "string" &&
            savedQuestionnaireEvidence[field].trim().length > 0,
          `release mode requires ageRating.savedQuestionnaireEvidence.${field}`,
        );
      }
      check(
        validIsoTimestamp(savedQuestionnaireEvidence?.confirmedAtUtc),
        "release mode requires ageRating.savedQuestionnaireEvidence.confirmedAtUtc",
      );
      check(
        savedQuestionnaireEvidence?.calculatedRating !== "Unrated",
        "App Store release cannot use an Unrated calculated age rating",
      );
      check(
        savedQuestionnaireEvidence?.effectiveRatingAfterOverride === "18+",
        "App Store release requires effective post-override age rating 18+",
      );
    }
    const answers = Array.isArray(ageRating.workingAnswers)
      ? ageRating.workingAnswers
      : [];
    check(
      answers.length === Object.keys(EXPECTED_AGE_ANSWERS).length,
      "ageRating.workingAnswers must contain the complete v1 answer set",
    );
    check(
      arraysEqual(
        answers.map((answer) => answer?.id),
        Object.keys(EXPECTED_AGE_ANSWERS),
      ),
      "ageRating.workingAnswers must preserve the canonical questionnaire order",
    );
    for (const [id, expectedAnswer] of Object.entries(EXPECTED_AGE_ANSWERS)) {
      const entry = answers.find((answer) => answer?.id === id);
      check(Boolean(entry), `missing provisional age answer ${id}`);
      if (!entry) continue;
      check(
        hasExactKeys(entry, EXPECTED_AGE_ANSWER_KEYS),
        `${id} must contain exactly the required age-answer keys`,
      );
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
      hasExactKeys(ageRating.higherAgeOverride, ["target", "status", "basis"]),
      "ageRating.higherAgeOverride must contain exactly the required keys",
    );
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
      hasExactKeys(privacy, EXPECTED_PRIVACY_KEYS),
      "privacy must contain exactly the required keys",
    );
    check(
      [
        "provisional_pending_production_reconciliation",
        "confirmed_for_submission",
      ].includes(privacy.status),
      "privacy.status must remain provisional or be confirmed_for_submission",
    );
    check(
      privacy.manifestPath === "artifacts/cut-os/app.json",
      "privacy.manifestPath must remain artifacts/cut-os/app.json",
    );
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

    const actualRequiredReasonApis = manifestRequiredReasonApis(appConfig);
    const workingRequiredReasonApis = Array.isArray(privacy.requiredReasonApis)
      ? privacy.requiredReasonApis
      : [];
    check(
      Array.isArray(actualRequiredReasonApis) &&
        workingRequiredReasonApis.length === actualRequiredReasonApis.length,
      "privacy.requiredReasonApis must contain exactly the app-manifest required-reason API entries",
    );
    if (Array.isArray(actualRequiredReasonApis)) {
      actualRequiredReasonApis.forEach((manifestEntry, index) => {
        const workingEntry = workingRequiredReasonApis[index];
        check(
          hasExactKeys(workingEntry, ["type", "reasons"]),
          `privacy.requiredReasonApis[${index}] must contain exactly type and reasons`,
        );
        check(
          workingEntry?.type === manifestEntry.type,
          `privacy.requiredReasonApis[${index}] type must match app.json`,
        );
        check(
          arraysEqual(workingEntry?.reasons, manifestEntry.reasons),
          `privacy.requiredReasonApis[${index}] reasons must match app.json`,
        );
      });
    }

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
    for (const gate of externalGates) {
      check(
        hasExactKeys(gate, ["id", "status", "requiredEvidence"]),
        `privacy gate ${gate?.id} must contain exactly the required keys`,
      );
      check(
        typeof gate?.requiredEvidence === "string" &&
          gate.requiredEvidence.trim().length > 20,
        `privacy gate ${gate?.id} must describe its required evidence`,
      );
    }
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
    const privacyApprovalRequired =
      release || privacy.status === "confirmed_for_submission";
    if (privacyApprovalRequired) {
      check(
        privacy.status === "confirmed_for_submission",
        "release mode requires privacy.status confirmed_for_submission",
      );
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

export function validateTestFlightSubmission({
  record,
  expectedAppVersion,
  release = false,
}) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  check(isObject(record), "TestFlight submission must be an object");
  if (!isObject(record)) return errors;
  check(
    hasExactKeys(record, EXPECTED_TESTFLIGHT_KEYS),
    "TestFlight submission must contain exactly the required keys",
  );
  check(record.schemaVersion === 1, "TestFlight schemaVersion must be 1");
  check(
    ["working_not_approved", "ready_for_app_review"].includes(record.status),
    "TestFlight status must be working_not_approved or ready_for_app_review",
  );
  check(
    /^\d{4}-\d{2}-\d{2}$/u.test(record.updated ?? "") &&
      !Number.isNaN(Date.parse(`${record.updated}T00:00:00Z`)),
    "TestFlight updated must be an ISO calendar date",
  );
  check(
    ["internal_only", "external_testing"].includes(record.distributionScope),
    "TestFlight distributionScope must be internal_only or external_testing",
  );
  for (const field of ["betaAppDescription", "whatToTest"]) {
    check(
      typeof record[field] === "string" && record[field].trim().length > 0,
      `TestFlight ${field} must be non-empty`,
    );
    check(
      typeof record[field] === "string" &&
        Buffer.byteLength(record[field], "utf8") <= 4000,
      `TestFlight ${field} must be 4,000 UTF-8 bytes or fewer`,
    );
  }
  check(
    typeof record.feedbackEmailConfiguredInAppStoreConnect === "boolean",
    "TestFlight feedbackEmailConfiguredInAppStoreConnect must be a boolean",
  );

  const externalBetaReview = record.externalBetaReview;
  check(
    hasExactKeys(externalBetaReview, EXPECTED_EXTERNAL_BETA_REVIEW_KEYS),
    "TestFlight externalBetaReview must contain exactly the required keys",
  );
  for (const key of EXPECTED_EXTERNAL_BETA_REVIEW_KEYS) {
    check(
      typeof externalBetaReview?.[key] === "boolean",
      `TestFlight externalBetaReview.${key} must be a boolean`,
    );
  }
  const externalTesting = record.distributionScope === "external_testing";
  check(
    externalBetaReview?.required === externalTesting,
    "TestFlight externalBetaReview.required must match distributionScope",
  );

  const exactBuild = record.exactBuildEvidence;
  check(
    hasExactKeys(exactBuild, EXPECTED_TESTFLIGHT_BUILD_EVIDENCE_KEYS),
    "TestFlight exactBuildEvidence must contain exactly the required keys",
  );
  const ready = release || record.status === "ready_for_app_review";
  validateExactBuildIdentity({
    value: exactBuild,
    label: "TestFlight exactBuildEvidence",
    expectedAppVersion,
    required: ready,
    check,
  });
  for (const field of [
    "qaReportReference",
    "purchaseQaReportReference",
    "appReviewRunbookReference",
  ]) {
    check(
      nullableNonEmptyString(exactBuild?.[field]),
      `TestFlight exactBuildEvidence.${field} must be null or non-empty`,
    );
  }
  check(
    typeof exactBuild?.internalGroupConfigured === "boolean",
    "TestFlight exactBuildEvidence.internalGroupConfigured must be a boolean",
  );
  check(
    exactBuild?.testedAtUtc === null ||
      validIsoTimestamp(exactBuild?.testedAtUtc),
    "TestFlight exactBuildEvidence.testedAtUtc must be null or a UTC ISO timestamp",
  );

  validateApprovalRecord({
    approval: record.approval,
    expectedKeys: EXPECTED_TESTFLIGHT_APPROVAL_KEYS,
    label: "TestFlight approval",
    release: ready,
    check,
  });

  const externalReviewConfigured =
    externalBetaReview?.contactConfigured === true &&
    externalBetaReview?.primaryDemoAccountConfigured === true &&
    externalBetaReview?.notesConfigured === true;
  if (
    externalTesting &&
    (release || record.status === "ready_for_app_review")
  ) {
    check(
      externalReviewConfigured,
      "external TestFlight testing requires complete TestFlight App Review configuration",
    );
  }

  if (ready) {
    const prefix = release ? "release mode" : "ready TestFlight submission";
    check(
      record.status === "ready_for_app_review",
      `${prefix} requires TestFlight status ready_for_app_review`,
    );
    check(
      record.feedbackEmailConfiguredInAppStoreConnect === true,
      `${prefix} requires the TestFlight feedback email configured in App Store Connect`,
    );
    check(
      typeof exactBuild?.buildNumber === "string" &&
        exactBuild.buildNumber.trim().length > 0,
      `${prefix} requires TestFlight exactBuildEvidence.buildNumber`,
    );
    check(
      /^[0-9a-f]{40}$/u.test(exactBuild?.gitCommit ?? ""),
      `${prefix} requires a full lowercase Git SHA in TestFlight exactBuildEvidence.gitCommit`,
    );
    check(
      exactBuild?.internalGroupConfigured === true,
      `${prefix} requires a configured internal TestFlight group`,
    );
    check(
      validIsoTimestamp(exactBuild?.testedAtUtc),
      `${prefix} requires TestFlight exactBuildEvidence.testedAtUtc`,
    );
    for (const field of [
      "qaReportReference",
      "purchaseQaReportReference",
      "appReviewRunbookReference",
    ]) {
      check(
        typeof exactBuild?.[field] === "string" &&
          exactBuild[field].trim().length > 0,
        `${prefix} requires TestFlight exactBuildEvidence.${field}`,
      );
    }
  }

  return errors;
}

export function validateExactBuildBindings({
  submission,
  testFlightSubmission,
  screenshotManifest,
}) {
  const errors = [];
  const canonical = testFlightSubmission?.exactBuildEvidence;
  const consumers = [
    ["appReview.exactBuild", submission?.appReview?.exactBuild],
    ["screenshots.captureDefaults", screenshotManifest?.captureDefaults],
    [
      "subscription.exactBuildEvidence",
      submission?.subscription?.exactBuildEvidence,
    ],
    [
      "accessibility.exactBuildEvidence",
      submission?.accessibility?.exactBuildEvidence,
    ],
  ];

  for (const [label, consumer] of consumers) {
    for (const field of EXACT_BUILD_IDENTITY_FIELDS) {
      if (consumer?.[field] !== canonical?.[field]) {
        errors.push(
          `${label}.${field} must exactly match TestFlight exactBuildEvidence.${field}`,
        );
      }
    }
  }

  const shot07 = screenshotManifest?.shots?.find(
    (shot) => shot?.id === "07-subscription-offer",
  );
  const upload =
    submission?.subscription?.appStoreConnect?.reviewScreenshotUpload;
  if (
    upload?.status === "uploaded_in_app_store_connect" ||
    upload?.sha256 !== null
  ) {
    if (
      typeof shot07?.sha256 !== "string" ||
      upload?.sha256 !== shot07.sha256
    ) {
      errors.push(
        "subscription review screenshot upload sha256 must exactly match captured shot 07-subscription-offer",
      );
    }
  }

  return errors;
}

function appReviewNotesDraftBlock(markdown) {
  const errors = [];
  const headingMatch = /^## App Review notes draft\s*$/mu.exec(markdown ?? "");
  if (!headingMatch) {
    return {
      block: null,
      errors: ["APP_REVIEW_RUNBOOK.md must contain an App Review notes draft"],
    };
  }
  const afterHeading = (markdown ?? "").slice(
    headingMatch.index + headingMatch[0].length,
  );
  const nextHeadingIndex = afterHeading.search(/^##\s+/mu);
  const section =
    nextHeadingIndex === -1
      ? afterHeading
      : afterHeading.slice(0, nextHeadingIndex);
  const block = /```text\s*\r?\n([\s\S]*?)\r?\n```/u.exec(section)?.[1];
  if (typeof block !== "string") {
    errors.push(
      "APP_REVIEW_RUNBOOK.md App Review notes draft must contain a text fence",
    );
    return { block: null, errors };
  }
  return { block, errors };
}

export function appReviewNotesTemplateSha256({ markdown }) {
  const { block, errors } = appReviewNotesDraftBlock(markdown);
  if (errors.length > 0 || typeof block !== "string") return null;
  return createHash("sha256").update(block, "utf8").digest("hex");
}

export function validateAppReviewNotesDraft({ markdown }) {
  const { block, errors } = appReviewNotesDraftBlock(markdown);
  if (errors.length > 0 || typeof block !== "string") return errors;
  const bytes = Buffer.byteLength(block, "utf8");
  if (bytes > 4000) {
    errors.push(
      `App Review notes draft must be 4,000 UTF-8 bytes or fewer (found ${bytes})`,
    );
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

function isRegularScreenshotFile({
  repoRoot,
  assetDirectory,
  imagePath,
  lstatFile,
  realpathFile,
}) {
  try {
    const assetStat = lstatFile(assetDirectory);
    const imageStat = lstatFile(imagePath);
    if (
      !assetStat.isDirectory() ||
      assetStat.isSymbolicLink() ||
      !imageStat.isFile() ||
      imageStat.isSymbolicLink()
    ) {
      return false;
    }

    const realRepoRoot = realpathFile(path.resolve(repoRoot));
    const expectedRealAssetDirectory = path.join(
      realRepoRoot,
      "app-store/screenshots/files",
    );
    const realAssetDirectory = realpathFile(assetDirectory);
    const realImagePath = realpathFile(imagePath);
    return (
      realAssetDirectory === expectedRealAssetDirectory &&
      realImagePath.startsWith(`${realAssetDirectory}${path.sep}`) &&
      path.dirname(realImagePath) === realAssetDirectory
    );
  } catch {
    return false;
  }
}

export function validateScreenshotManifest({
  manifest,
  repoRoot = DEFAULT_REPO_ROOT,
  release = false,
  readFile = fs.readFileSync,
  fileExists = fs.existsSync,
  lstatFile = fs.lstatSync,
  realpathFile = fs.realpathSync,
}) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  release = release || manifest?.status === "approved_for_submission";

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
      hasExactKeys(defaults, EXPECTED_SCREENSHOT_CAPTURE_DEFAULT_KEYS),
      "screenshots.captureDefaults must contain exactly the required keys",
    );
    check(
      defaults.locale === "en-US",
      "initial screenshot locale must be en-US",
    );
    check(
      defaults.appStoreConnectDeviceSlot === "iPhone 6.9-inch portrait",
      "capture device slot must match the technical requirement",
    );
    validateExactBuildIdentity({
      value: defaults,
      label: "screenshots.captureDefaults",
      expectedAppVersion: defaults.appVersion,
      required: release,
      check,
    });
    if (release) {
      for (const field of [
        "appVersion",
        "buildNumber",
        "gitCommit",
        "easBuildId",
        "appStoreConnectBuildId",
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
    check(
      hasExactKeys(shot, EXPECTED_SCREENSHOT_SHOT_KEYS),
      `${label} must contain exactly the required screenshot keys`,
    );
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
    check(
      hasExactKeys(shot?.piiReview, EXPECTED_SCREENSHOT_PII_REVIEW_KEYS),
      `${label} PII review must contain exactly the required keys`,
    );
    check(
      ["pending", "approved_no_personal_data"].includes(
        shot?.piiReview?.status,
      ),
      `${label} PII review status must be pending or approved_no_personal_data`,
    );
    check(
      shot?.piiReview?.reviewedSha256 === null ||
        /^[0-9a-f]{64}$/u.test(shot?.piiReview?.reviewedSha256 ?? ""),
      `${label} PII reviewedSha256 must be null or lowercase SHA-256`,
    );
    check(
      nullableNonEmptyString(shot?.piiReview?.reviewer),
      `${label} PII reviewer must be null or non-empty`,
    );
    check(
      shot?.piiReview?.reviewedAtUtc === null ||
        validIsoTimestamp(shot?.piiReview?.reviewedAtUtc),
      `${label} PII reviewedAtUtc must be null or UTC`,
    );
    check(
      nullableNonEmptyString(shot?.piiReview?.notes),
      `${label} PII notes must be null or non-empty`,
    );
    if (shot?.piiReview?.status === "pending") {
      check(
        shot?.piiReview?.reviewedSha256 === null,
        `${label} pending PII review must keep reviewedSha256 null`,
      );
    }

    if (shot?.file === null) {
      check(
        shot?.sha256 === null,
        `${label} cannot have SHA-256 without a file`,
      );
      check(
        shot?.evidenceReference === null,
        `${label} cannot have evidence without an image file`,
      );
      check(
        shot?.piiReview?.status === "pending",
        `${label} without a file must keep PII review pending`,
      );
      check(
        shot?.piiReview?.reviewedSha256 === null,
        `${label} without a file must keep PII reviewedSha256 null`,
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
    const assetDirectory = path.resolve(
      repoRoot,
      manifest.assetDirectory ?? "",
    );
    const regularContainedFile = isRegularScreenshotFile({
      repoRoot,
      assetDirectory,
      imagePath,
      lstatFile,
      realpathFile,
    });
    check(
      regularContainedFile,
      `${label} image must be a regular non-symlink file inside the exact asset directory`,
    );
    if (!regularContainedFile) return;
    check(
      shot.sha256 === null || /^[0-9a-f]{64}$/u.test(shot.sha256),
      `${label} sha256 must be null or 64 lowercase hexadecimal characters`,
    );
    if (shot?.piiReview?.status === "approved_no_personal_data") {
      check(
        typeof shot.sha256 === "string" &&
          shot.piiReview.reviewedSha256 === shot.sha256,
        `${label} PII approval reviewedSha256 must equal the captured image sha256`,
      );
      check(
        typeof shot.piiReview.reviewer === "string" &&
          shot.piiReview.reviewer.trim().length > 0,
        `${label} approved PII review requires a reviewer`,
      );
      check(
        validIsoTimestamp(shot.piiReview.reviewedAtUtc),
        `${label} approved PII review requires a UTC timestamp`,
      );
    }

    check(
      !capturedFiles.has(shot.file),
      "captured screenshot filenames must be unique",
    );
    capturedFiles.add(shot.file);

    try {
      const imageBuffer = readFile(imagePath);
      const actualSha256 = createHash("sha256")
        .update(imageBuffer)
        .digest("hex");
      if (shot.sha256 !== null && /^[0-9a-f]{64}$/u.test(shot.sha256)) {
        check(
          shot.sha256 === actualSha256,
          `${label} sha256 does not match the captured image bytes`,
        );
      }
      const inspection = inspectImage(imageBuffer, extension);
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
        typeof shot.sha256 === "string" && /^[0-9a-f]{64}$/u.test(shot.sha256),
        `release mode requires a SHA-256 digest for ${label}`,
      );
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
  clock = () => new Date(),
} = {}) {
  const submission = readJson(
    path.join(repoRoot, "app-store/app-store-submission.json"),
  );
  const screenshotManifest = readJson(
    path.join(repoRoot, "app-store/screenshots/manifest.json"),
  );
  const testFlightSubmission = readJson(
    path.join(repoRoot, "app-store/testflight-submission.json"),
  );
  const releaseRequired =
    release || submission?.status === "approved_for_submission";
  const appConfig = readJson(path.join(repoRoot, "artifacts/cut-os/app.json"));
  const easConfig = readJson(path.join(repoRoot, "artifacts/cut-os/eas.json"));
  const territoryCatalog = readJson(
    path.join(repoRoot, "app-store/app-store-connect-territories.json"),
  );
  const metadataMarkdown = fs.readFileSync(
    path.join(repoRoot, "APP_STORE_METADATA.md"),
    "utf8",
  );
  const appReviewRunbook = fs.readFileSync(
    path.join(repoRoot, "APP_REVIEW_RUNBOOK.md"),
    "utf8",
  );
  const notesTemplateSha256 = appReviewNotesTemplateSha256({
    markdown: appReviewRunbook,
  });
  const errors = [
    ...validateMetadata({
      submission,
      appConfig,
      metadataMarkdown,
      territoryCatalog,
      notesTemplateSha256,
      clock,
      release: releaseRequired,
    }),
    ...validateScreenshotManifest({
      manifest: screenshotManifest,
      repoRoot,
      release: releaseRequired,
    }),
    ...validateTestFlightSubmission({
      record: testFlightSubmission,
      expectedAppVersion: submission?.listing?.appVersion,
      release: releaseRequired,
    }),
    ...validateExactBuildBindings({
      submission,
      testFlightSubmission,
      screenshotManifest,
    }),
    ...validateAppReviewNotesDraft({ markdown: appReviewRunbook }),
  ];

  if (releaseRequired) {
    try {
      validateEasSubmitConfig(easConfig);
    } catch (error) {
      const code =
        error instanceof EasSubmitConfigurationError
          ? error.code
          : "verification_failed";
      errors.push(
        `release mode requires deterministic EAS submit routing (${code})`,
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
    console.error("Unknown App Store validation argument");
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

  if (errors.length === 0 && release) {
    try {
      verifyPostBuildEvidenceBoundary({ repoRoot: DEFAULT_REPO_ROOT });
    } catch (error) {
      const code =
        error instanceof PostBuildEvidenceError
          ? error.code
          : "verification_failed";
      errors.push(
        `release mode requires a valid post-build evidence boundary (${code})`,
      );
    }
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
