import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const nativeRecoveryOverride = resolve(
  process.cwd(),
  "app",
  "(auth)",
  "forgot-password.native.tsx",
);
const customRecoverySource = readFileSync(
  resolve(process.cwd(), "app", "(auth)", "forgot-password.tsx"),
  "utf8",
);
const webRecoverySource = readFileSync(
  resolve(process.cwd(), "app", "(auth)", "forgot-password.web.tsx"),
  "utf8",
);
const appConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "app.json"), "utf8"),
);
const appLayoutSource = readFileSync(
  resolve(process.cwd(), "app", "_layout.tsx"),
  "utf8",
);

describe("native password recovery boundary", () => {
  it("uses Clerk's supported JavaScript custom recovery flow on native", () => {
    expect(existsSync(nativeRecoveryOverride)).toBe(false);
    expect(customRecoverySource).toContain(
      'import { useSignIn } from "@clerk/expo";',
    );
    expect(customRecoverySource).toContain(
      "signIn.resetPasswordEmailCode.sendCode()",
    );
    expect(customRecoverySource).toContain(
      "signIn.resetPasswordEmailCode.verifyCode",
    );
    expect(customRecoverySource).toContain(
      "signIn.resetPasswordEmailCode.submitPassword",
    );
  });

  it("routes native recovery through the same verified ClerkProvider proxy", () => {
    expect(appLayoutSource).toContain(
      "proxyUrl={launchDecision.config.clerkProxyUrl}",
    );
    expect(customRecoverySource).not.toMatch(/@clerk\/expo\/native/);
  });

  it("preserves enumeration protection and cannot transfer into sign-up", () => {
    expect(customRecoverySource).toContain("PASSWORD_RESET_REQUEST_NOTICE");
    expect(customRecoverySource).not.toMatch(/\/sign-up/);
    expect(customRecoverySource).not.toMatch(/useSignUp/);
    expect(customRecoverySource).not.toMatch(/console\./);
    expect(customRecoverySource).toContain("signOutOfOtherSessions: true");
  });

  it("keeps public web recovery behind CUT's guarded sign-up route", () => {
    expect(webRecoverySource).toContain(
      'import { SignIn } from "@clerk/expo/web";',
    );
    expect(webRecoverySource).toContain("transferable={false}");
    expect(webRecoverySource).toContain("withSignUp={false}");
    expect(webRecoverySource).toContain('signUpUrl="/sign-up"');
    expect(webRecoverySource).not.toMatch(/useSignIn/);
    expect(webRecoverySource).not.toMatch(/resetPasswordEmailCode/);
    expect(webRecoverySource).not.toMatch(/console\./);
  });

  it("keeps the Clerk native config plugin in the release build", () => {
    expect(appConfig.expo.plugins).toContainEqual([
      "@clerk/expo",
      { appleSignIn: false },
    ]);
  });
});
