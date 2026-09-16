import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../app/(app)/settings.tsx", import.meta.url), "utf8");

describe("Settings sign out", () => {
  it("renders a separate accessible sign-out action for both free and Pro users", () => {
    const accountCard = source.slice(source.indexOf('<Text style={s.cardOverline}>ACCOUNT</Text>'), source.indexOf('<View style={[s.card, s.dangerCard]}>'));
    expect(accountCard).toContain('accessibilityLabel="Sign out"');
    expect(accountCard).toContain('onPress={() => void leaveAccount()}');
    expect(accountCard).toContain('disabled={busy}');
    expect(accountCard).not.toMatch(/isEntitled|capability|server\.state/);
  });

  it("ends only the current session without deleting account data or recovery markers", () => {
    const handler = source.slice(source.indexOf('const leaveAccount ='), source.indexOf('const leaveSettings ='));
    expect(handler).toContain('runSignOutWithFeedback(');
    expect(handler).toContain('busy || signOutLock.current');
    expect(handler).toContain('qc.clear()');
    expect(handler).toContain('await signOut({ sessionId: ownerSessionId })');
    expect(handler).not.toMatch(/deleteMeRequest|deleteItemAsync|setMarker\(|runDeletion\(|signOut\(\)/);
  });
});
