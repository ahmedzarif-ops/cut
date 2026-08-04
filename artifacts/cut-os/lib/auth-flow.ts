export interface ClerkOperationResult {
  error: unknown | null;
}

export type ClerkOperation = () => Promise<ClerkOperationResult>;

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
