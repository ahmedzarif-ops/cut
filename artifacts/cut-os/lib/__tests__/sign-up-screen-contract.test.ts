import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const signUpScreenSource = readFileSync(
  resolve(testDirectory, "../../app/(auth)/sign-up.tsx"),
  "utf8",
);
const legalLinksSource = readFileSync(
  resolve(testDirectory, "../../components/LegalSupportLinks.tsx"),
  "utf8",
);

describe("sign-up screen consent contract", () => {
  it("keeps age and Terms assent as independent required checkboxes", () => {
    expect(
      signUpScreenSource.match(/accessibilityRole="checkbox"/gu),
    ).toHaveLength(2);
    expect(signUpScreenSource).toContain(
      'accessibilityLabel="I confirm I am at least 18 years old"',
    );
    expect(signUpScreenSource).toContain(
      "accessibilityLabel={SIGN_UP_TERMS_ASSENT_COPY}",
    );
    expect(signUpScreenSource).toContain(
      "onPress={() => setAdultConfirmed((current) => !current)}",
    );
    expect(signUpScreenSource).toContain(
      "onPress={() => setTermsAssented((current) => !current)}",
    );
  });

  it("wires both confirmations through the fail-closed submit guard", () => {
    expect(signUpScreenSource).toMatch(
      /isSignUpSubmissionDisabled\(\{\s*emailAddress,\s*password,\s*adultConfirmed,\s*termsAssented,\s*busy,\s*\}\)/u,
    );
    expect(signUpScreenSource).toContain("if (createDisabled) return;");
    expect(signUpScreenSource).toContain("disabled={createDisabled}");
    expect(signUpScreenSource).toContain(
      "accessibilityState={{ disabled: createDisabled, busy }}",
    );
  });

  it("keeps visible, accessibly named Terms and Privacy links", () => {
    expect(signUpScreenSource).toContain(
      'const SIGN_UP_LEGAL_LINK_IDS = ["terms", "privacyPolicy"] as const;',
    );
    expect(signUpScreenSource).toMatch(
      /<LegalSupportLinks\s+variant="compact"\s+includedIds=\{SIGN_UP_LEGAL_LINK_IDS\}\s+\/>/u,
    );
    expect(legalLinksSource).toContain('accessibilityRole="link"');
    expect(legalLinksSource).toContain("accessibilityLabel={link.label}");
    expect(legalLinksSource).toMatch(
      /<Text[^>]*>\s*\{link\.label\}\s*<\/Text>/u,
    );
  });
});
