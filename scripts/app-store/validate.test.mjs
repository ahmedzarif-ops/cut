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
  EXPECTED_LISTING_SHOT_IDS,
  inspectImage,
  validateAppReviewNotesDraft,
  validateBundle,
  validateExactBuildBindings,
  validateMetadata,
  validateScreenshotManifest,
  validateSubscriptionIdentity,
  validateTestFlightSubmission,
  verifyAppStoreReleaseEvidenceBoundary,
} from "./validate.mjs";

const APPLE_STANDARD_EULA_TEST_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

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

test("committed owner-approved working App Store records validate", () => {
  assert.deepEqual(validateBundle(), []);
  const { submission } = validationInputs();
  assert.deepEqual(submission.listing.initialTerritories, ["US"]);
  assert.equal(submission.availability.approval.owner, false);
  assert.deepEqual(submission.ownerControlledFields.slice(-3), [
    "availability.distributionMethod.decision",
    "availability.appleSiliconMacAvailability.decision",
    "availability.appleVisionProAvailability.decision",
  ]);
  for (const field of [
    "distributionMethod",
    "appleSiliconMacAvailability",
    "appleVisionProAvailability",
  ]) {
    assert.deepEqual(submission.availability[field], {
      decision: null,
      status: "pending_owner_decision",
      savedAtUtc: null,
      evidenceReference: null,
    });
  }
  assert.equal(submission.commercialAndLegal.appDownloadPrice, "free_download");
  assert.equal(
    submission.subscription.productId,
    "com.zarifahmed.cut.pro.monthly",
  );
  assert.equal(submission.subscription.entitlementId, "CUT_OS_PRO");
  assert.equal(submission.subscription.revenueCat.offeringId, "default");
  assert.equal(submission.subscription.duration, "1_month");
  assert.equal(submission.subscription.usPricing.amount, "4.99");
  assert.equal(submission.subscription.introductoryOfferDecision, "none");
  assert.equal(submission.subscription.familySharingDecision, "disabled");
  assert.equal(
    submission.subscription.localizations["en-US"].description,
    null,
  );
  assert.equal(submission.subscription.approval.owner, false);
});

test("subscription identity binds App Store and mobile release identifiers", () => {
  const { submission, appConfig } = validationInputs();
  const identity = readJson("lib/domain/src/subscriptionIdentity.json");
  assert.deepEqual(
    validateSubscriptionIdentity({ identity, submission, appConfig }),
    [],
  );

  const cases = [
    {
      expected:
        "App Store bundle ID must match the subscription identity contract",
      mutate(record) {
        record.submission.listing.bundleId = "com.example.other";
      },
    },
    {
      expected:
        "mobile iOS bundle identifier must match the subscription identity contract",
      mutate(record) {
        record.appConfig.expo.ios.bundleIdentifier = "com.example.other";
      },
    },
    {
      expected:
        "App Store entitlement ID must match the subscription identity contract",
      mutate(record) {
        record.submission.subscription.entitlementId = "OTHER_PRO";
      },
    },
    {
      expected:
        "App Store RevenueCat offering ID must match the subscription identity contract",
      mutate(record) {
        record.submission.subscription.revenueCat.offeringId = "other";
      },
    },
    {
      expected:
        "App Store subscription product ID must match the subscription identity contract",
      mutate(record) {
        record.submission.subscription.productId =
          "com.zarifahmed.cut.pro.annual";
      },
    },
  ];

  for (const { expected, mutate } of cases) {
    const record = {
      identity: clone(identity),
      submission: clone(submission),
      appConfig: clone(appConfig),
    };
    mutate(record);
    assert.ok(validateSubscriptionIdentity(record).includes(expected));
  }
});

test("subscription identity rejects malformed or unnamespaced canonical data", () => {
  const { submission, appConfig } = validationInputs();
  const identity = readJson("lib/domain/src/subscriptionIdentity.json");
  identity.revenueCat.productId = "unrelated.monthly";
  identity.unreviewedShortcut = true;

  const errors = validateSubscriptionIdentity({
    identity,
    submission,
    appConfig,
  });
  assert.ok(
    errors.includes(
      "subscription identity must contain exactly the required keys",
    ),
  );
  assert.ok(
    errors.includes(
      "subscription identity productId must be namespaced to iosBundleId",
    ),
  );
});

