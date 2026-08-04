import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  APP_STORE_RELEASE_EVIDENCE_TARGETS,
  appReviewNotesTemplateSha256,
  DEFAULT_REPO_ROOT,
  inspectImage,
  validateAppReviewNotesDraft,
  validateBundle,
  validateExactBuildBindings,
  validateMetadata,
  validateScreenshotManifest,
  validateTestFlightSubmission,
  verifyAppStoreReleaseEvidenceBoundary,
} from "./validate.mjs";

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(DEFAULT_REPO_ROOT, relativePath), "utf8"),
  );
}

function clone(value) {
  return structuredClone(value);
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

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function makePng(width, height, colorType = 2) {
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  const rawRows = Buffer.alloc((width * channels + 1) * height);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(rawRows)),
    pngChunk("IEND"),
  ]);
}

const GENUINE_ONE_PIXEL_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIAAEAAQMBEQACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AP1ToA//2Q==",
  "base64",
);

function corruptJpegWithoutTables() {
  const buffer = Buffer.alloc(38);
  buffer.set([0xff, 0xd8, 0xff, 0xc0]);
  buffer.writeUInt16BE(17, 4);
  buffer[6] = 8;
  buffer.writeUInt16BE(2868, 7);
  buffer.writeUInt16BE(1320, 9);
  buffer[11] = 3;
  buffer.set([1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0], 12);
  buffer.set(
    [0xff, 0xda, 0, 12, 3, 1, 0, 2, 0, 3, 0, 0, 63, 0, 0, 0xff, 0xd9],
    21,
  );
  return buffer;
}

function validationInputs() {
  const appReviewRunbook = fs.readFileSync(
    path.join(DEFAULT_REPO_ROOT, "APP_REVIEW_RUNBOOK.md"),
    "utf8",
  );
  return {
    submission: readJson("app-store/app-store-submission.json"),
    appConfig: readJson("artifacts/cut-os/app.json"),
    territoryCatalog: readJson("app-store/app-store-connect-territories.json"),
    metadataMarkdown: fs.readFileSync(
      path.join(DEFAULT_REPO_ROOT, "APP_STORE_METADATA.md"),
      "utf8",
    ),
    notesTemplateSha256: appReviewNotesTemplateSha256({
      markdown: appReviewRunbook,
    }),
    clock: () => new Date("2026-08-04T00:00:00Z"),
  };
}

test("committed working App Store records validate", () => {
  assert.deepEqual(validateBundle(), []);
});

test("App Store release evidence requires an App Review or public-release target", () => {
  assert.deepEqual(APP_STORE_RELEASE_EVIDENCE_TARGETS, [
    "app_review",
    "public_release",
  ]);

  for (const releaseTarget of APP_STORE_RELEASE_EVIDENCE_TARGETS) {
    const evidence = { releaseTarget };
    assert.equal(
      verifyAppStoreReleaseEvidenceBoundary({
        repoRoot: "/not-used",
        verifyBoundary: () => evidence,
      }),
      evidence,
    );
  }

  for (const releaseTarget of ["staging", "internal_testflight", undefined]) {
    assert.throws(
      () =>
        verifyAppStoreReleaseEvidenceBoundary({
          repoRoot: "/not-used",
          verifyBoundary: () => ({ releaseTarget }),
        }),
      (error) =>
        error?.code === "release_manifest_target_not_app_store_release",
    );
  }
});

test("the initial listing screenshot story is validator-bound", () => {
  const manifest = readJson("app-store/screenshots/manifest.json");
  manifest.listingSelection = ["09-settings-controls"];

  assert.ok(
    validateScreenshotManifest({ manifest }).includes(
      "listingSelection must match the approved initial screenshot story",
    ),
  );
});

test("release mode stays fail closed while owner, privacy, and screenshot gates are open", () => {
  const errors = validateBundle({ release: true });
  assert.ok(errors.length > 20);
  assert.ok(
    errors.includes(
      "release mode requires submission.status approved_for_submission",
    ),
  );
  assert.ok(errors.includes("release mode requires listing.sku"));
  assert.ok(
    errors.includes(
      "release mode requires at least one owner-approved initial territory",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires the territory catalog reconciled with the App Store Connect Territories API",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires authenticationSecurity.status approved_for_release",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires authenticationSecurity.productionTenantEvidence.checks.timingParity verified production-tenant evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires image file for 01-today-next-action",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires privacy gate production_archive_and_embedded_sdks",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires commercialAndLegal.status confirmed_in_app_store_connect",
    ),
  );
  assert.ok(
    errors.includes("release mode requires appReview.status ready_for_review"),
  );
  assert.ok(
    errors.includes(
      "release mode requires subscription.status ready_for_submission",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires accessibility.status evaluated_for_release",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires saved App Store Connect age-questionnaire evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires TestFlight status ready_for_app_review",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires deterministic EAS submit routing (production_ios_asc_app_id_not_pinned)",
    ),
  );
});

test("metadata validation catches listing and privacy-manifest drift", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.listing.subtitle = "x".repeat(31);
  submission.listing.promotionalText = "metadata drift";
  submission.privacy.dataTypes[0].tracking = true;
  submission.privacy.requiredReasonApis[0].reasons = ["invented.1"];

  const errors = validateMetadata({ ...inputs, submission });
  assert.ok(errors.includes("listing.subtitle must be 30 characters or fewer"));
  assert.ok(
    errors.includes(
      "machine-readable subtitle must match APP_STORE_METADATA.md",
    ),
  );
  assert.ok(
    errors.includes(
      "machine-readable promotional text must match APP_STORE_METADATA.md",
    ),
  );
  assert.ok(
    errors.includes("privacy.dataTypes[0] tracking must match app.json"),
  );
  assert.ok(
    errors.includes("every current privacy row must remain tracking No"),
  );
  assert.ok(
    errors.includes(
      "privacy.requiredReasonApis[0] reasons must match app.json",
    ),
  );
});

test("every public listing copy surface rejects unshipped feature claims", () => {
  const inputs = validationInputs();
  for (const field of ["description", "subtitle", "promotionalText"]) {
    const submission = clone(inputs.submission);
    submission.listing[field] = `${submission.listing[field] ?? ""} AI chat`;
    assert.ok(
      validateMetadata({ ...inputs, submission }).some((error) =>
        error.startsWith(
          `listing.${field} advertises an unshipped feature matching`,
        ),
      ),
    );
  }
});

