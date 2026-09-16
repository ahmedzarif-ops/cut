const { createHash } = require("node:crypto");

const APPROVAL_RECORD_FILENAME = "legal-publication-approval.json";
const APPROVAL_SCHEMA_VERSION = 1;
const APPROVAL_SCOPE =
  "Exact rendered privacy, terms, support, and legal stylesheet contents recorded by SHA-256.";
const OWNER_DEFERRED_REVIEW_STATUS = "owner_deferred_post_launch";
const OWNER_DEFERRED_REVIEW_DEADLINE =
  "within_3_calendar_days_after_public_release";
const OWNER_DEFERRED_REVIEW_EVIDENCE =
  "app-store/evidence/owner-deferred-professional-review-2026-08-10.md";
const APPROVED_RESOURCE_NAMES = [
  "/privacy",
  "/terms",
  "/support",
  "/legal.css",
];

const BLOCKED_RELEASE_COPY = [
  {
    label: "draft wording",
    pattern: /\b(?:draft|working copy|working document)\b/iu,
  },
  {
    label: "incomplete wording",
    pattern:
      /\b(?:incomplete|unfinished|not final|placeholder copy|to be (?:determined|confirmed|finalized))\b/iu,
  },
  {
    label: "not-approved wording",
    pattern:
      /\b(?:unapproved|not approved|has not been approved|have not been approved|is not approved|are not approved)\b/iu,
  },
  {
    label: "pending-approval wording",
    pattern:
      /\b(?:pending|awaiting|subject to)\s+(?:(?:owner|counsel|legal|privacy|nutrition|support|qualified)\s+)*(?:approval|review)\b|\b(?:needs?|must|required)\s+(?:to\s+)?(?:be\s+)?(?:approved|reviewed|verified|finalized)\s+before\b/iu,
  },
  {
    label: "non-binding wording",
    pattern: /\b(?:not\s+(?:a\s+)?binding|non[- ]binding)\b/iu,
  },
  {
    label: "publication-blocker wording",
    pattern:
      /\b(?:do not|don't|must not|cannot|can't|not ready to)\s+(?:be\s+)?(?:publish(?:ed)?|deploy(?:ed)?|use(?:d)?|rel(?:y|ied)\s+on)\b|\bunavailable for public reliance\b|\bcannot take effect\b/iu,
  },
  {
    label: "unresolved-work wording",
    pattern:
      /\b(?:TBD|TODO|FIXME|remains? to be (?:decided|defined|finalized|approved|reviewed)|still needs? (?:approval|review|verification)|needs? to be (?:approved|reviewed|verified))\b/iu,
  },
];

function normalizeBasePath(value = "/") {
  const trimmed = value.trim();
  if (trimmed === "" || /^\/+$/u.test(trimmed)) return "";
  return `/${trimmed.replace(/^\/+|\/+$/gu, "")}`;
}

