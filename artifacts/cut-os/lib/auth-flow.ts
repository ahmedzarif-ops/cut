export interface ClerkOperationResult {
  error: unknown | null;
}

export type ClerkOperation = () => Promise<ClerkOperationResult>;

export interface ClerkSecondFactor {
  strategy: string;
  safeIdentifier?: string;
}

export type PasswordSignInNextStep =
  | { kind: "complete" }
  | {
      kind: "email_code";
      safeIdentifier: string | null;
    }
  | { kind: "unsupported" };

export interface CurrentOperation {
  isCurrent: () => boolean;
}

export type ExclusiveOperationRunResult<T> =
  { kind: "completed"; value: T } | { kind: "busy" } | { kind: "stale" };

export interface ExclusiveOperationRunner {
  readonly isRunning: boolean;
  invalidate: () => void;
  run: <T>(
    operation: (context: CurrentOperation) => Promise<T>,
  ) => Promise<ExclusiveOperationRunResult<T>>;
}

export type PasswordSignInOutcome =
  | { kind: "signed_in" }
  | { kind: "password_failed" }
  | { kind: "finalize_failed" }
  | { kind: "unsupported" }
  | { kind: "email_code_sent"; safeIdentifier: string | null }
  | { kind: "email_code_send_failed"; safeIdentifier: string | null }
  | { kind: "stale" };

export type EmailCodeSendOutcome =
  { kind: "sent" } | { kind: "failed" } | { kind: "stale" };

export type EmailCodeVerificationOutcome =
  | { kind: "signed_in" }
  | { kind: "verification_failed" }
  | { kind: "finalize_failed" }
  | { kind: "stale" };

export type ResetSignInOutcome =
  { kind: "reset" } | { kind: "failed" } | { kind: "stale" };

const operationIsCurrent = () => true;

/**
 * Clerk's future APIs report expected authentication failures in the returned
 * result. Keeping that conversion in one place makes it harder for a screen to
 * accidentally treat a resolved promise as a successful operation.
 */
export async function clerkOperationSucceeded(
  operation: ClerkOperation,
): Promise<boolean> {
  try {
    const result = await operation();
    return result.error === null;
  } catch {
    return false;
  }
}

/**
 * Password sign-in is allowed to continue only when it is already complete or
 * Clerk explicitly requires a supported email-code second factor (including
 * Client Trust on a new device). All other statuses and factors fail closed.
 */
export function getPasswordSignInNextStep({
  status,
  supportedSecondFactors,
}: {
  status: string | null | undefined;
  supportedSecondFactors: readonly ClerkSecondFactor[];
}): PasswordSignInNextStep {
  if (status === "complete") {
    return { kind: "complete" };
  }

  if (status !== "needs_client_trust" && status !== "needs_second_factor") {
    return { kind: "unsupported" };
  }

  const emailCodeFactor = supportedSecondFactors.find(
    (factor) => factor.strategy === "email_code",
  );
  if (!emailCodeFactor) {
    return { kind: "unsupported" };
  }

  const safeIdentifier = emailCodeFactor.safeIdentifier?.trim();
  return {
    kind: "email_code",
    safeIdentifier: safeIdentifier || null,
  };
}

/**
 * Serializes UI-triggered authentication work synchronously, before the first
 * promise can yield. Invalidating the runner makes late completions stale so a
 * screen can unmount without receiving state updates or starting follow-ups.
 */
export function createExclusiveOperationRunner({
  isActive,
  onBusyChange,
}: {
  isActive: () => boolean;
  onBusyChange: (busy: boolean) => void;
}): ExclusiveOperationRunner {
  let inFlight = false;
  let generation = 0;

  return {
    get isRunning() {
      return inFlight;
    },
    invalidate() {
      generation += 1;
      inFlight = false;
    },
    async run<T>(
      operation: (context: CurrentOperation) => Promise<T>,
    ): Promise<ExclusiveOperationRunResult<T>> {
      if (!isActive()) return { kind: "stale" };
      if (inFlight) return { kind: "busy" };

      inFlight = true;
      const operationGeneration = generation;
      const context: CurrentOperation = {
        isCurrent: () => isActive() && operationGeneration === generation,
      };
      onBusyChange(true);

      try {
        const value = await operation(context);
        return context.isCurrent()
          ? { kind: "completed", value }
          : { kind: "stale" };
      } finally {
        if (operationGeneration === generation) {
          inFlight = false;
          if (isActive()) onBusyChange(false);
        }
      }
    },
  };
}