test("working validation allows verified owner fields to be populated incrementally", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.listing.supportUrl = "https://example.com/support";
  submission.listing.contentRightsDeclaration = true;
  submission.ageRating.workingAnswers[0].status = "confirmed";
  submission.privacy.externalVerificationGates[0].status = "verified";

  assert.deepEqual(validateMetadata({ ...inputs, submission }), []);

  submission.listing.privacyPolicyUrl = "http://example.com/privacy";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "listing.privacyPolicyUrl must be null or HTTPS",
    ),
  );
});

test("records cannot claim approval without satisfying release evidence", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.status = "approved_for_submission";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "release mode requires listing.sku",
    ),
  );

  const privacyClaim = clone(inputs.submission);
  privacyClaim.privacy.status = "confirmed_for_submission";
  assert.ok(
    validateMetadata({ ...inputs, submission: privacyClaim }).includes(
      "release mode requires privacy gate production_archive_and_embedded_sdks",
    ),
  );

  const screenshotManifest = readJson("app-store/screenshots/manifest.json");
  screenshotManifest.status = "approved_for_submission";
  assert.ok(
    validateScreenshotManifest({ manifest: screenshotManifest }).includes(
      "release mode requires image file for 01-today-next-action",
    ),
  );
});

test("approval records must retain the exact required key sets", () => {
  const inputs = validationInputs();
  const missingApprovals = clone(inputs.submission);
  missingApprovals.ageRating.approval = {};
  missingApprovals.privacy.approval = {};
  missingApprovals.authenticationSecurity.approval = {};
  missingApprovals.commercialAndLegal.approval = {};
  missingApprovals.appReview.approval = {};
  missingApprovals.subscription.approval = {};
  missingApprovals.accessibility.approval = {};

  const missingErrors = validateMetadata({
    ...inputs,
    submission: missingApprovals,
  });
  assert.ok(
    missingErrors.includes(
      "ageRating.approval must contain exactly the required approval keys",
    ),
  );
  assert.ok(
    missingErrors.includes(
      "privacy.approval must contain exactly the required approval keys",
    ),
  );
  assert.ok(
    missingErrors.includes(
      "authenticationSecurity.approval must contain exactly the required approval keys",
    ),
  );
  for (const label of [
    "commercialAndLegal.approval",
    "appReview.approval",
    "subscription.approval",
    "accessibility.approval",
  ]) {
    assert.ok(
      missingErrors.includes(
        `${label} must contain exactly the required approval keys`,
      ),
    );
  }

  const extraApproval = clone(inputs.submission);
  extraApproval.ageRating.approval.unreviewedShortcut = true;
  assert.ok(
    validateMetadata({ ...inputs, submission: extraApproval }).includes(
      "ageRating.approval must contain exactly the required approval keys",
    ),
  );
});

test("new release records reject unknown keys and incomplete age answers", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.unreviewedShortcut = true;
  submission.references.unreviewedShortcut = "nowhere";
  submission.commercialAndLegal.unreviewedShortcut = true;
  submission.appReview.unreviewedShortcut = true;
  submission.subscription.unreviewedShortcut = true;
  submission.accessibility.unreviewedShortcut = true;
  submission.ageRating.savedQuestionnaireEvidence.unreviewedShortcut = true;
  submission.ageRating.workingAnswers[0].unreviewedShortcut = true;
  submission.privacy.unreviewedShortcut = true;
  submission.ageRating.workingAnswers.pop();

  const errors = validateMetadata({ ...inputs, submission });
  assert.ok(
    errors.includes(
      "submission must contain exactly the required top-level keys",
    ),
  );
  assert.ok(
    errors.includes(
      "submission.references must contain exactly the required keys",
    ),
  );
  for (const [record, message] of [
    [
      "commercialAndLegal",
      "commercialAndLegal must contain exactly the required keys",
    ],
    ["appReview", "appReview must contain exactly the required keys"],
    ["subscription", "subscription must contain exactly the required keys"],
    ["accessibility", "accessibility must contain exactly the required keys"],
  ]) {
    assert.ok(errors.includes(message), `${record} should reject unknown keys`);
  }
  assert.ok(
    errors.includes(
      "ageRating.savedQuestionnaireEvidence must contain exactly the required keys",
    ),
  );
  assert.ok(
    errors.includes(
      "parental_controls must contain exactly the required age-answer keys",
    ),
  );
  assert.ok(errors.includes("privacy must contain exactly the required keys"));
  assert.ok(
    errors.includes(
      "ageRating.workingAnswers must contain the complete v1 answer set",
    ),
  );
  assert.ok(errors.includes("missing provisional age answer loot_boxes"));
  assert.equal(inputs.submission.ageRating.workingAnswers.length, 24);
});

test("verified or ready states cannot omit their supporting evidence", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.commercialAndLegal.appStoreServerNotifications.status =
    "confirmed_in_app_store_connect";
  submission.subscription.revenueCat.productionMappingStatus = "verified";
  submission.subscription.revenueCat.appStoreConnectApiKeyStatus = "verified";
  submission.subscription.revenueCat.subscriptionKeyStatus = "verified";
  submission.subscription.exactBuildEvidence.storeKitOfferStatus = "verified";
  submission.accessibility.status = "evaluated_for_release";
  submission.accessibility.appStoreConnectDecision.decision =
    "support_not_indicated_for_initial_release";
  for (const key of Object.keys(submission.accessibility.approval)) {
    submission.accessibility.approval[key] = true;
  }

  const errors = validateMetadata({ ...inputs, submission });
  assert.ok(
    errors.includes(
      "confirmed App Store Server Notifications requires an evidence reference",
    ),
  );
  assert.ok(
    errors.includes(
      "verified subscription RevenueCat mapping requires evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "verified RevenueCat Apple credentials require dashboard UTC evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "verified subscription exact-build status requires UTC evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires accessibility.commonTasks.signIn completed evidence status",
    ),
  );
  assert.ok(
    errors.includes(
      "evaluated accessibility requires accessibility decision saved in App Store Connect",
    ),
  );
  assert.ok(
    errors.includes(
      "evaluated accessibility requires accessibility App Store Connect saved UTC evidence",
    ),
  );
});

