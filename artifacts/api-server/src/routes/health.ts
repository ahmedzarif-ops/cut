import { Router, type IRouter, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { checkDatabaseReadiness } from "../lib/readiness";

const router: IRouter = Router();

type ReadinessCheck = () => Promise<void>;
let readinessCheck: ReadinessCheck = checkDatabaseReadiness;

type ReadinessOutcome = "ready" | "unavailable";

type ReadinessGuardConfiguration = {
  successTtlMs: number;
  failureTtlMs: number;
  responseTimeoutMs: number;
  now: () => number;
};

const DEFAULT_READINESS_GUARD_CONFIGURATION: ReadinessGuardConfiguration = {
  // Platform probes may arrive in bursts. Reuse a recent result briefly without
  // letting readiness stay stale after a deploy or database transition.
  successTtlMs: 1_000,
  failureTtlMs: 1_000,
  // A public request must not occupy an HTTP connection for as long as the
  // database driver's own connection timeout. The underlying probe remains the
  // single flight until it actually settles.
  responseTimeoutMs: 2_000,
  now: Date.now,
};

let guardConfiguration = DEFAULT_READINESS_GUARD_CONFIGURATION;
let guardVersion = 0;
let cachedReadiness:
  { outcome: ReadinessOutcome; expiresAt: number } | undefined;
let inFlightReadiness: Promise<ReadinessOutcome> | undefined;

function resetReadinessGuard(): void {
  guardVersion += 1;
  cachedReadiness = undefined;
  inFlightReadiness = undefined;
}

function cachedOutcome(): ReadinessOutcome | undefined {
  if (!cachedReadiness) return undefined;
  if (guardConfiguration.now() < cachedReadiness.expiresAt) {
    return cachedReadiness.outcome;
  }
  cachedReadiness = undefined;
  return undefined;
}

function startReadinessProbe(): Promise<ReadinessOutcome> {
  const version = guardVersion;
  const check = readinessCheck;
  const configuration = guardConfiguration;
  const probe = Promise.resolve()
    .then(() => check())
    .then<ReadinessOutcome, ReadinessOutcome>(
      () => "ready",
      () => "unavailable",
    );

  const guardedProbe = probe
    .then((outcome) => {
      if (version === guardVersion) {
        const ttlMs =
          outcome === "ready"
            ? configuration.successTtlMs
            : configuration.failureTtlMs;
        cachedReadiness = {
          outcome,
          expiresAt: configuration.now() + ttlMs,
        };
      }
      return outcome;
    })
    .finally(() => {
      if (version === guardVersion && inFlightReadiness === guardedProbe) {
        inFlightReadiness = undefined;
      }
    });

  inFlightReadiness = guardedProbe;
  return guardedProbe;
}

async function waitForProbeResponse(
  probe: Promise<ReadinessOutcome>,
): Promise<ReadinessOutcome> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ReadinessOutcome>((resolve) => {
    timeoutId = setTimeout(
      () => resolve("unavailable"),
      guardConfiguration.responseTimeoutMs,
    );
    timeoutId.unref?.();
  });

  try {
    return await Promise.race([probe, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function sendReadinessUnavailable(res: Response): void {
  res.setHeader("Retry-After", "1");
  res.status(503).json({ status: "unavailable" });
}

/** Test seam; production always uses checkDatabaseReadiness. */
export function setReadinessCheckForTesting(
  check: ReadinessCheck | null,
  configuration: Partial<ReadinessGuardConfiguration> = {},
): void {
  resetReadinessGuard();
  readinessCheck = check ?? checkDatabaseReadiness;
  guardConfiguration = {
    ...DEFAULT_READINESS_GUARD_CONFIGURATION,
    ...configuration,
  };
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const cached = cachedOutcome();
  if (cached === "ready") {
    res.json({ status: "ok" });
    return;
  }
  if (cached === "unavailable" || inFlightReadiness) {
    // Cached failures and concurrent calls fail fast. They never create another
    // database query or amplify logs while a dependency is unavailable.
    sendReadinessUnavailable(res);
    return;
  }

  const outcome = await waitForProbeResponse(startReadinessProbe());
  if (outcome === "ready") {
    res.json({ status: "ok" });
    return;
  }

  // Never serialize or log the underlying database/provider error. It can
  // contain a DSN, credentials, database rows, or health-related values.
  req.log?.warn({ errorCode: "api_not_ready" }, "Readiness check failed");
  sendReadinessUnavailable(res);
});

export default router;