function renderLegalTemplate(template, appName, basePath) {
  return template
    .replace(/LEGAL_BASE_PATH_PLACEHOLDER/g, basePath)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function buildRenderedResources(templates, appName, basePath) {
  return {
    "/privacy": renderLegalTemplate(
      templates.legal["/privacy"],
      appName,
      basePath,
    ),
    "/terms": renderLegalTemplate(templates.legal["/terms"], appName, basePath),
    "/support": renderLegalTemplate(
      templates.legal["/support"],
      appName,
      basePath,
    ),
    "/legal.css": templates.legalCss,
  };
}

function buildResourceHashes(templates, appName, basePath) {
  return Object.fromEntries(
    Object.entries(buildRenderedResources(templates, appName, basePath)).map(
      ([name, content]) => [name, sha256(content)],
    ),
  );
}

function findBlockedReleaseCopy(content) {
  return BLOCKED_RELEASE_COPY.filter(({ pattern }) =>
    pattern.test(content),
  ).map(({ label }) => label);
}

function isFilledApprovalValue(value) {
  return (
    typeof value === "string" &&
    value.trim().length >= 3 &&
    !/(?:\{\{|\}\}|\b(?:TBD|TODO|FIXME|placeholder|draft)\b)/iu.test(value)
  );
}

function isIsoTimestamp(value) {
  return (
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

function validateApprovalRecord(
  approvalRecord,
  templates,
  runtimeAppName,
  runtimeBasePath,
) {
  const issues = [];

  if (!approvalRecord || typeof approvalRecord !== "object") {
    return ["the legal publication approval record is missing or invalid"];
  }
  if (approvalRecord.schemaVersion !== APPROVAL_SCHEMA_VERSION) {
    issues.push(
      `approval record schemaVersion must be ${APPROVAL_SCHEMA_VERSION}`,
    );
  }
  if (approvalRecord.publicationStatus !== "approved") {
    issues.push("approval record publicationStatus is not approved");
  }
  if (approvalRecord.approvalScope !== APPROVAL_SCOPE) {
    issues.push("approval record scope does not cover the exact public files");
  }

  const counselApproval = approvalRecord.counselApproval;
  const counselApprovalValid =
    isFilledApprovalValue(counselApproval?.approvedBy) &&
    isFilledApprovalValue(counselApproval?.evidenceReference) &&
    isIsoTimestamp(counselApproval?.approvedAt);
  const ownerRiskAcceptance = approvalRecord.ownerRiskAcceptance;
  const ownerRiskAcceptanceValid =
    ownerRiskAcceptance?.acceptedBy === "Zarif Ahmed" &&
    isIsoTimestamp(ownerRiskAcceptance?.acceptedAt) &&
    ownerRiskAcceptance?.evidenceReference === OWNER_DEFERRED_REVIEW_EVIDENCE &&
    ownerRiskAcceptance?.professionalReviewStatus ===
      OWNER_DEFERRED_REVIEW_STATUS &&
    ownerRiskAcceptance?.professionalApprovalClaimed === false &&
    ownerRiskAcceptance?.initiationDeadlinePolicy ===
      OWNER_DEFERRED_REVIEW_DEADLINE;
  if (!counselApprovalValid && !ownerRiskAcceptanceValid) {
    issues.push(
      "approval record requires either qualified-counsel approval or the exact owner-deferred professional-review risk acceptance",
    );
  }

  const recordedAppName = approvalRecord.rendering?.appName;
  const recordedBasePath = approvalRecord.rendering?.basePath;
  if (!isFilledApprovalValue(recordedAppName)) {
    issues.push("approval record has no valid rendered app name");
  }
  if (recordedAppName !== runtimeAppName) {
    issues.push(
      "runtime app name does not match the publication-approved rendering",
    );
  }
  if (
    typeof recordedBasePath !== "string" ||
    normalizeBasePath(recordedBasePath) !== recordedBasePath
  ) {
    issues.push("approval record base path is not normalized");
  } else if (recordedBasePath !== runtimeBasePath) {
    issues.push(
      "runtime base path does not match the publication-approved rendering",
    );
  }

  if (
    typeof recordedAppName === "string" &&
    typeof recordedBasePath === "string"
  ) {
    const expectedHashes = buildResourceHashes(
      templates,
      recordedAppName,
      recordedBasePath,
    );
    const recordedHashes = approvalRecord.sha256;

    for (const resourceName of APPROVED_RESOURCE_NAMES) {
      const recordedHash = recordedHashes?.[resourceName];
      if (!/^[a-f0-9]{64}$/u.test(recordedHash ?? "")) {
        issues.push(`${resourceName} has no recorded SHA-256 approval hash`);
      } else if (recordedHash !== expectedHashes[resourceName]) {
        issues.push(
          `${resourceName} content changed after the recorded publication approval`,
        );
      }
    }

    if (
      recordedHashes &&
      Object.keys(recordedHashes).some(
        (name) => !APPROVED_RESOURCE_NAMES.includes(name),
      )
    ) {
      issues.push("approval record contains an unknown public resource");
    }
  }

  return issues;
}

module.exports = {
  APPROVAL_RECORD_FILENAME,
  APPROVAL_SCHEMA_VERSION,
  APPROVAL_SCOPE,
  OWNER_DEFERRED_REVIEW_DEADLINE,
  OWNER_DEFERRED_REVIEW_EVIDENCE,
  OWNER_DEFERRED_REVIEW_STATUS,
  APPROVED_RESOURCE_NAMES,
  buildResourceHashes,
  findBlockedReleaseCopy,
  normalizeBasePath,
  renderLegalTemplate,
  validateApprovalRecord,
};