test("calendar-only record dates reject normalized invalid dates", () => {
  const inputs = validationInputs();
  for (const invalidDate of ["2026-02-30", "2026-04-31"]) {
    const submission = clone(inputs.submission);
    submission.updated = invalidDate;
    assert.ok(
      validateMetadata({ ...inputs, submission }).includes(
        "submission.updated must be an ISO calendar date",
      ),
    );

    const record = readJson("app-store/testflight-submission.json");
    record.updated = invalidDate;
    assert.ok(
      validateTestFlightSubmission({
        record,
        expectedAppVersion: "1.0.0",
      }).includes("TestFlight updated must be an ISO calendar date"),
    );
  }
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

test("the initial listing screenshot story includes a clear paid subscription offer", () => {
  const manifest = readJson("app-store/screenshots/manifest.json");
  const captionPlan = fs.readFileSync(
    path.join(
      DEFAULT_REPO_ROOT,
      "app-store/screenshots/LISTING_CAPTION_PLAN.md",
    ),
    "utf8",
  );
  assert.ok(EXPECTED_LISTING_SHOT_IDS.includes("07-subscription-offer"));
  assert.ok(manifest.listingSelection.includes("07-subscription-offer"));
  assert.deepEqual(manifest.listingPaidDisclosure, {
    shotId: "07-subscription-offer",
    cue: "Paid access uses an auto-renewable Apple subscription.",
  });
  assert.equal(
    manifest.shots.find((shot) => shot.id === "07-subscription-offer")
      .intendedUse,
    "listing_candidate_and_in_app_purchase_review_evidence",
  );
  assert.match(
    captionPlan,
    /`07-subscription-offer` — \*\*Paid access uses an auto-renewable Apple subscription\*\*/u,
  );

  manifest.listingSelection = manifest.listingSelection.filter(
    (shotId) => shotId !== "07-subscription-offer",
  );

  assert.ok(
    validateScreenshotManifest({ manifest }).includes(
      "listingSelection must match the approved initial screenshot story including the paid subscription offer",
    ),
  );

  const invalidCue = readJson("app-store/screenshots/manifest.json");
  invalidCue.listingPaidDisclosure.cue = "Unlock more.";
  assert.ok(
    validateScreenshotManifest({ manifest: invalidCue }).includes(
      "screenshots.listingPaidDisclosure must retain the approved paid Apple-subscription cue",
    ),
  );

  const invalidIntendedUse = readJson("app-store/screenshots/manifest.json");
  invalidIntendedUse.shots.find(
    (shot) => shot.id === "07-subscription-offer",
  ).intendedUse = "in_app_purchase_review_evidence";
  assert.ok(
    validateScreenshotManifest({ manifest: invalidIntendedUse }).includes(
      "07-subscription-offer intendedUse must include both listing and in-app-purchase review evidence",
    ),
  );
});

test("release mode stays fail closed while owner, privacy, and screenshot gates are open", () => {
  const errors = validateBundle({ release: true });
  assert.ok(errors.length > 20);
  assert.ok(
    errors.includes(
      "release mode requires an authoritative app_review or public_release evidence target",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires submission.status approved_for_submission",
    ),
  );
  assert.ok(errors.includes("release mode requires listing.sku"));
  assert.ok(
    errors.includes(
      "release mode requires initial territories confirmed in App Store Connect",
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
    errors.includes(
      "release mode requires commercialAndLegal.appleCommerceReadiness.paidAppsAgreement.status confirmed",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires listing.approval.nameClearance.status confirmed",
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
      "release mode requires verified RevenueCat production mapping, customer read/write permission, and Apple credential dashboard evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires RevenueCat restore behavior transfer_to_new_app_user_id with dashboard UTC evidence",
    ),
  );
  assert.ok(
    errors.includes(
      "release mode requires verified restore-after-account-deletion native QA with UTC evidence",
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

  for (const duplicate of [
    "release mode requires listing.contentRightsDeclaration",
    "release mode requires listing.supportUrl",
    "release mode requires listing.privacyPolicyUrl",
    "release mode requires listing.termsUrl",
    "release mode requires listing.initialTerritories",
    "release mode requires appReview.exactBuild.buildNumber",
    "release mode requires screenshots.captureDefaults.buildNumber",
    "release mode requires screenshots.captureDefaults.gitCommit",
    "release mode requires screenshots.captureDefaults.easBuildId",
    "release mode requires screenshots.captureDefaults.appStoreConnectBuildId",
    "captureDefaults.capturedAtUtc must be a UTC ISO timestamp",
    "release mode requires TestFlight exactBuildEvidence.buildNumber",
    "release mode requires a full lowercase Git SHA in TestFlight exactBuildEvidence.gitCommit",
  ]) {
    assert.equal(errors.includes(duplicate), false, duplicate);
  }

  for (const retainedGate of [
    "release mode requires a boolean content-rights declaration",
    "listing.supportUrl must be public HTTPS without credentials",
    "appReview.exactBuild.buildNumber is required",
    "screenshots.captureDefaults.buildNumber is required",
    "release mode requires screenshots.captureDefaults.capturedAtUtc as a UTC ISO timestamp",
    "TestFlight exactBuildEvidence.buildNumber is required",
  ]) {
    assert.ok(errors.includes(retainedGate), retainedGate);
  }
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
      "listing.privacyPolicyUrl must be null or public HTTPS without credentials",
    ),
  );
});

test("listing schema and public metadata URLs fail closed", () => {
  const inputs = validationInputs();

  const missingKey = clone(inputs.submission);
  delete missingKey.listing.ageSuitabilityUrl;
  assert.ok(
    validateMetadata({ ...inputs, submission: missingKey }).includes(
      "listing must contain exactly the required keys",
    ),
  );

  const unknownKey = clone(inputs.submission);
  unknownKey.listing.unreviewedListingField = true;
  assert.ok(
    validateMetadata({ ...inputs, submission: unknownKey }).includes(
      "listing must contain exactly the required keys",
    ),
  );

  for (const [select, expectedError] of [
    [
      (submission) => {
        submission.listing.marketingUrl = "https://localhost/marketing";
      },
      "listing.marketingUrl must be null or a public HTTPS URL without credentials",
    ],
    [
      (submission) => {
        submission.listing.supportUrl = "https://internal/support";
      },
      "listing.supportUrl must be null or public HTTPS without credentials",
    ],
    [
      (submission) => {
        submission.listing.privacyPolicyUrl = "https://127.0.0.1/privacy";
      },
      "listing.privacyPolicyUrl must be null or public HTTPS without credentials",
    ],
    [
      (submission) => {
        submission.listing.termsUrl = "https://terms.local/terms";
      },
      "listing.termsUrl must be null or public HTTPS without credentials",
    ],
    [
      (submission) => {
        submission.listing.ageSuitabilityUrl = "javascript:alert(1)";
      },
      "listing.ageSuitabilityUrl must be null or public HTTPS without credentials",
    ],
    [
      (submission) => {
        submission.listing.supportUrl = " https://example.com/support";
      },
      "listing.supportUrl must be null or public HTTPS without credentials",
    ],
    [
      (submission) => {
        submission.listing.ageSuitabilityUrl =
          "https://exa\nmple.com/age-suitability";
      },
      "listing.ageSuitabilityUrl must be null or public HTTPS without credentials",
    ],
    [
      (submission) => {
        submission.accessibility.accessibilityUrl =
          "https://accessibility.invalid/label";
      },
      "accessibility.accessibilityUrl must be null or public HTTPS without credentials",
    ],
  ]) {
    const submission = clone(inputs.submission);
    select(submission);
    assert.ok(
      validateMetadata({ ...inputs, submission }).includes(expectedError),
    );
  }
});

test("release and confirmed listings bind exact legal URLs to Apple-accepted metadata paths and the selected EULA", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const privacyError =
    "release mode requires exact listing.privacyPolicyUrl in an Apple-accepted metadata path";
  const termsError =
    "release mode requires exact listing.termsUrl in an Apple-accepted metadata path tied to commercialAndLegal.licenseAgreement";
  const confirmedPrivacyError =
    "confirmed listing.approval requires exact listing.privacyPolicyUrl in an Apple-accepted metadata path";
  const confirmedTermsError =
    "confirmed listing.approval requires exact listing.termsUrl in an Apple-accepted metadata path tied to commercialAndLegal.licenseAgreement";
  const confirmedPrivacyUrlError =
    "confirmed listing.approval requires listing.privacyPolicyUrl to be public HTTPS without credentials";
  const confirmedTermsUrlError =
    "confirmed listing.approval requires listing.termsUrl to be public HTTPS without credentials";
  const confirmationLabel =
    "listing.legalUrlPlacement.appStoreConnectConfirmation";

  const confirmedListing = clone(inputs.submission);
  const confirmedApproval = confirmedListing.listing.approval;
  confirmedApproval.status = "confirmed";
  for (const field of [
    "nameClearance",
    "appStoreConnectNameAcceptance",
    "ownerApproval",
    "legalReview",
    "nutritionReview",
  ]) {
    Object.assign(confirmedApproval[field], {
      status: "confirmed",
      verifiedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: `evidence/listing-${field}`,
    });
  }
  Object.assign(confirmedApproval.exactBuildClaimsReview, {
    status: "confirmed",
    buildNumber: "1",
    gitCommit: "0123456789abcdef0123456789abcdef01234567",
    easBuildId: "eas-build-01234567",
    appStoreConnectBuildId: "asc-build-01234567",
    verifiedAtUtc: "2026-08-03T23:59:00Z",
    evidenceReference: "evidence/listing-exact-build-claims",
  });
  let confirmedErrors = validateMetadata({
    ...inputs,
    submission: confirmedListing,
  });
  assert.ok(confirmedErrors.includes(confirmedPrivacyUrlError));
  assert.ok(confirmedErrors.includes(confirmedTermsUrlError));

  confirmedListing.listing.privacyPolicyUrl = "https://cutos.app/privacy";
  confirmedListing.listing.termsUrl = "https://cutos.app/terms";
  confirmedListing.commercialAndLegal.licenseAgreement = "custom_eula";
  confirmedErrors = validateMetadata({
    ...inputs,
    submission: confirmedListing,
  });
  assert.ok(
    confirmedErrors.includes(
      `confirmed listing.approval requires ${confirmationLabel}.status confirmed`,
    ),
  );
  assert.ok(confirmedErrors.includes(confirmedPrivacyError));
  assert.ok(confirmedErrors.includes(confirmedTermsError));

  confirmedListing.listing.legalUrlPlacement.privacyPolicy =
    "app_store_connect_privacy_policy_url";
  confirmedListing.listing.legalUrlPlacement.privacyPolicySubmittedUrl =
    confirmedListing.listing.privacyPolicyUrl;
  confirmedListing.listing.legalUrlPlacement.terms =
    "app_store_connect_custom_license_agreement";
  confirmedListing.listing.legalUrlPlacement.termsSubmittedUrl =
    confirmedListing.listing.termsUrl;
  Object.assign(
    confirmedListing.listing.legalUrlPlacement.appStoreConnectConfirmation,
    {
      status: "confirmed",
      verifiedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: "evidence/app-store-legal-url-placement",
    },
  );
  confirmedErrors = validateMetadata({
    ...inputs,
    submission: confirmedListing,
  });
  assert.deepEqual(confirmedErrors, []);

  confirmedListing.listing.legalUrlPlacement.termsSubmittedUrl =
    "https://cutos.app/terms-mismatch";
  confirmedErrors = validateMetadata({
    ...inputs,
    submission: confirmedListing,
  });
  assert.ok(confirmedErrors.includes(confirmedTermsError));

  submission.listing.privacyPolicyUrl = "https://cutos.app/privacy";
  submission.listing.termsUrl = "https://cutos.app/terms";
  submission.commercialAndLegal.licenseAgreement = "standard_apple_eula";
  submission.listing.legalUrlPlacement.privacyPolicy =
    "app_store_connect_privacy_policy_url";
  submission.listing.legalUrlPlacement.privacyPolicySubmittedUrl =
    submission.listing.privacyPolicyUrl;
  submission.listing.legalUrlPlacement.terms = "listing_description";
  submission.listing.legalUrlPlacement.termsSubmittedUrl =
    submission.listing.termsUrl;

  let errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(
    errors.includes(
      `release mode requires ${confirmationLabel}.status confirmed`,
    ),
  );
  Object.assign(
    submission.listing.legalUrlPlacement.appStoreConnectConfirmation,
    {
      status: "confirmed",
      verifiedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: "evidence/app-store-legal-url-placement",
    },
  );
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.equal(
    errors.some((error) => error.includes(confirmationLabel)),
    false,
  );
  assert.equal(errors.includes(privacyError), false);
  assert.ok(errors.includes(termsError));

  submission.listing.legalUrlPlacement.privacyPolicySubmittedUrl =
    "https://cutos.app/privacy-wrong";
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(errors.includes(privacyError));
  submission.listing.legalUrlPlacement.privacyPolicySubmittedUrl =
    submission.listing.privacyPolicyUrl;

  submission.listing.description +=
    "\n\nPrivacy Policy: https://cutos.app/privacy\nTerms of Use: https://cutos.app/terms-wrong";
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(errors.includes(termsError));

  submission.listing.description = submission.listing.description.replace(
    "https://cutos.app/terms-wrong",
    "https://cutos.app/terms",
  );
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.equal(errors.includes(termsError), false);

  submission.listing.legalUrlPlacement.privacyPolicy = "listing_description";
  submission.listing.description = submission.listing.description.replace(
    "https://cutos.app/privacy",
    "https://cutos.app/privacy-wrong",
  );
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(errors.includes(privacyError));

  submission.listing.termsUrl = APPLE_STANDARD_EULA_TEST_URL;
  submission.listing.legalUrlPlacement.termsSubmittedUrl =
    APPLE_STANDARD_EULA_TEST_URL;
  submission.listing.legalUrlPlacement.terms =
    "app_store_connect_standard_eula";
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.equal(errors.includes(termsError), false);

  submission.listing.termsUrl = "https://cutos.app/terms";
  submission.listing.legalUrlPlacement.termsSubmittedUrl =
    submission.listing.termsUrl;
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(errors.includes(termsError));

  submission.listing.legalUrlPlacement.terms =
    "app_store_connect_custom_license_agreement";
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(errors.includes(termsError));

  submission.commercialAndLegal.licenseAgreement = "custom_eula";
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.equal(errors.includes(termsError), false);

  submission.listing.legalUrlPlacement.appStoreConnectConfirmation.evidenceReference =
    null;
  errors = validateMetadata({ ...inputs, submission, release: true });
  assert.ok(
    errors.includes(
      `${confirmationLabel} confirmed status requires evidenceReference`,
    ),
  );
});

test("Apple commerce readiness is structured and evidence-gated", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const readiness = submission.commercialAndLegal.appleCommerceReadiness;

  readiness.developerProgramMembership.status = "confirmed";
  let errors = validateMetadata({ ...inputs, submission });
  assert.ok(
    errors.includes(
      "commercialAndLegal.appleCommerceReadiness.developerProgramMembership confirmed status requires verifiedAtUtc",
    ),
  );
  assert.ok(
    errors.includes(
      "commercialAndLegal.appleCommerceReadiness.developerProgramMembership confirmed status requires evidenceReference",
    ),
  );

  readiness.status = "confirmed";
  for (const field of [
    "developerProgramMembership",
    "accountHolderAccess",
    "paidAppsAgreement",
    "taxForms",
    "banking",
  ]) {
    Object.assign(readiness[field], {
      status: "confirmed",
      verifiedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: `evidence/apple-commerce-${field}`,
    });
  }
  errors = validateMetadata({ ...inputs, submission });
  assert.equal(
    errors.some((error) => error.includes("appleCommerceReadiness")),
    false,
  );

  readiness.banking.evidenceReference = null;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "commercialAndLegal.appleCommerceReadiness.banking confirmed status requires evidenceReference",
    ),
  );
});