test("v1 server notifications are bound directly to one RevenueCat URL", () => {
  const inputs = validationInputs();

  const unsupported = clone(inputs.submission);
  unsupported.commercialAndLegal.appStoreServerNotifications.deliveryArchitecture =
    "api_forwarding";
  assert.ok(
    validateMetadata({ ...inputs, submission: unsupported }).includes(
      "commercialAndLegal.appStoreServerNotifications.deliveryArchitecture must remain revenuecat_direct for v1",
    ),
  );

  const arbitrary = clone(inputs.submission);
  arbitrary.commercialAndLegal.appStoreServerNotifications.productionUrl =
    "https://api.example.com/apple/notifications";
  assert.ok(
    validateMetadata({ ...inputs, submission: arbitrary }).includes(
      "revenuecat_direct App Store Server Notifications URLs must use the full RevenueCat incoming-webhooks URL without query or fragment",
    ),
  );

  for (const badUrl of [
    "https://api.revenuecat.com/garbage",
    "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/appProduction1234?token=wrong",
    "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/appProduction1234#fragment",
  ]) {
    const malformed = clone(inputs.submission);
    malformed.commercialAndLegal.appStoreServerNotifications.productionUrl =
      badUrl;
    assert.ok(
      validateMetadata({ ...inputs, submission: malformed }).includes(
        "revenuecat_direct App Store Server Notifications URLs must use the full RevenueCat incoming-webhooks URL without query or fragment",
      ),
    );
  }

  const unequal = clone(inputs.submission);
  unequal.commercialAndLegal.appStoreServerNotifications.productionUrl =
    "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/one";
  unequal.commercialAndLegal.appStoreServerNotifications.sandboxUrl =
    "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/two";
  assert.ok(
    validateMetadata({ ...inputs, submission: unequal }).includes(
      "revenuecat_direct production and sandbox notification URLs must be identical",
    ),
  );

  const matching = clone(inputs.submission);
  const revenueCatUrl =
    "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/appProduction1234";
  matching.commercialAndLegal.appStoreServerNotifications.productionUrl =
    revenueCatUrl;
  matching.commercialAndLegal.appStoreServerNotifications.sandboxUrl =
    revenueCatUrl;
  assert.equal(
    validateMetadata({ ...inputs, submission: matching }).some((error) =>
      error.includes("notification URL"),
    ),
    false,
  );
});

test("authentication security release gate requires supported architecture and production evidence", () => {
  const inputs = validationInputs();

  const invalidStatuses = clone(inputs.submission);
  invalidStatuses.authenticationSecurity.status = "waived";
  invalidStatuses.authenticationSecurity.productionTenantEvidence.checks.timingParity.status =
    "waived";
  const invalidStatusErrors = validateMetadata({
    ...inputs,
    submission: invalidStatuses,
  });
  assert.ok(
    invalidStatusErrors.includes(
      "authenticationSecurity.status must be pending or approved_for_release",
    ),
  );
  assert.ok(
    invalidStatusErrors.includes(
      "authenticationSecurity.productionTenantEvidence.checks.timingParity.status must be pending or verified",
    ),
  );

  const unsupported = clone(inputs.submission);
  unsupported.authenticationSecurity.selectedRecoveryArchitecture =
    "custom_undocumented_endpoint";
  assert.ok(
    validateMetadata({ ...inputs, submission: unsupported }).includes(
      "authenticationSecurity.selectedRecoveryArchitecture must be null or a Clerk-supported option",
    ),
  );

  const evidenceWithoutReference = clone(inputs.submission);
  evidenceWithoutReference.authenticationSecurity.productionTenantEvidence.checks.timingParity.status =
    "verified";
  assert.ok(
    validateMetadata({
      ...inputs,
      submission: evidenceWithoutReference,
    }).includes(
      "authenticationSecurity.productionTenantEvidence.checks.timingParity cannot be verified without evidence",
    ),
  );

  const approved = clone(inputs.submission);
  const gate = approved.authenticationSecurity;
  gate.status = "approved_for_release";
  gate.selectedRecoveryArchitecture = "clerk_hosted_or_prebuilt_recovery";
  gate.clerkSupportEvidenceReference = "security/clerk-support-review";
  gate.implementationEvidenceReference = "security/recovery-build-review";
  gate.productionTenantEvidence.clerkTenantAlias = "clerk-production";
  gate.productionTenantEvidence.testedAtUtc = "2026-08-03T23:59:00Z";
  for (const [key, evidence] of Object.entries(
    gate.productionTenantEvidence.checks,
  )) {
    evidence.status = "verified";
    evidence.evidenceReference = `security/${key}`;
  }
  for (const key of Object.keys(gate.approval)) gate.approval[key] = true;

  assert.deepEqual(
    validateMetadata({
      ...inputs,
      submission: approved,
      release: true,
    }).filter((error) => error.includes("authenticationSecurity")),
    [],
  );
});

test("initial territories must be explicit, valid, unique, and approved", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.listing.initialTerritories = ["us", "US", "US"];
  const workingErrors = validateMetadata({ ...inputs, submission });
  assert.ok(
    workingErrors.includes(
      "listing.initialTerritories must use uppercase two-letter territory codes",
    ),
  );
  assert.ok(
    workingErrors.includes(
      "listing.initialTerritories must not contain duplicates",
    ),
  );

  for (const invalidCode of ["UK", "ZZ"]) {
    const invalidSubmission = clone(inputs.submission);
    invalidSubmission.listing.initialTerritories = [invalidCode];
    const invalidErrors = validateMetadata({
      ...inputs,
      submission: invalidSubmission,
    });
    assert.ok(
      invalidErrors.includes(
        "listing.initialTerritories must use current codes from app-store/app-store-connect-territories.json",
      ),
    );
    assert.equal(
      invalidErrors.includes(
        "listing.initialTerritories must use uppercase two-letter territory codes",
      ),
      false,
    );
  }

  const validGbSubmission = clone(inputs.submission);
  validGbSubmission.listing.initialTerritories = ["GB"];
  assert.equal(
    validateMetadata({ ...inputs, submission: validGbSubmission }).some(
      (error) => error.includes("listing.initialTerritories"),
    ),
    false,
  );

  const contradictoryDsa = clone(inputs.submission);
  contradictoryDsa.listing.initialTerritories = ["DE"];
  contradictoryDsa.commercialAndLegal.dsaStatus =
    "not_applicable_no_eu_distribution";
  assert.ok(
    validateMetadata({ ...inputs, submission: contradictoryDsa }).includes(
      "commercialAndLegal.dsaStatus cannot claim no EU distribution while an EU territory is selected",
    ),
  );

  submission.listing.initialTerritories = ["CA"];
  const releaseErrors = validateMetadata({
    ...inputs,
    submission,
    release: true,
  });
  assert.ok(
    releaseErrors.includes("release mode requires availability.approval.owner"),
  );
  assert.ok(
    releaseErrors.includes(
      "release mode requires initial territories confirmed in App Store Connect",
    ),
  );
});