export async function sendSignInEmailCode({
  sendEmailCode,
  isCurrent = operationIsCurrent,
}: {
  sendEmailCode: ClerkOperation;
  isCurrent?: () => boolean;
}): Promise<EmailCodeSendOutcome> {
  if (!isCurrent()) return { kind: "stale" };
  const sent = await clerkOperationSucceeded(sendEmailCode);
  if (!isCurrent()) return { kind: "stale" };
  return sent ? { kind: "sent" } : { kind: "failed" };
}

export async function runPasswordSignIn({
  authenticate,
  getStatus,
  getSupportedSecondFactors,
  sendEmailCode,
  finalize,
  isCurrent = operationIsCurrent,
}: {
  authenticate: ClerkOperation;
  getStatus: () => string | null | undefined;
  getSupportedSecondFactors: () => readonly ClerkSecondFactor[];
  sendEmailCode: ClerkOperation;
  finalize: ClerkOperation;
  isCurrent?: () => boolean;
}): Promise<PasswordSignInOutcome> {
  if (!isCurrent()) return { kind: "stale" };
  const authenticated = await clerkOperationSucceeded(authenticate);
  if (!isCurrent()) return { kind: "stale" };
  if (!authenticated) return { kind: "password_failed" };

  const nextStep = getPasswordSignInNextStep({
    status: getStatus(),
    supportedSecondFactors: getSupportedSecondFactors(),
  });
  if (nextStep.kind === "unsupported") return { kind: "unsupported" };

  if (nextStep.kind === "complete") {
    const finalized = await clerkOperationSucceeded(finalize);
    if (!isCurrent()) return { kind: "stale" };
    return finalized ? { kind: "signed_in" } : { kind: "finalize_failed" };
  }

  const sendOutcome = await sendSignInEmailCode({
    sendEmailCode,
    isCurrent,
  });
  if (sendOutcome.kind === "stale") return sendOutcome;
  return {
    kind:
      sendOutcome.kind === "sent"
        ? "email_code_sent"
        : "email_code_send_failed",
    safeIdentifier: nextStep.safeIdentifier,
  };
}

export async function verifySignInEmailCode({
  verifyEmailCode,
  getStatus,
  finalize,
  isCurrent = operationIsCurrent,
}: {
  verifyEmailCode: ClerkOperation;
  getStatus: () => string | null | undefined;
  finalize: ClerkOperation;
  isCurrent?: () => boolean;
}): Promise<EmailCodeVerificationOutcome> {
  if (!isCurrent()) return { kind: "stale" };

  if (getStatus() !== "complete") {
    const verified = await clerkOperationSucceeded(verifyEmailCode);
    if (!isCurrent()) return { kind: "stale" };
    if (!verified || getStatus() !== "complete") {
      return { kind: "verification_failed" };
    }
  }

  if (!isCurrent()) return { kind: "stale" };
  const finalized = await clerkOperationSucceeded(finalize);
  if (!isCurrent()) return { kind: "stale" };
  return finalized ? { kind: "signed_in" } : { kind: "finalize_failed" };
}

export async function resetSignInAttempt({
  reset,
  isCurrent = operationIsCurrent,
}: {
  reset: ClerkOperation;
  isCurrent?: () => boolean;
}): Promise<ResetSignInOutcome> {
  if (!isCurrent()) return { kind: "stale" };
  const resetSucceeded = await clerkOperationSucceeded(reset);
  if (!isCurrent()) return { kind: "stale" };
  return resetSucceeded ? { kind: "reset" } : { kind: "failed" };
}

/**
 * Deliberately returns no account-specific outcome. The caller must always show
 * the same next step and privacy-safe notice whether the identifier exists,
 * delivery fails, or the request succeeds. This does not normalize network
 * timing; AUTH_SECURITY_PRELAUNCH.md records the required supported recovery
 * architecture and production-tenant verification.
 */
export async function requestPasswordResetEmailCode({
  createSignIn,
  sendCode,
}: {
  createSignIn: ClerkOperation;
  sendCode: ClerkOperation;
}): Promise<void> {
  const signInCreated = await clerkOperationSucceeded(createSignIn);
  if (signInCreated) {
    await clerkOperationSucceeded(sendCode);
  }
}

export const PASSWORD_RESET_REQUEST_NOTICE =
  "If an account matches that email and delivery succeeds, a password reset code will arrive shortly. Check your inbox and spam folder.";