test("listing approvals require name, owner, legal, nutrition, and exact-build evidence", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const approval = submission.listing.approval;

  approval.nameClearance.status = "confirmed";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "listing.approval.nameClearance confirmed status requires verifiedAtUtc",
    ),
  );

  approval.status = "confirmed";
  for (const field of [
    "nameClearance",
    "appStoreConnectNameAcceptance",
    "ownerApproval",
    "legalReview",
    "nutritionReview",
  ]) {
    Object.assign(approval[field], {
      status: "confirmed",
      verifiedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: `evidence/listing-${field}`,
    });
  }
  Object.assign(approval.exactBuildClaimsReview, {
    status: "confirmed",
    buildNumber: "1",
    gitCommit: "0123456789abcdef0123456789abcdef01234567",
    easBuildId: "eas-build-01234567",
    appStoreConnectBuildId: "asc-build-01234567",
    verifiedAtUtc: "2026-08-03T23:59:00Z",
    evidenceReference: "evidence/listing-exact-build-claims",
  });
  submission.listing.privacyPolicyUrl = "https://cutos.app/privacy";
  submission.listing.termsUrl = "https://cutos.app/terms";
  submission.commercialAndLegal.licenseAgreement = "custom_eula";
  Object.assign(submission.listing.legalUrlPlacement, {
    privacyPolicy: "app_store_connect_privacy_policy_url",
    privacyPolicySubmittedUrl: submission.listing.privacyPolicyUrl,
    terms: "app_store_connect_custom_license_agreement",
    termsSubmittedUrl: submission.listing.termsUrl,
  });
  Object.assign(
    submission.listing.legalUrlPlacement.appStoreConnectConfirmation,
    {
      status: "confirmed",
      verifiedAtUtc: "2026-08-03T23:59:00Z",
      evidenceReference: "evidence/app-store-legal-url-placement",
    },
  );
  const errors = validateMetadata({ ...inputs, submission });
  assert.equal(
    errors.some((error) => error.includes("listing.approval")),
    false,
  );

  approval.legalReview.evidenceReference = null;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "listing.approval.legalReview confirmed status requires evidenceReference",
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
  missingApprovals.listing.approval = {};
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
  assert.ok(
    missingErrors.includes(
      "listing.approval must contain exactly the required keys",
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
  submission.commercialAndLegal.appleCommerceReadiness.unreviewedShortcut = true;
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
  assert.ok(
    errors.includes(
      "commercialAndLegal.appleCommerceReadiness must contain exactly the required keys",
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
  submission.subscription.revenueCat.customerReadWritePermissionStatus =
    "verified";
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
      "verified RevenueCat customer read/write permission requires dashboard UTC evidence",
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

test("RevenueCat restore after account deletion requires transfer behavior and native QA evidence", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const restore =
    submission.subscription.revenueCat.restoreAfterAccountDeletion;

  restore.dashboardBehavior = "keep_with_original_app_user_id";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "subscription.revenueCat.restoreAfterAccountDeletion.dashboardBehavior must be pending or transfer_to_new_app_user_id",
    ),
  );

  restore.dashboardBehavior = "transfer_to_new_app_user_id";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "transfer_to_new_app_user_id RevenueCat restore behavior requires dashboard UTC evidence",
    ),
  );

  restore.dashboardVerifiedAtUtc = "2026-08-03T23:58:00Z";
  restore.dashboardEvidenceReference = "evidence/revenuecat-restore-behavior";
  restore.nativeQaStatus = "verified";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "verified restore-after-account-deletion native QA requires UTC evidence",
    ),
  );

  restore.nativeQaTestedAtUtc = "2026-08-03T23:59:00Z";
  restore.nativeQaEvidenceReference =
    "evidence/restore-after-account-deletion-native-qa";
  assert.equal(
    validateMetadata({ ...inputs, submission }).some((error) =>
      /restoreAfterAccountDeletion|restore-after-account-deletion|RevenueCat restore behavior/u.test(
        error,
      ),
    ),
    false,
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
  submission.availability.approval.owner = false;
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

test("distribution and compatible-platform availability require explicit saved decisions", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const decisionLabels = [
    "availability.distributionMethod",
    "availability.appleSiliconMacAvailability",
    "availability.appleVisionProAvailability",
  ];

  const releaseErrors = validateMetadata({
    ...inputs,
    submission,
    release: true,
    releaseTarget: "app_review",
  });
  for (const label of decisionLabels) {
    assert.ok(
      releaseErrors.includes(
        `release mode requires ${label}.status confirmed_in_app_store_connect`,
      ),
    );
    assert.ok(
      releaseErrors.includes(`release mode requires ${label}.decision`),
    );
    assert.ok(
      releaseErrors.includes(
        `release mode requires ${label} saved UTC evidence`,
      ),
    );
  }

  submission.availability.approval.owner = true;
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "availability.approval.owner requires explicit distribution, Mac, and Vision Pro owner decisions",
    ),
  );
  submission.availability.approval.owner = false;

  submission.availability.distributionMethod.decision = "public";
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "availability.distributionMethod pending_owner_decision requires a null decision and null App Store Connect evidence",
    ),
  );

  Object.assign(submission.availability.distributionMethod, {
    decision: null,
    status: "pending_app_store_connect_confirmation",
  });
  assert.ok(
    validateMetadata({ ...inputs, submission }).includes(
      "availability.distributionMethod pending_app_store_connect_confirmation requires an explicit owner decision",
    ),
  );

  Object.assign(submission.availability.distributionMethod, {
    decision: "public",
    status: "confirmed_in_app_store_connect",
    savedAtUtc: "not-a-timestamp",
    evidenceReference: null,
  });
  const missingSavedEvidence = validateMetadata({ ...inputs, submission });
  assert.ok(
    missingSavedEvidence.includes(
      "availability.distributionMethod.savedAtUtc must be null or a UTC ISO timestamp",
    ),
  );
  assert.ok(
    missingSavedEvidence.includes(
      "confirmed availability requires availability.distributionMethod saved UTC evidence",
    ),
  );
});