test("territory catalog drift remains visible and release-blocking", () => {
  const inputs = validationInputs();
  assert.equal(inputs.territoryCatalog.storefrontCodes.length, 175);
  assert.ok(inputs.territoryCatalog.storefrontCodes.includes("GB"));
  assert.equal(inputs.territoryCatalog.storefrontCodes.includes("UK"), false);
  assert.equal(inputs.territoryCatalog.storefrontCodes.includes("ZZ"), false);

  const shortenedCatalog = clone(inputs.territoryCatalog);
  shortenedCatalog.storefrontCodes.pop();
  shortenedCatalog.snapshot.activeStorefrontCount -= 1;
  assert.ok(
    validateMetadata({
      ...inputs,
      territoryCatalog: shortenedCatalog,
    }).includes(
      "territory catalog must retain the reviewed 175-storefront snapshot",
    ),
  );
});

test("Health & Fitness release requires confirmed regional medical-device declarations", () => {
  const inputs = validationInputs();

  for (const [territory, region] of [
    ["US", "US"],
    ["DE", "EU_EEA"],
    ["GB", "UK"],
  ]) {
    const submission = clone(inputs.submission);
    submission.listing.initialTerritories = [territory];
    submission.availability.status = "confirmed_in_app_store_connect";
    submission.availability.approval.owner = true;
    submission.availability.approval.appStoreConnectConfirmed = true;

    const errors = validateMetadata({
      ...inputs,
      submission,
      release: true,
    });
    assert.ok(
      errors.includes(
        "release mode requires regulatedMedicalDevice.approval.owner",
      ),
    );
    assert.ok(
      errors.includes(
        `release mode requires the ${region} regulated-medical-device declaration confirmed in App Store Connect`,
      ),
    );
  }

  const confirmed = clone(inputs.submission);
  confirmed.listing.initialTerritories = ["US"];
  confirmed.availability.status = "confirmed_in_app_store_connect";
  confirmed.availability.approval.owner = true;
  confirmed.availability.approval.appStoreConnectConfirmed = true;
  confirmed.regulatedMedicalDevice.status = "confirmed_in_app_store_connect";
  confirmed.regulatedMedicalDevice.regionalDeclarations.US.status =
    "confirmed_in_app_store_connect";
  for (const key of Object.keys(confirmed.regulatedMedicalDevice.approval)) {
    confirmed.regulatedMedicalDevice.approval[key] = true;
  }
  const confirmedErrors = validateMetadata({
    ...inputs,
    submission: confirmed,
    release: true,
  });
  assert.equal(
    confirmedErrors.some(
      (error) =>
        error.startsWith(
          "release mode requires regulatedMedicalDevice.approval",
        ) ||
        error.includes(
          "regulated-medical-device declaration confirmed in App Store Connect",
        ),
    ),
    false,
  );

  const outsideRequiredRegions = clone(inputs.submission);
  outsideRequiredRegions.listing.initialTerritories = ["CA"];
  outsideRequiredRegions.availability.status = "confirmed_in_app_store_connect";
  outsideRequiredRegions.availability.approval.owner = true;
  outsideRequiredRegions.availability.approval.appStoreConnectConfirmed = true;
  const outsideErrors = validateMetadata({
    ...inputs,
    submission: outsideRequiredRegions,
    release: true,
  });
  assert.equal(
    outsideErrors.some((error) =>
      error.startsWith("release mode requires regulatedMedicalDevice"),
    ),
    false,
  );
});

