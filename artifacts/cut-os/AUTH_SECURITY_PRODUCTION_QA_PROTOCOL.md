# Authentication production QA protocol

## Purpose and evidence boundary

This protocol turns the production-tenant requirements in
`AUTH_SECURITY_PRELAUNCH.md` into a repeatable, fail-closed exact-build test.
It does not approve the release by itself. The authoritative run must use the
exact signed TestFlight candidate on a physical iPhone, the production Clerk
tenant, and the production CUT proxy.

Do not put email addresses, passwords, reset codes, Clerk resource IDs,
response bodies, raw request or response headers, raw per-attempt timings, or
unsanitized log exports in the repository. Test identities and credentials stay
in the approved password manager or App Store Connect. The repository may
retain only aggregate results, pass/fail booleans, exact build identifiers,
sanitized timestamps, and durable evidence references.

## Required roles

- **Operator:** runs the bounded test on the physical device.
- **Independent security reviewer:** approves the timing protocol and reviews
  the sanitized result. The operator and reviewer may not infer approval from
  unit tests or an unsigned simulator.
- **Owner:** approves the final production-tenant evidence for release.

## Preconditions

Record pass/fail only for each precondition before testing:

1. The exact TestFlight build number, full Git commit, EAS build ID, and App
   Store Connect build ID are known and cross-bound in the release record.
2. The candidate is installed from TestFlight on a physical iPhone; no local
   development client, simulator, or ad-hoc binary is accepted.
3. Clerk production shows Strict user-enumeration protection, Native API, and
   the `com.zarifahmed.cut` iOS registration enabled.
4. Client Trust remains enabled. Production test mode matches the active
   evidence target: bounded on only for App Review, or off for public release.
5. `https://getcutos.com/status`, `/api/readyz`, and the canonical Clerk proxy
   health check pass for the exact deployed backend identity.
6. One controlled known account and one controlled unknown identifier are
   available. Their actual identifiers are not written into this protocol or
   the repository.
7. The reviewer has approved the sample size, timing threshold, device/network
   conditions, and retry-window method before the run begins.

If any precondition fails, stop. Do not weaken Clerk settings or bypass CUT's
adult and Terms gates to continue.

## Controlled test matrix

Run the matrix in one stable network environment and one foreground app
session. Alternate cohort order so provider warm-up and network drift do not
systematically favor one cohort. Use the reviewer-approved bounded sample size;
do not increase attempts after a rate limit merely to obtain more data.

| Check               | Known controlled account                                               | Unknown controlled identifier                        | Required public result                                                  |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Get help entry      | Open from sign-in                                                      | Open from sign-in                                    | Same route and copy                                                     |
| Request reset       | Submit once per scheduled trial                                        | Submit once per scheduled trial                      | Same generic progression and notice                                     |
| Response envelope   | Observe status, content type, bounded size, and public state only      | Observe the same fields only                         | No existence-bearing difference                                         |
| Timing              | Measure elapsed request-to-public-state transition                     | Measure the same transition                          | Reviewer-approved aggregate parity                                      |
| Invalid code        | Enter a synthetic invalid code only after a real known-account request | Not applicable; do not invent provider state         | Generic bounded error; no provider body                                 |
| Resend/rate limit   | Exercise only the documented bounded path                              | Exercise only if the provider presents the same path | Generic 429/retry behavior without existence signal                     |
| Recovery completion | Use the delivered code and a new generated password                    | Not applicable                                       | Password changes, session synchronizes, and no sign-up transfer appears |

Never use `424242` outside the explicitly authorized App Review production-test
window. Never record the delivered code or generated password.

## Timing-parity procedure

1. The security reviewer chooses the bounded number of alternating trials and
   the acceptable aggregate-difference rule before seeing results.
2. Use the same device, app build, network, foreground state, and navigation
   path for both cohorts.
3. Measure from the request action to the first stable public recovery state.
   Keep raw measurements only in an approved temporary local worksheet.
4. Calculate cohort count, median, p95, and the reviewer-selected comparison.
   Copy only those aggregates and a pass/fail decision into the sanitized
   evidence record.
5. Delete the temporary worksheet after the reviewer confirms the aggregates.
   Record deletion as a boolean; do not commit the worksheet.

A small or noisy sample is **inconclusive**, not passing. Client-side delay,
visual similarity, or a single matched request is not timing-parity evidence.

## Rate-limit and recovery behavior

- Stop immediately when the provider returns 429. Record only that 429 occurred,
  whether `Retry-After` was present, and whether CUT showed the generic public
  state.
- Do not retry before the provider's documented window. After the window,
  perform one bounded usability retry and record only pass/fail.
- Do not use multiple IPs, devices, identifiers, or accounts to evade a limit.
- Confirm that the rate-limit path does not disclose whether the identifier is
  registered.

## Provider-failure behavior

Production failure injection requires a separately approved reversible plan.
Do not change production DNS, Clerk configuration, proxy secrets, or deployment
health for this test.

The exact TestFlight candidate must at minimum pass a physical-device network
failure rehearsal using a controlled offline transition: the request fails with
generic recoverable copy, no provider body, and a subsequent online retry works.
The production proxy's timeout, upstream-failure, oversized-response, and
partial-response contracts remain covered by automated tests. A naturally
observed provider outage or an independently approved non-production failure
injection may supply stronger evidence, but neither may be invented.

## Safe-abuse-logging inspection

After the bounded rate-limit attempt, inspect authenticated production logs
without exporting them. Record only these booleans:

- the fixed `clerk_frontend_api_rate_limited` event is present when expected;
- dynamic Clerk paths are collapsed to `/api/__clerk`;
- no test identifier, reset code, password, Clerk resource ID, provider body,
  provider error, authorization header, or cookie appears in CUT-owned logs;
- no unsanitized log export was created or retained.

If prohibited data appears, stop the release and open a security incident. Do
not copy the leaked value into an issue or evidence file.

## Sanitized evidence record

Create one dated file under `app-store/evidence/` only after the exact run. It
must contain:

- exact TestFlight and backend build identities;
- device model and iOS version without device serials or personal names;
- production tenant alias, not keys or credentials;
- start/end UTC timestamps;
- all precondition and matrix pass/fail results;
- aggregate timing count, median, p95, reviewer-selected threshold, and result;
- rate-limit, provider-failure, recovery-completion, and safe-log booleans;
- temporary-workbook deletion confirmation;
- operator, independent security-reviewer, and owner approvals; and
- a statement that no prohibited sensitive evidence was retained.

Only after that record is complete may the six
`authenticationSecurity.productionTenantEvidence.checks` fields advance from
`pending` to `verified`. Exact-build, security-reviewer, and owner approvals
remain separate gates.