test("availability schema accepts only App Store distribution and platform choices", () => {
  const inputs = validationInputs();
  const invalid = clone(inputs.submission);
  invalid.availability.distributionMethod.decision = "automatic_default";
  invalid.availability.appleSiliconMacAvailability.decision =
    "automatic_default";
  invalid.availability.appleVisionProAvailability.unreviewedShortcut = true;
  const invalidErrors = validateMetadata({ ...inputs, submission: invalid });
  assert.ok(
    invalidErrors.includes(
      "availability.distributionMethod.decision is invalid",
    ),
  );
  assert.ok(
    invalidErrors.includes(
      "availability.appleSiliconMacAvailability.decision is invalid",
    ),
  );
  assert.ok(
    invalidErrors.includes(
      "availability.appleVisionProAvailability must contain exactly decision, status, savedAtUtc, and evidenceReference",
    ),
  );

  const confirmed = clone(inputs.submission);
  confirmed.availability.status = "confirmed_in_app_store_connect";
  confirmed.availability.approval.owner = true;
  confirmed.availability.approval.appStoreConnectConfirmed = true;
  const evidenceTime = "2026-08-04T12:00:00Z";
  for (const [field, decision] of [
    ["distributionMethod", "public"],
    ["appleSiliconMacAvailability", "do_not_make_available"],
    ["appleVisionProAvailability", "make_available"],
  ]) {
    Object.assign(confirmed.availability[field], {
      decision,
      status: "confirmed_in_app_store_connect",
      savedAtUtc: evidenceTime,
      evidenceReference: `evidence/${field}`,
    });
  }
  const confirmedErrors = validateMetadata({
    ...inputs,
    submission: confirmed,
    release: true,
    releaseTarget: "app_review",
  }).filter(
    (error) =>
      error.startsWith("availability") ||
      error.includes("requires availability."),
  );
  assert.deepEqual(confirmedErrors, []);
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

  const listingApproval = submission.listing.approval;
  listingApproval.status = "confirmed";
  for (const field of [
    "nameClearance",
    "appStoreConnectNameAcceptance",
    "ownerApproval",
    "legalReview",
    "nutritionReview",
  ]) {
    Object.assign(listingApproval[field], {
      status: "confirmed",
      verifiedAtUtc: evidenceTime,
      evidenceReference: `evidence/listing-${field}`,
    });
  }
  Object.assign(listingApproval.exactBuildClaimsReview, exactBuildIdentity, {
    status: "confirmed",
    verifiedAtUtc: evidenceTime,
    evidenceReference: "evidence/listing-exact-build-claims",
  });

  const commercial = submission.commercialAndLegal;
  commercial.status = "confirmed_in_app_store_connect";
  commercial.appDownloadPrice = "free_download";
  commercial.licenseAgreement = "standard_apple_eula";
  commercial.appTaxCategory = "Health and Fitness";
  commercial.dsaStatus = "trader";
  commercial.appleCommerceReadiness.status = "confirmed";
  for (const field of [
    "developerProgramMembership",
    "accountHolderAccess",
    "paidAppsAgreement",
    "taxForms",
    "banking",
  ]) {
    Object.assign(commercial.appleCommerceReadiness[field], {
      status: "confirmed",
      verifiedAtUtc: evidenceTime,
      evidenceReference: `evidence/apple-commerce-${field}`,
    });
  }
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
  Object.assign(appReview.clerkReviewAccess, {
    clientTrustEnabled: true,
    allReviewAccountsUseReservedTestEmail: true,
    exactBuildClientTrustFlowVerified: true,
    testModeState: "enabled_for_app_review",
    verifiedAtUtc: evidenceTime,
    evidenceReference: "evidence/clerk-review-access",
  });
  Object.assign(appReview.clerkReviewAccess.shutdownControl, {
    primaryOwner: "release-lead",
    backupOwner: "security-owner",
    bothHaveProductionClerkAccess: true,
    statusMonitoringConfigured: true,
    escalationConfigured: true,
    accessPreflightAtUtc: evidenceTime,
    accessPreflightEvidenceReference:
      "evidence/clerk-shutdown-access-preflight",
  });
  Object.assign(appReview.appleWorkflow, {
    state: "ready_for_review",
    submissionReference: "asc-submission-v1",
    appVersionIncluded: true,
    subscriptionIncluded: true,
    subscriptionGroupIncluded: true,
    manualReleaseSelected: true,
    appVersionStatus: "ready_for_review",
    submissionSection: "drafts",
    reviewActive: false,
    allSubmittedItemsAccepted: false,
    verifiedAtUtc: evidenceTime,
    evidenceReference: "evidence/apple-draft-ready-for-review",
  });
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
  subscription.revenueCat.customerReadWritePermissionStatus = "verified";
  subscription.revenueCat.verifiedAtUtc = evidenceTime;
  subscription.revenueCat.evidenceReference =
    "evidence/revenuecat-production-mapping";
  Object.assign(subscription.revenueCat.restoreAfterAccountDeletion, {
    dashboardBehavior: "transfer_to_new_app_user_id",
    dashboardVerifiedAtUtc: evidenceTime,
    dashboardEvidenceReference: "evidence/revenuecat-restore-behavior",
    nativeQaStatus: "verified",
    nativeQaTestedAtUtc: evidenceTime,
    nativeQaEvidenceReference:
      "evidence/restore-after-account-deletion-native-qa",
  });
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
    releaseTarget: "app_review",
  });
  const gateErrors = errors.filter((error) =>
    /commercialAndLegal|appReview|subscription|RevenueCat|accessibility/u.test(
      error,
    ),
  );
  assert.deepEqual(gateErrors, []);

  subscription.revenueCat.customerReadWritePermissionStatus = "pending";
  assert.ok(
    validateMetadata({ ...inputs, submission, release: true }).includes(
      "release mode requires verified RevenueCat production mapping, customer read/write permission, and Apple credential dashboard evidence",
    ),
  );
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
    [
      "listing.approval.exactBuildClaimsReview",
      (submission) => submission.listing.approval.exactBuildClaimsReview,
    ],
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
      "appReview.accountStates.fullAccess verified_fresh evidence requires no user-configured MFA or out-of-band delivery trap and a successful fixed-code Client Trust challenge",
    ),
  );

  account.noMfaOrOutOfBandTrap = true;
  account.testedAtUtc = "2026-08-02T23:59:59Z";
  const publicReleaseErrors = validateMetadata({
    ...inputs,
    submission,
    release: true,
    releaseTarget: "public_release",
  });
  assert.equal(
    publicReleaseErrors.includes(
      "appReview.accountStates.fullAccess verified_fresh evidence must be no more than 24 hours old",
    ),
    false,
  );
  assert.equal(
    publicReleaseErrors.includes(
      "release mode requires retained historical evidence for appReview.accountStates.fullAccess",
    ),
    false,
  );

  account.status = "pending";
  account.nonExpiring = false;
  account.noMfaOrOutOfBandTrap = false;
  account.testedAtUtc = null;
  account.evidenceReference = null;
  assert.ok(
    validateMetadata({
      ...inputs,
      submission,
      release: true,
      releaseTarget: "public_release",
    }).includes(
      "release mode requires retained historical evidence for appReview.accountStates.fullAccess",
    ),
  );
});

