import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";

import {
  DEFAULT_REPO_ROOT,
  inspectImage,
  validateBundle,
  validateMetadata,
  validateScreenshotManifest,
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
  return {
    submission: readJson("app-store/app-store-submission.json"),
    appConfig: readJson("artifacts/cut-os/app.json"),
    territoryCatalog: readJson("app-store/app-store-connect-territories.json"),
    metadataMarkdown: fs.readFileSync(
      path.join(DEFAULT_REPO_ROOT, "APP_STORE_METADATA.md"),
      "utf8",
    ),
  };
}

test("committed working App Store records validate", () => {
  assert.deepEqual(validateBundle(), []);
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
});

test("metadata validation catches listing and privacy-manifest drift", () => {
  const inputs = validationInputs();
  const submission = clone(inputs.submission);
  submission.listing.subtitle = "x".repeat(31);
  submission.privacy.dataTypes[0].tracking = true;

  const errors = validateMetadata({ ...inputs, submission });
  assert.ok(errors.includes("listing.subtitle must be 30 characters or fewer"));
  assert.ok(
    errors.includes(
      "machine-readable subtitle must match APP_STORE_METADATA.md",
    ),
  );
  assert.ok(
    errors.includes("privacy.dataTypes[0] tracking must match app.json"),
  );
  assert.ok(
    errors.includes("every current privacy row must remain tracking No"),
  );
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

test("approval records must retain the exact required key sets", () => {
  const inputs = validationInputs();
  const missingApprovals = clone(inputs.submission);
  missingApprovals.ageRating.approval = {};
  missingApprovals.privacy.approval = {};
  missingApprovals.authenticationSecurity.approval = {};

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

  const extraApproval = clone(inputs.submission);
  extraApproval.ageRating.approval.unreviewedShortcut = true;
  assert.ok(
    validateMetadata({ ...inputs, submission: extraApproval }).includes(
      "ageRating.approval must contain exactly the required approval keys",
    ),
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
  });
  assert.ok(errors.includes("captured screenshot filenames must be unique"));
});