test("commercial, review, subscription, and accessibility gates can be evidence-complete", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const evidenceTime = "2026-08-03T23:59:00Z";
  const exactBuildIdentity = {
    appVersion: "1.0.0",
    buildNumber: "1",
    gitCommit: "0123456789abcdef0123456789abcdef01234567",
    easBuildId: "eas-build-01234567",
    appStoreConnectBuildId: "asc-build-01234567",
  };

  const commercial = submission.commercialAndLegal;
  commercial.status = "confirmed_in_app_store_connect";
  commercial.appDownloadPrice = "free_download";
  commercial.licenseAgreement = "standard_apple_eula";
  commercial.appTaxCategory = "Health and Fitness";
  commercial.dsaStatus = "trader";
  commercial.appStoreServerNotifications = {
    deliveryArchitecture: "revenuecat_direct",
    status: "confirmed_in_app_store_connect",
    productionUrl:
      "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/appProduction1234",
    sandboxUrl:
      "https://api.revenuecat.com/v1/incoming-webhooks/apple-server-notifications/appProduction1234",
    evidenceReference: "evidence/app-store-server-notifications",
  };
  for (const key of Object.keys(commercial.approval)) {
    commercial.approval[key] = true;
  }

  const appReview = submission.appReview;
  appReview.status = "ready_for_review";
  for (const key of Object.keys(appReview.configuration)) {
    appReview.configuration[key] = true;
  }
  for (const [key, record] of Object.entries(appReview.accountStates)) {
    record.status = "verified_fresh";
    record.nonExpiring = true;
    record.noMfaOrOutOfBandTrap = true;
    record.testedAtUtc = evidenceTime;
    record.evidenceReference = `evidence/review-account-${key}`;
  }
  Object.assign(appReview.exactBuild, exactBuildIdentity);
  appReview.exactBuild.verifiedAtUtc = evidenceTime;
  appReview.exactBuild.navigationEvidenceReference =
    "evidence/app-review-navigation";
  Object.assign(appReview.finalResolvedNotesEvidence, {
    templateSha256: inputs.notesTemplateSha256,
    resolvedUtf8ByteCount: 3999,
    placeholdersRemaining: 0,
    measuredAtUtc: evidenceTime,
    savedInAppStoreConnect: true,
    evidenceReference: "evidence/final-app-review-notes",
  });
  for (const key of Object.keys(appReview.approval)) {
    appReview.approval[key] = true;
  }

  const subscription = submission.subscription;
  Object.assign(subscription, {
    status: "ready_for_submission",
    subscriptionGroupReferenceName: "CUT OS Pro",
    productReferenceName: "CUT OS Pro Monthly",
    productId: "com.zarifahmed.cut.pro.monthly",
    duration: "1_month",
    priceScheduleEvidenceReference: "evidence/subscription-price",
    availabilityEvidenceReference: "evidence/subscription-availability",
    introductoryOfferDecision: "none",
    familySharingDecision: "disabled",
    taxCategory: "Health and Fitness",
  });
  Object.assign(subscription.localizations["en-US"], {
    groupDisplayName: "CUT OS Pro",
    productDisplayName: "Monthly",
    description: "Monthly access to CUT OS Pro.",
    appNameDisplayOption: "use_app_name",
  });
  subscription.appStoreConnect.groupStatus = "confirmed_in_app_store_connect";
  subscription.appStoreConnect.productStatus = "confirmed_in_app_store_connect";
  subscription.appStoreConnect.attachedToVersion = true;
  subscription.appStoreConnect.reviewNotesConfigured = true;
  Object.assign(subscription.usPricing, {
    amount: "4.99",
    effectiveStatus: "scheduled",
    effectiveAtUtc: evidenceTime,
    evidenceReference: "evidence/us-price-schedule",
    ownerDecisionRevision: "owner-price-decision-v1",
    ownerDecisionEvidenceReference: "evidence/owner-price-decision-v1",
  });
  Object.assign(subscription.appStoreConnect.reviewScreenshotUpload, {
    status: "uploaded_in_app_store_connect",
    sha256: "a".repeat(64),
    uploadedAtUtc: evidenceTime,
    evidenceReference: "evidence/subscription-review-screenshot-upload",
  });
  subscription.revenueCat.productionMappingStatus = "verified";
  subscription.revenueCat.appStoreConnectApiKeyStatus = "verified";
  subscription.revenueCat.subscriptionKeyStatus = "verified";
  subscription.revenueCat.verifiedAtUtc = evidenceTime;
  subscription.revenueCat.evidenceReference =
    "evidence/revenuecat-production-mapping";
  subscription.exactBuildEvidence.storeKitOfferStatus = "verified";
  subscription.exactBuildEvidence.purchaseQaStatus = "verified";
  subscription.exactBuildEvidence.testFlightStatus = "verified";
  Object.assign(subscription.exactBuildEvidence, exactBuildIdentity);
  subscription.exactBuildEvidence.testedAtUtc = evidenceTime;
  subscription.exactBuildEvidence.evidenceReference =
    "evidence/subscription-exact-build";
  for (const key of Object.keys(subscription.approval)) {
    subscription.approval[key] = true;
  }

  const accessibility = submission.accessibility;
  accessibility.status = "evaluated_for_release";
  Object.assign(accessibility.appStoreConnectDecision, {
    status: "confirmed_in_app_store_connect",
    decision: "support_not_indicated_for_initial_release",
    savedAtUtc: evidenceTime,
    evidenceReference: "evidence/accessibility-app-store-connect",
  });
  for (const [key, record] of Object.entries(accessibility.commonTasks)) {
    record.status = "verified";
    record.evidenceReference = `evidence/accessibility-task-${key}`;
  }
  for (const [key, record] of Object.entries(accessibility.features)) {
    record.status = "verified_not_supported";
    record.evidenceReference = `evidence/accessibility-feature-${key}`;
  }
  Object.assign(accessibility.exactBuildEvidence, exactBuildIdentity, {
    testedAtUtc: evidenceTime,
    evidenceReference: "evidence/accessibility-exact-build",
  });
  for (const key of Object.keys(accessibility.approval)) {
    accessibility.approval[key] = true;
  }

  const errors = validateMetadata({
    ...inputs,
    submission,
    release: true,
  });
  const gateErrors = errors.filter((error) =>
    /commercialAndLegal|appReview|subscription|RevenueCat|accessibility/u.test(
      error,
    ),
  );
  assert.deepEqual(gateErrors, []);
});

test("every exact-build surface is cross-bound to canonical TestFlight identity", () => {
  const baseSubmission = readJson("app-store/app-store-submission.json");
  const baseTestFlight = readJson("app-store/testflight-submission.json");
  const baseScreenshots = readJson("app-store/screenshots/manifest.json");
  assert.deepEqual(
    validateExactBuildBindings({
      submission: baseSubmission,
      testFlightSubmission: baseTestFlight,
      screenshotManifest: baseScreenshots,
    }),
    [],
  );

  const cases = [
    ["appReview.exactBuild", (submission) => submission.appReview.exactBuild],
    [
      "screenshots.captureDefaults",
      (_submission, screenshots) => screenshots.captureDefaults,
    ],
    [
      "subscription.exactBuildEvidence",
      (submission) => submission.subscription.exactBuildEvidence,
    ],
    [
      "accessibility.exactBuildEvidence",
      (submission) => submission.accessibility.exactBuildEvidence,
    ],
  ];
  for (const [label, select] of cases) {
    const submission = clone(baseSubmission);
    const screenshots = clone(baseScreenshots);
    select(submission, screenshots).easBuildId = "different-eas-build";
    assert.ok(
      validateExactBuildBindings({
        submission,
        testFlightSubmission: baseTestFlight,
        screenshotManifest: screenshots,
      }).includes(
        `${label}.easBuildId must exactly match TestFlight exactBuildEvidence.easBuildId`,
      ),
    );
  }

  const missingIdentity = clone(baseSubmission);
  delete missingIdentity.appReview.exactBuild.gitCommit;
  assert.ok(
    validateExactBuildBindings({
      submission: missingIdentity,
      testFlightSubmission: baseTestFlight,
      screenshotManifest: baseScreenshots,
    }).includes(
      "appReview.exactBuild.gitCommit must exactly match TestFlight exactBuildEvidence.gitCommit",
    ),
  );

  const screenshotMismatch = clone(baseSubmission);
  const screenshots = clone(baseScreenshots);
  screenshots.shots.find((shot) => shot.id === "07-subscription-offer").sha256 =
    "a".repeat(64);
  Object.assign(
    screenshotMismatch.subscription.appStoreConnect.reviewScreenshotUpload,
    {
      status: "uploaded_in_app_store_connect",
      sha256: "b".repeat(64),
      uploadedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: "evidence/subscription-shot",
    },
  );
  assert.ok(
    validateExactBuildBindings({
      submission: screenshotMismatch,
      testFlightSubmission: baseTestFlight,
      screenshotManifest: screenshots,
    }).includes(
      "subscription review screenshot upload sha256 must exactly match captured shot 07-subscription-offer",
    ),
  );
});