test("Clerk review access is closed, fresh, and bound to the authoritative release target", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const access = submission.appReview.clerkReviewAccess;
  const shutdown = access.shutdownControl;
  const clerkAccessErrors = (releaseTarget) =>
    validateMetadata({
      ...inputs,
      submission,
      release: true,
      releaseTarget,
    }).filter((error) =>
      /appReview\.clerkReviewAccess|Clerk|shutdownControl/u.test(error),
    );

  assert.equal(
    validateMetadata({
      ...inputs,
      submission,
      releaseTarget: "app_review",
    }).some((error) =>
      /app_review release target|public_release target/u.test(error),
    ),
    false,
  );

  Object.assign(access, {
    clientTrustEnabled: true,
    allReviewAccountsUseReservedTestEmail: true,
    exactBuildClientTrustFlowVerified: true,
    testModeState: "enabled_for_app_review",
    verifiedAtUtc: "2026-08-03T23:59:00Z",
    evidenceReference: "evidence/clerk-review-access",
  });
  Object.assign(shutdown, {
    primaryOwner: "release-lead",
    backupOwner: "security-owner",
    bothHaveProductionClerkAccess: true,
    statusMonitoringConfigured: true,
    escalationConfigured: true,
    accessPreflightAtUtc: "2026-08-03T23:30:00Z",
    accessPreflightEvidenceReference:
      "evidence/clerk-shutdown-access-preflight",
  });
  assert.deepEqual(clerkAccessErrors("app_review"), []);

  shutdown.statusSource = "manual_guess";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "appReview.clerkReviewAccess.shutdownControl.statusSource must remain exact_app_store_connect_submission",
    ),
  );
  shutdown.statusSource = "exact_app_store_connect_submission";
  shutdown.closureSloMinutes = 20;
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "appReview.clerkReviewAccess.shutdownControl.closureSloMinutes must remain 15",
    ),
  );
  shutdown.closureSloMinutes = 15;
  for (const field of [
    "bothHaveProductionClerkAccess",
    "statusMonitoringConfigured",
    "escalationConfigured",
  ]) {
    shutdown[field] = false;
    assert.ok(
      clerkAccessErrors("app_review").includes(
        `configured Clerk review access requires shutdownControl.${field}`,
      ),
    );
    shutdown[field] = true;
  }
  shutdown.accessPreflightAtUtc = "2026-08-02T23:29:59Z";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "Clerk shutdown-access preflight evidence must be no more than 24 hours old for app_review",
    ),
  );
  shutdown.accessPreflightAtUtc = "2026-08-04T00:00:01Z";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "appReview.clerkReviewAccess.shutdownControl.accessPreflightAtUtc cannot be in the future",
    ),
  );
  shutdown.accessPreflightAtUtc = "2026-08-03T23:30:00Z";
  shutdown.triggerObservedAtUtc = "2026-08-03T23:45:00Z";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "enabled App Review access must keep shutdownControl.triggerObservedAtUtc null",
    ),
  );
  shutdown.triggerObservedAtUtc = null;

  access.testModeState = "disabled_for_public_release";
  Object.assign(shutdown, {
    triggerObservedAtUtc: "2026-08-03T23:45:00Z",
    testModeDisabledAtUtc: "2026-08-03T23:55:00Z",
    shutdownEvidenceReference: "evidence/clerk-test-mode-shutdown",
  });
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "app_review release target requires Clerk production test mode enabled_for_app_review",
    ),
  );
  assert.deepEqual(clerkAccessErrors("public_release"), []);

  shutdown.triggerObservedAtUtc = "2026-08-03T23:40:00Z";
  shutdown.testModeDisabledAtUtc = "2026-08-03T23:55:00Z";
  assert.deepEqual(clerkAccessErrors("public_release"), []);
  shutdown.testModeDisabledAtUtc = "2026-08-03T23:55:00.001Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk production test mode must be disabled within 15 minutes of the observed submission-state trigger",
    ),
  );
  shutdown.triggerObservedAtUtc = "2026-08-03T23:45:00Z";
  shutdown.testModeDisabledAtUtc = "2026-08-03T23:55:00Z";

  shutdown.shutdownEvidenceReference =
    shutdown.accessPreflightEvidenceReference;
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk shutdown evidence must be distinct from access-preflight evidence",
    ),
  );
  shutdown.shutdownEvidenceReference = "evidence/clerk-test-mode-shutdown";

  shutdown.triggerObservedAtUtc = "2026-08-03T23:50:00Z";
  shutdown.testModeDisabledAtUtc = "2026-08-03T23:59:30Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk shutdown verification cannot predate test-mode disablement",
    ),
  );
  shutdown.triggerObservedAtUtc = "2026-08-03T23:59:30Z";
  shutdown.testModeDisabledAtUtc = "2026-08-04T00:00:01Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk shutdown timestamps cannot be in the future",
    ),
  );
  shutdown.accessPreflightAtUtc = "2026-08-02T23:30:00Z";
  shutdown.triggerObservedAtUtc = "2026-08-02T23:45:00Z";
  shutdown.testModeDisabledAtUtc = "2026-08-02T23:55:00Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk shutdown evidence must be no more than 24 hours old",
    ),
  );
  shutdown.accessPreflightAtUtc = "2026-08-01T23:30:00Z";
  shutdown.triggerObservedAtUtc = "2026-08-03T23:45:00Z";
  shutdown.testModeDisabledAtUtc = "2026-08-03T23:55:00Z";
  assert.deepEqual(clerkAccessErrors("public_release"), []);
  shutdown.accessPreflightAtUtc = "2026-08-03T23:30:00Z";

  shutdown.accessPreflightAtUtc = "2026-08-03T23:46:00Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk shutdown-access preflight must precede the observed submission-state trigger",
    ),
  );
  shutdown.accessPreflightAtUtc = "2026-08-03T23:30:00Z";

  shutdown.triggerObservedAtUtc = "2026-08-03T23:39:00Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk production test mode must be disabled within 15 minutes of the observed submission-state trigger",
    ),
  );
  shutdown.triggerObservedAtUtc = "2026-08-03T23:56:00Z";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "Clerk production test mode must be disabled within 15 minutes of the observed submission-state trigger",
    ),
  );
  shutdown.triggerObservedAtUtc = "2026-08-03T23:45:00Z";
  shutdown.backupOwner = "release-lead";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "configured Clerk review access requires distinct primary and backup shutdown owners",
    ),
  );
  shutdown.backupOwner = "security-owner";

  access.testModeState = "enabled_for_app_review";
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "public_release target requires Clerk production test mode disabled_for_public_release",
    ),
  );
  access.testModeState = "disabled_for_public_release";
  access.clientTrustEnabled = false;
  assert.ok(
    clerkAccessErrors("public_release").includes(
      "public_release target requires Clerk Client Trust to remain enabled",
    ),
  );

  access.clientTrustEnabled = true;
  access.testModeState = "enabled_for_app_review";
  shutdown.triggerObservedAtUtc = null;
  shutdown.testModeDisabledAtUtc = null;
  shutdown.shutdownEvidenceReference = null;
  access.allReviewAccountsUseReservedTestEmail = false;
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "app_review release target requires all Clerk review accounts to use reserved +clerk_test email addresses",
    ),
  );
  access.allReviewAccountsUseReservedTestEmail = true;
  access.exactBuildClientTrustFlowVerified = false;
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "app_review release target requires exact-build Client Trust verification with Clerk's reserved fixed code",
    ),
  );

  access.exactBuildClientTrustFlowVerified = true;
  access.strategy = "arbitrary_review_bypass";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "appReview.clerkReviewAccess.strategy must remain clerk_production_test_mode_reserved_email_code",
    ),
  );
  access.strategy = "clerk_production_test_mode_reserved_email_code";
  access.fixedCodePolicy = "custom_code";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "appReview.clerkReviewAccess.fixedCodePolicy must remain clerk_reserved_424242",
    ),
  );

  access.fixedCodePolicy = "clerk_reserved_424242";
  access.verifiedAtUtc = "2026-08-02T23:59:59Z";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "appReview.clerkReviewAccess evidence must be no more than 24 hours old",
    ),
  );
  access.verifiedAtUtc = "2026-08-04T00:00:01Z";
  const futureErrors = clerkAccessErrors("app_review");
  assert.ok(
    futureErrors.includes(
      "appReview.clerkReviewAccess.verifiedAtUtc cannot be in the future",
    ),
  );
  assert.equal(
    futureErrors.includes(
      "appReview.clerkReviewAccess evidence must be no more than 24 hours old",
    ),
    false,
  );

  access.verifiedAtUtc = "2026-02-30T23:59:00Z";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "configured appReview.clerkReviewAccess requires UTC and non-secret evidence",
    ),
  );
  access.verifiedAtUtc = "2026-08-03T24:00:00Z";
  assert.ok(
    clerkAccessErrors("app_review").includes(
      "configured appReview.clerkReviewAccess requires UTC and non-secret evidence",
    ),
  );

  const missingKey = clone(inputs.submission);
  delete missingKey.appReview.clerkReviewAccess.fixedCodePolicy;
  assert.ok(
    validateMetadata({ ...inputs, submission: missingKey }).includes(
      "appReview.clerkReviewAccess must contain exactly the required non-secret release-access keys",
    ),
  );
  const extraKey = clone(inputs.submission);
  extraKey.appReview.clerkReviewAccess.actualReviewEmail = "must-not-be-stored";
  assert.ok(
    validateMetadata({ ...inputs, submission: extraKey }).includes(
      "appReview.clerkReviewAccess must contain exactly the required non-secret release-access keys",
    ),
  );

  const missingShutdownKey = clone(inputs.submission);
  delete missingShutdownKey.appReview.clerkReviewAccess.shutdownControl
    .closureSloMinutes;
  assert.ok(
    validateMetadata({ ...inputs, submission: missingShutdownKey }).includes(
      "appReview.clerkReviewAccess.shutdownControl must contain exactly the required non-secret shutdown keys",
    ),
  );

  assert.ok(
    validateMetadata({
      ...inputs,
      submission,
      release: true,
      releaseTarget: "internal_testflight",
    }).includes(
      "release mode requires an authoritative app_review or public_release evidence target",
    ),
  );
});

