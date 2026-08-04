import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const nativeRecoverySource = readFileSync(
  resolve(process.cwd(), "app", "(auth)", "forgot-password.native.tsx"),
  "utf8",
);
const webRecoverySource = readFileSync(
  resolve(process.cwd(), "app", "(auth)", "forgot-password.web.tsx"),
  "utf8",
);
const appConfig = JSON.parse(
  readFileSync(resolve(process.cwd(), "app.json"), "utf8"),
);

describe("native password recovery boundary", () => {
  it("uses Clerk's prebuilt native sign-in view for App Store recovery", () => {
    expect(nativeRecoverySource).toContain(
      'import { AuthView } from "@clerk/expo/native";',
    );
    expect(nativeRecoverySource).toContain("<AuthView");
    expect(nativeRecoverySource).toContain('mode="signIn"');
    expect(nativeRecoverySource).toContain("isDismissible");
  });

  it("does not reimplement or log native provider recovery operations", () => {
    expect(nativeRecoverySource).not.toMatch(/useSignIn/);
    expect(nativeRecoverySource).not.toMatch(/resetPasswordEmailCode/);
    expect(nativeRecoverySource).not.toMatch(/console\./);
  });

  it("cannot transfer native recovery into sign-up", () => {
    expect(nativeRecoverySource).toContain('mode="signIn"');
    expect(nativeRecoverySource).not.toMatch(/signInOrUp/);
    expect(nativeRecoverySource).not.toMatch(/mode="signUp"/);
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