test("verified_fresh App Review accounts are bounded to the injected 24-hour clock", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const account = submission.appReview.accountStates.fullAccess;
  Object.assign(account, {
    status: "verified_fresh",
    nonExpiring: true,
    noMfaOrOutOfBandTrap: true,
    testedAtUtc: "2026-08-03T00:00:00Z",
    evidenceReference: "evidence/review-account-full-access",
  });
  assert.equal(
    validateMetadata({ ...inputs, submission }).some((error) =>
      error.includes("appReview.accountStates.fullAccess"),
    ),
    false,
  );

  account.testedAtUtc = "2026-08-02T23:59:59Z";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "appReview.accountStates.fullAccess verified_fresh evidence must be no more than 24 hours old",
    ),
  );

  account.testedAtUtc = "2026-08-04T00:00:01Z";
  const futureErrors = validateMetadata({ ...inputs, submission });
  assert.ok(
    futureErrors.includes(
      "appReview.accountStates.fullAccess.testedAtUtc cannot be in the future",
    ),
  );
  assert.equal(
    futureErrors.includes(
      "appReview.accountStates.fullAccess verified_fresh evidence must be no more than 24 hours old",
    ),
    false,
  );

  account.testedAtUtc = "2026-08-03T23:59:00Z";
  account.nonExpiring = false;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "appReview.accountStates.fullAccess verified_fresh evidence requires a non-expiring review account",
    ),
  );
  account.nonExpiring = true;
  account.noMfaOrOutOfBandTrap = false;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "appReview.accountStates.fullAccess verified_fresh evidence requires no MFA or out-of-band access trap",
    ),
  );
});

test("final resolved App Review Notes use a credential-safe saved attestation", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const evidence = submission.appReview.finalResolvedNotesEvidence;
  Object.assign(evidence, {
    templateSha256: inputs.notesTemplateSha256,
    resolvedUtf8ByteCount: 4000,
    placeholdersRemaining: 0,
    measuredAtUtc: "2026-08-03T23:59:00Z",
    savedInAppStoreConnect: true,
    evidenceReference: "evidence/final-resolved-review-notes",
  });
  assert.equal(
    validateMetadata({ ...inputs, submission }).some(
      (error) =>
        error.includes("App Review Notes") ||
        error.includes("finalResolvedNotesEvidence"),
    ),
    false,
  );

  evidence.templateSha256 = "0".repeat(64);
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "appReview final resolved notes templateSha256 must match the credential-free repository draft",
    ),
  );
  evidence.templateSha256 = inputs.notesTemplateSha256;
  evidence.resolvedUtf8ByteCount = 4001;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "saved App Review Notes require a resolved UTF-8 byte count no greater than 4000",
    ),
  );
  evidence.resolvedUtf8ByteCount = 3999;
  evidence.placeholdersRemaining = 1;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "saved App Review Notes require zero placeholders remaining",
    ),
  );

  const unsafeHash = clone(inputs.submission);
  unsafeHash.appReview.finalResolvedNotesEvidence.resolvedContentSha256 =
    "f".repeat(64);
  assert.ok(
    validateMetadata({ ...inputs, submission: unsafeHash }).includes(
      "appReview.finalResolvedNotesEvidence must contain exactly the required non-secret attestation keys",
    ),
  );

  const readyWithoutAttestation = clone(inputs.submission);
  readyWithoutAttestation.appReview.status = "ready_for_review";
  assert.ok(
    validateMetadata({
      ...inputs,
      submission: readyWithoutAttestation,
    }).includes(
      "ready appReview requires appReview.finalResolvedNotesEvidence saved attestation",
    ),
  );
});

test("subscription app-name display options reject stale or missing custom names", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const localization = submission.subscription.localizations["en-US"];
  localization.appNameDisplayOption = "use_app_name";
  localization.customAppName = "Stale custom display name";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "subscription use_app_name display option requires customAppName null",
    ),
  );

  localization.appNameDisplayOption = "custom_name";
  localization.customAppName = null;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "subscription custom app-name display option requires customAppName",
    ),
  );
  localization.customAppName = "CUT OS Pro";
  assert.equal(
    validateMetadata({ ...inputs, submission }).some(
      (error) =>
        error.includes("app-name display option") ||
        error.includes("use_app_name display option"),
    ),
    false,
  );
});

test("accessibility support claims cover every common task and media N/A is narrow", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const accessibility = submission.accessibility;
  accessibility.appStoreConnectDecision.decision = "drafted_verified_support";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "accessibility drafted_verified_support requires at least one verified_supported feature",
    ),
  );

  const voiceOver = accessibility.features.voiceOver;
  voiceOver.status = "verified_supported";
  voiceOver.evidenceReference = "evidence/voiceover-common-tasks";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "accessibility.features.voiceOver verified_supported must cover every expected common task in canonical order",
    ),
  );
  voiceOver.commonTasksVerified = Object.keys(accessibility.commonTasks);
  assert.equal(
    validateMetadata({ ...inputs, submission }).some(
      (error) =>
        error.includes("drafted_verified_support") ||
        error.includes("accessibility.features.voiceOver verified_supported"),
    ),
    false,
  );

  const voiceControl = accessibility.features.voiceControl;
  voiceControl.status = "not_applicable_no_media";
  voiceControl.evidenceReference = "evidence/not-applicable";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "accessibility.features.voiceControl may use not_applicable_no_media only for Captions or Audio Descriptions",
    ),
  );
});

test("structured US pricing and introductory-offer terms fail closed", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const subscription = submission.subscription;
  Object.assign(subscription.usPricing, {
    amount: "4.99",
    effectiveStatus: "scheduled",
    effectiveAtUtc: "2026-08-05T00:00:00Z",
  });
  const missingPriceEvidence = validateMetadata({ ...inputs, submission });
  for (const field of [
    "evidenceReference",
    "ownerDecisionRevision",
    "ownerDecisionEvidenceReference",
  ]) {
    assert.ok(
      missingPriceEvidence.includes(
        `scheduled or effective US pricing requires subscription.usPricing.${field}`,
      ),
    );
  }

  Object.assign(subscription.usPricing, {
    evidenceReference: "evidence/us-price",
    ownerDecisionRevision: "price-decision-v1",
    ownerDecisionEvidenceReference: "evidence/price-decision-v1",
  });
  subscription.introductoryOfferDecision = "none";
  subscription.introductoryOfferTerms.duration = "1_month";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "subscription introductoryOfferDecision none requires introductoryOfferTerms.duration null",
    ),
  );

  Object.assign(subscription.introductoryOfferTerms, {
    duration: "1_month",
    numberOfPeriods: 1,
    priceAmount: "4.99",
    eligibility: "new_subscribers_only",
    evidenceReference: "evidence/introductory-offer",
  });
  subscription.introductoryOfferDecision = "free_trial";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "free_trial introductory offer requires priceAmount 0.00",
    ),
  );
  subscription.introductoryOfferTerms.priceAmount = "0.00";
  assert.equal(
    validateMetadata({ ...inputs, submission }).some(
      (error) =>
        error.includes("US pricing") || error.includes("introductory offer"),
    ),
    false,
  );
});