test("Apple workflow evidence is closed, fresh, and bound to the authoritative release target", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  const workflow = submission.appReview.appleWorkflow;
  const workflowErrors = (releaseTarget, release = true) =>
    validateMetadata({
      ...inputs,
      submission,
      release,
      releaseTarget,
    }).filter((error) =>
      /appReview\.appleWorkflow|Apple workflow|Apple app version|Apple submission|active Apple review|Apple acceptance|submitted items accepted/u.test(
        error,
      ),
    );

  assert.deepEqual(workflowErrors(null, false), []);

  Object.assign(workflow, {
    state: "ready_for_review",
    submissionReference: "asc-submission-v1",
    appVersionIncluded: true,
    subscriptionIncluded: true,
    subscriptionGroupIncluded: true,
    manualReleaseSelected: true,
    appVersionStatus: "ready_for_review",
    submissionSection: "drafts",
    reviewActive: false,
    allSubmittedItemsAccepted: false,
    verifiedAtUtc: "2026-08-03T23:59:00Z",
    evidenceReference: "evidence/apple-draft-ready-for-review",
  });
  assert.deepEqual(workflowErrors("app_review"), []);

  submission.appReview.status = "ready_for_review";
  assert.deepEqual(workflowErrors(null, false), []);

  Object.assign(workflow, {
    state: "approved_pending_developer_release",
    appVersionStatus: "pending_developer_release",
    submissionSection: "completed",
    allSubmittedItemsAccepted: true,
    evidenceReference: "evidence/apple-approved-for-manual-release",
  });
  assert.deepEqual(workflowErrors("public_release"), []);

  workflow.submissionSection = "accepted";
  assert.ok(
    workflowErrors("public_release").includes(
      "appReview.appleWorkflow.submissionSection is invalid",
    ),
  );
  workflow.submissionSection = "completed";
  workflow.reviewActive = true;
  assert.ok(
    workflowErrors("public_release").includes(
      "public_release target requires no active Apple review",
    ),
  );
  workflow.reviewActive = false;
  workflow.manualReleaseSelected = false;
  assert.ok(
    workflowErrors("public_release").includes(
      "public_release target requires appReview.appleWorkflow.manualReleaseSelected",
    ),
  );
  workflow.manualReleaseSelected = true;
  workflow.allSubmittedItemsAccepted = false;
  assert.ok(
    workflowErrors("public_release").includes(
      "public_release target requires all submitted items accepted",
    ),
  );

  workflow.allSubmittedItemsAccepted = true;
  workflow.verifiedAtUtc = "2026-08-02T23:59:59Z";
  assert.ok(
    workflowErrors("public_release").includes(
      "appReview.appleWorkflow evidence must be no more than 24 hours old",
    ),
  );
  workflow.verifiedAtUtc = "2026-08-04T00:00:01Z";
  const futureErrors = workflowErrors("public_release");
  assert.ok(
    futureErrors.includes(
      "appReview.appleWorkflow.verifiedAtUtc cannot be in the future",
    ),
  );
  assert.equal(
    futureErrors.includes(
      "appReview.appleWorkflow evidence must be no more than 24 hours old",
    ),
    false,
  );
  workflow.verifiedAtUtc = "2026-02-30T23:59:00Z";
  assert.ok(
    workflowErrors("public_release").includes(
      "configured appReview.appleWorkflow requires a submission reference, UTC, and non-secret evidence",
    ),
  );
  workflow.verifiedAtUtc = "2026-08-03T24:00:00Z";
  assert.ok(
    workflowErrors("public_release").includes(
      "configured appReview.appleWorkflow requires a submission reference, UTC, and non-secret evidence",
    ),
  );

  const closedPending = clone(inputs.submission);
  closedPending.appReview.appleWorkflow.appVersionIncluded = true;
  assert.ok(
    validateMetadata({ ...inputs, submission: closedPending }).includes(
      "pending appReview.appleWorkflow must keep appVersionIncluded false",
    ),
  );
  const missingKey = clone(inputs.submission);
  delete missingKey.appReview.appleWorkflow.manualReleaseSelected;
  assert.ok(
    validateMetadata({ ...inputs, submission: missingKey }).includes(
      "appReview.appleWorkflow must contain exactly the required non-secret Apple workflow keys",
    ),
  );
  const extraKey = clone(inputs.submission);
  extraKey.appReview.appleWorkflow.appleAccountEmail = "must-not-be-stored";
  assert.ok(
    validateMetadata({ ...inputs, submission: extraKey }).includes(
      "appReview.appleWorkflow must contain exactly the required non-secret Apple workflow keys",
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

test("App Store in-app purchase text fields enforce Apple's exact character limits", () => {
  const inputs = validationInputs();
  const cases = [
    {
      label: "Product Reference Name",
      accepted: "r".repeat(64),
      rejected: "r".repeat(65),
      error: "subscription.productReferenceName must be 64 characters or fewer",
      set: (submission, value) => {
        submission.subscription.productReferenceName = value;
      },
    },
    {
      label: "Product ID",
      accepted: "p".repeat(100),
      rejected: "p".repeat(101),
      error: "subscription.productId must be 100 characters or fewer",
      set: (submission, value) => {
        submission.subscription.productId = value;
      },
    },
    {
      label: "Display Name maximum",
      accepted: "d".repeat(30),
      rejected: "d".repeat(31),
      error:
        "subscription.localizations.en-US.productDisplayName must be 2 to 30 characters",
      set: (submission, value) => {
        submission.subscription.localizations["en-US"].productDisplayName =
          value;
      },
    },
    {
      label: "localized Description",
      accepted: "x".repeat(45),
      rejected: "x".repeat(46),
      error:
        "subscription.localizations.en-US.description must be 45 characters or fewer",
      set: (submission, value) => {
        submission.subscription.localizations["en-US"].description = value;
      },
    },
  ];

  for (const testCase of cases) {
    const atLimit = clone(inputs.submission);
    testCase.set(atLimit, testCase.accepted);
    assert.equal(
      validateMetadata({ ...inputs, submission: atLimit }).includes(
        testCase.error,
      ),
      false,
      `${testCase.label} should accept the exact limit`,
    );

    const oneOver = clone(inputs.submission);
    testCase.set(oneOver, testCase.rejected);
    assert.ok(
      validateMetadata({ ...inputs, submission: oneOver }).includes(
        testCase.error,
      ),
      `${testCase.label} should reject one character over the limit`,
    );
  }

  for (const [displayName, accepted] of [
    ["dd", true],
    ["d", false],
  ]) {
    const submission = clone(inputs.submission);
    submission.subscription.localizations["en-US"].productDisplayName =
      displayName;
    assert.equal(
      validateMetadata({ ...inputs, submission }).includes(
        "subscription.localizations.en-US.productDisplayName must be 2 to 30 characters",
      ),
      !accepted,
      `Display Name length ${displayName.length} acceptance`,
    );
  }
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
    evidenceReference: null,
    ownerDecisionRevision: null,
    ownerDecisionEvidenceReference: null,
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
