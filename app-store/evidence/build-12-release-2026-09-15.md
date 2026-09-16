# Build 12 release receipts

- Release: `8dcc03040df9a13473b22877bf3358fbc4b9939e`, pushed to `codex/app-store-v1`.
- Preserves Replit-only commit `b31980e` (three existing AI settings) via merge; rollback branch on Replit: `cut-pre-photo-release-b31980e`.
- Contains direct meal selection, Pro photo estimates and owner-approved privacy notice.
- Clean worktree: `/tmp/cut-testflight-12.0GHg8B`; frozen installation passed.
- App tests: 479/479; API tests: 602/602; deployment tests: 26/26; legal release validation passed.
- EAS Build 12: `3ad2c482-46e7-46f7-bd53-3d320adf3837`.
- Auto-submission: `a83ed6c7-b232-4f17-8775-ca5238ebe649`.
- Build dispatch succeeded September 15, 2026 at about 22:24 Central. Completion, Apple processing and QA assignment not yet verified.

## Replit database safety

Initial website publish proposed dropping eight production tables because development
was still at migration count 11. Cancelled before approving that destructive change;
UI confirmed Build cancelled and existing deployment Live. Applied the existing committed
development migrations through 0015 successfully (development DATABASE_URL only).
Production copy checkbox remained OFF. Subsequent publish advanced through successful
build/security to promotion without the destructive migration prompt.

Deployment ID: `aeb26a34-b032-488c-ba6a-9d579f4cb64f`. Publish SUCCESS;
live legal verification passed for all four resources and privacy rendered in Chrome.
Readiness 200, unauthenticated photo request 401. Status label retained old BUILD_SHA;
updated only that nonsecret value to the exact release SHA and republishing settings.
No production data-copy, secret-key, AI-budget, hosting-size, or external-email changes.

## Remaining

Build 12 stopped in pre-install because the build was dispatched before the privacy
deployment finished: `/privacy: content does not match approved SHA-256` at
2026-09-16T03:25:17Z. No iPhone binary or Apple upload completed. After live verification
passed, dispatched the same source again as Build 13. This was sequencing, not an app
test failure; the safety check was not bypassed.

Build 13: `de0f457d-bb74-4d45-b251-e3d6ce5aab1f`.
Auto-submission: `0cb055e6-3512-4295-a5a4-d7952500f9cf`.
Dispatch successful September 15 22:28 Central. Existing quiet two-hour monitor
updated to exact Build 13 and authorized existing QA-group assignment after processing.

Final check: Replit settings republish SUCCESS, live `/status` exact
`8dcc03040df9a13473b22877bf3358fbc4b9939e` verification ALL PASS (200,
JSON, status ok, no-store, exact SHA). Build 13 IN_PROGRESS; cloud logs confirm
pre-install configuration, legal release and all live legal-site checks passed.
No Apple upload/processing/assignment claim yet. Quiet monitor remains active.

Verify live privacy hash and backend readiness, release SHA metadata, build completion,
Apple processing and existing QA group assignment. Real-phone photo consent/capture/
estimate/edit/save and direct meal selection still need testing. Reconcile Apple privacy
answers before App Review. This is not a public App Store release.