test("age evidence uses current ratings, effective 18+, and canonical answer order", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const evidence = submission.ageRating.savedQuestionnaireEvidence;
  evidence.calculatedRating = "15+";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "ageRating.savedQuestionnaireEvidence.calculatedRating must be null or a current Apple age-rating value",
    ),
  );

  evidence.status = "confirmed_in_app_store_connect";
  evidence.questionnaireVersionOrRevision = "App Store Connect 2026-08-03";
  evidence.calculatedRating = "Unrated";
  evidence.effectiveRatingAfterOverride = "18+";
  evidence.confirmedAtUtc = "2026-08-03T23:59:00Z";
  evidence.evidenceReference = "evidence/age-rating";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "App Store release cannot use an Unrated calculated age rating",
    ),
  );
  evidence.calculatedRating = "13+";
  evidence.effectiveRatingAfterOverride = "16+";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "App Store release requires effective post-override age rating 18+",
    ),
  );

  submission.ageRating.workingAnswers.reverse();
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "ageRating.workingAnswers must preserve the canonical questionnaire order",
    ),
  );
});

test("saved App Store Connect age-questionnaire evidence is release-gated", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const evidence = submission.ageRating.savedQuestionnaireEvidence;
  evidence.status = "confirmed_in_app_store_connect";
  evidence.questionnaireVersionOrRevision = "App Store Connect 2026-08-03";
  evidence.calculatedRating = "18+";
  evidence.effectiveRatingAfterOverride = "18+";
  evidence.confirmedAtUtc = "2026-08-03T23:59:00Z";
  evidence.evidenceReference = "evidence/age-questionnaire";
  for (const answer of submission.ageRating.workingAnswers) {
    answer.status = "confirmed";
  }
  submission.ageRating.higherAgeOverride.status =
    "confirmed_in_app_store_connect";
  for (const key of Object.keys(submission.ageRating.approval)) {
    submission.ageRating.approval[key] = true;
  }

  const errors = validateMetadata({
    ...inputs,
    submission,
    release: true,
  }).filter((error) => error.includes("ageRating") || error.includes(" age "));
  assert.deepEqual(errors, []);
});

test("TestFlight record distinguishes internal testing from external review", () => {
  const record = readJson("app-store/testflight-submission.json");
  assert.deepEqual(
    validateTestFlightSubmission({ record, expectedAppVersion: "1.0.0" }),
    [],
  );

  const extraKey = clone(record);
  extraKey.unreviewedShortcut = true;
  assert.ok(
    validateTestFlightSubmission({
      record: extraKey,
      expectedAppVersion: "1.0.0",
    }).includes("TestFlight submission must contain exactly the required keys"),
  );

  const external = clone(record);
  external.distributionScope = "external_testing";
  assert.ok(
    validateTestFlightSubmission({
      record: external,
      expectedAppVersion: "1.0.0",
    }).includes(
      "TestFlight externalBetaReview.required must match distributionScope",
    ),
  );

  const ready = clone(record);
  ready.status = "ready_for_app_review";
  ready.feedbackEmailConfiguredInAppStoreConnect = true;
  Object.assign(ready.exactBuildEvidence, {
    buildNumber: "1",
    gitCommit: "0123456789abcdef0123456789abcdef01234567",
    easBuildId: "eas-build-01234567",
    appStoreConnectBuildId: "asc-build-01234567",
    internalGroupConfigured: true,
    testedAtUtc: "2026-08-03T23:59:00Z",
    qaReportReference: "QA_REPORT.md",
    purchaseQaReportReference: "PURCHASE_QA_REPORT.md",
    appReviewRunbookReference: "APP_REVIEW_RUNBOOK.md",
  });
  assert.ok(
    validateTestFlightSubmission({
      record: ready,
      expectedAppVersion: "1.0.0",
    }).includes("release mode requires TestFlight approval.owner"),
  );
  for (const key of Object.keys(ready.approval)) ready.approval[key] = true;
  assert.deepEqual(
    validateTestFlightSubmission({
      record: ready,
      expectedAppVersion: "1.0.0",
      release: true,
    }),
    [],
  );

  ready.distributionScope = "external_testing";
  ready.externalBetaReview.required = true;
  assert.ok(
    validateTestFlightSubmission({
      record: ready,
      expectedAppVersion: "1.0.0",
      release: true,
    }).includes(
      "external TestFlight testing requires complete TestFlight App Review configuration",
    ),
  );
});

test("App Review notes draft enforces Apple's 4,000-byte limit", () => {
  const current = fs.readFileSync(
    path.join(DEFAULT_REPO_ROOT, "APP_REVIEW_RUNBOOK.md"),
    "utf8",
  );
  assert.deepEqual(validateAppReviewNotesDraft({ markdown: current }), []);
  assert.deepEqual(
    validateAppReviewNotesDraft({
      markdown: `## App Review notes draft\n\n\`\`\`text\n${"x".repeat(4000)}\n\`\`\``,
    }),
    [],
  );
  assert.ok(
    validateAppReviewNotesDraft({
      markdown: `## App Review notes draft\n\n\`\`\`text\n${"é".repeat(2001)}\n\`\`\``,
    })[0].includes("4,000 UTF-8 bytes or fewer"),
  );
});

test("image inspection accepts supported opaque PNG and rejects every JPEG", () => {
  assert.deepEqual(inspectImage(makePng(1260, 2736), ".png"), {
    format: "png",
    width: 1260,
    height: 2736,
    hasAlpha: false,
  });

  // This encoder-produced fixture contains quantization and Huffman tables,
  // unlike the deliberately corrupt header-only fixture below.
  assert.notEqual(
    GENUINE_ONE_PIXEL_JPEG.indexOf(Buffer.from([0xff, 0xdb])),
    -1,
  );
  assert.notEqual(
    GENUINE_ONE_PIXEL_JPEG.indexOf(Buffer.from([0xff, 0xc4])),
    -1,
  );

  assert.throws(
    () => inspectImage(GENUINE_ONE_PIXEL_JPEG, ".jpeg"),
    /unsupported image extension: \.jpeg/u,
  );
  const corruptJpeg = corruptJpegWithoutTables();
  assert.equal(corruptJpeg.indexOf(Buffer.from([0xff, 0xdb])), -1);
  assert.equal(corruptJpeg.indexOf(Buffer.from([0xff, 0xc4])), -1);
  assert.throws(
    () => inspectImage(corruptJpeg, ".jpg"),
    /unsupported image extension: \.jpg/u,
  );
});

test("image inspection rejects header-only screenshot files", () => {
  const validPng = makePng(1260, 2736);
  const headerOnlyPng = validPng.subarray(0, 33);
  assert.throws(
    () => inspectImage(headerOnlyPng, ".png"),
    /missing PNG image data or IEND/u,
  );
});

test("screenshot validation checks real file dimensions and PNG alpha", (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "cut-app-store-"),
  );
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const assetDirectory = path.join(
    temporaryRoot,
    "app-store/screenshots/files",
  );
  fs.mkdirSync(assetDirectory, { recursive: true });

  const manifest = readJson("app-store/screenshots/manifest.json");
  manifest.shots[0].file = "opaque.png";
  fs.writeFileSync(
    path.join(assetDirectory, "opaque.png"),
    makePng(1290, 2796),
  );
  assert.deepEqual(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }),
    [],
  );

  manifest.shots[0].file = "alpha.png";
  fs.writeFileSync(
    path.join(assetDirectory, "alpha.png"),
    makePng(1290, 2796, 6),
  );
  assert.ok(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }).includes(
      "01-today-next-action must not contain an alpha channel or transparency",
    ),
  );

  manifest.shots[0].file = "wrong-size.png";
  fs.writeFileSync(
    path.join(assetDirectory, "wrong-size.png"),
    makePng(100, 200),
  );
  assert.ok(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }).includes(
      "01-today-next-action has unsupported dimensions 100x200",
    ),
  );
});

test("screenshot SHA-256 binds the manifest to the captured image bytes", (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "cut-app-store-sha-"),
  );
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const assetDirectory = path.join(
    temporaryRoot,
    "app-store/screenshots/files",
  );
  fs.mkdirSync(assetDirectory, { recursive: true });

  const image = makePng(1260, 2736);
  const manifest = readJson("app-store/screenshots/manifest.json");
  manifest.shots[0].file = "bound.png";
  manifest.shots[0].sha256 = createHash("sha256").update(image).digest("hex");
  fs.writeFileSync(path.join(assetDirectory, "bound.png"), image);
  assert.deepEqual(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }),
    [],
  );

  manifest.shots[0].sha256 = "0".repeat(64);
  assert.ok(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }).includes(
      "01-today-next-action sha256 does not match the captured image bytes",
    ),
  );

  manifest.shots[0].sha256 = null;
  assert.ok(
    validateScreenshotManifest({
      manifest,
      repoRoot: temporaryRoot,
      release: true,
    }).includes(
      "release mode requires a SHA-256 digest for 01-today-next-action",
    ),
  );

  delete manifest.shots[0].sha256;
  assert.ok(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }).includes(
      "01-today-next-action must contain exactly the required screenshot keys",
    ),
  );
});

test("PII approval is invalidated when image bytes and hash change", (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "cut-app-store-pii-sha-"),
  );
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const assetDirectory = path.join(
    temporaryRoot,
    "app-store/screenshots/files",
  );
  fs.mkdirSync(assetDirectory, { recursive: true });

  const firstImage = makePng(1260, 2736);
  const secondImage = makePng(1290, 2796);
  const firstSha = createHash("sha256").update(firstImage).digest("hex");
  const secondSha = createHash("sha256").update(secondImage).digest("hex");
  const manifest = readJson("app-store/screenshots/manifest.json");
  const shot = manifest.shots[0];
  shot.file = "reviewed.png";
  shot.sha256 = firstSha;
  Object.assign(shot.piiReview, {
    status: "approved_no_personal_data",
    reviewedSha256: firstSha,
    reviewer: "privacy-reviewer",
    reviewedAtUtc: "2026-08-03T23:59:00Z",
    notes: "Synthetic data only.",
  });
  fs.writeFileSync(path.join(assetDirectory, shot.file), firstImage);
  assert.deepEqual(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }),
    [],
  );

  fs.writeFileSync(path.join(assetDirectory, shot.file), secondImage);
  shot.sha256 = secondSha;
  assert.ok(
    validateScreenshotManifest({
      manifest,
      repoRoot: temporaryRoot,
    }).includes(
      "01-today-next-action PII approval reviewedSha256 must equal the captured image sha256",
    ),
  );

  shot.piiReview.status = "pending";
  assert.ok(
    validateScreenshotManifest({
      manifest,
      repoRoot: temporaryRoot,
    }).includes(
      "01-today-next-action pending PII review must keep reviewedSha256 null",
    ),
  );
});

test("screenshot validation rejects paths outside the controlled asset directory", () => {
  const manifest = readJson("app-store/screenshots/manifest.json");
  manifest.shots[0].file = "../personal.png";
  const errors = validateScreenshotManifest({ manifest });
  assert.ok(
    errors.includes(
      "01-today-next-action file must be a safe filename inside the asset directory",
    ),
  );
});

test("screenshot validation rejects symlinked image evidence", (t) => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "cut-app-store-symlink-"),
  );
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const assetDirectory = path.join(
    temporaryRoot,
    "app-store/screenshots/files",
  );
  fs.mkdirSync(assetDirectory, { recursive: true });
  const outsideImage = path.join(temporaryRoot, "outside.png");
  fs.writeFileSync(outsideImage, makePng(1260, 2736));
  fs.symlinkSync(outsideImage, path.join(assetDirectory, "linked.png"));

  const manifest = readJson("app-store/screenshots/manifest.json");
  manifest.shots[0].file = "linked.png";
  assert.ok(
    validateScreenshotManifest({ manifest, repoRoot: temporaryRoot }).includes(
      "01-today-next-action image must be a regular non-symlink file inside the exact asset directory",
    ),
  );
});

test("release screenshot plan cannot remove required evidence or reuse one file", () => {
  const manifest = readJson("app-store/screenshots/manifest.json");
  manifest.shots[0].requiredForReleaseEvidence = false;
  assert.ok(
    validateScreenshotManifest({ manifest, release: true }).includes(
      "01-today-next-action requiredForReleaseEvidence must match the approved plan",
    ),
  );

  manifest.shots[0].file = "same.png";
  manifest.shots[1].file = "same.png";
  const errors = validateScreenshotManifest({
    manifest,
    readFile: () => makePng(1260, 2736),
    fileExists: () => true,
    lstatFile: (candidate) => ({
      isDirectory: () => candidate.endsWith("app-store/screenshots/files"),
      isFile: () => !candidate.endsWith("app-store/screenshots/files"),
      isSymbolicLink: () => false,
    }),
    realpathFile: (candidate) => candidate,
  });
  assert.ok(errors.includes("captured screenshot filenames must be unique"));
});
