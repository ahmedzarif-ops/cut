import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import {
  LEGAL_LINK_IDS,
  openLegalLinkSafely,
  resolveLegalLinkConfiguration,
  selectLegalLinks,
  type LegalLinkId,
} from "@/lib/legal-links";

const legalLinkConfiguration = resolveLegalLinkConfiguration({
  // Expo replaces direct EXPO_PUBLIC_* property access in the app bundle.
  privacyPolicy: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
  terms: process.env.EXPO_PUBLIC_TERMS_URL,
  support: process.env.EXPO_PUBLIC_SUPPORT_URL,
});

interface LegalSupportLinksProps {
  variant?: "card" | "compact";
  includedIds?: readonly LegalLinkId[];
}

export function LegalSupportLinks({
  variant = "card",
  includedIds = LEGAL_LINK_IDS,
}: LegalSupportLinksProps) {
  const c = useColors();
  const s = makeStyles(c);
  const links = selectLegalLinks(legalLinkConfiguration, includedIds);
  const [openingId, setOpeningId] = React.useState<LegalLinkId | null>(null);
  const [openError, setOpenError] = React.useState<string | null>(null);
  const openingLock = React.useRef(false);
  const mounted = React.useRef(true);

  React.useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  if (variant === "compact" && links.length === 0) return null;

  const openLink = async (link: (typeof links)[number]) => {
    if (openingLock.current) return;
    openingLock.current = true;
    setOpenError(null);
    setOpeningId(link.id);
    const opened = await openLegalLinkSafely(link, (url) =>
      WebBrowser.openBrowserAsync(url),
    );
    openingLock.current = false;
    if (!mounted.current) return;
    setOpeningId(null);
    if (!opened) {
      setOpenError(
        `Couldn't open ${link.label}. Try again when you're online.`,
      );
    }
  };

  const linkControls = links.map((link) => (
    <Pressable
      key={link.id}
      accessibilityRole="link"
      accessibilityLabel={link.label}
      accessibilityHint="Opens in a browser"
      accessibilityState={{
        disabled: openingId !== null,
        busy: openingId === link.id,
      }}
      disabled={openingId !== null}
      style={({ pressed }) => [
        variant === "card" ? s.cardLink : s.compactLink,
        openingId !== null && s.disabled,
        pressed && openingId === null && s.pressed,
      ]}
      onPress={() => void openLink(link)}
    >
      <Text style={variant === "card" ? s.cardLinkText : s.compactLinkText}>
        {link.label}
      </Text>
    </Pressable>
  ));

  const error = openError ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={s.errorText}
    >
      {openError}
    </Text>
  ) : null;

  if (variant === "compact") {
    return (
      <View style={s.compactContainer}>
        <View style={s.compactLinks}>{linkControls}</View>
        {error}
      </View>
    );
  }

  const missingCount = includedIds.length - links.length;
  return (
    <View style={s.card}>
      <Text style={s.cardOverline}>LEGAL &amp; SUPPORT</Text>
      <Text accessibilityRole="header" style={s.cardTitle}>
        Legal and support
      </Text>
      {links.length > 0 ? (
        <View style={s.cardLinks}>{linkControls}</View>
      ) : null}
      {missingCount > 0 ? (
        <Text style={s.availabilityText}>
          {links.length === 0
            ? "Legal and support links are unavailable in this build."
            : "Some legal and support links are unavailable in this build."}
        </Text>
      ) : null}
      {error}
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: c.radius,
      padding: 20,
      marginBottom: 14,
    },
    cardOverline: {
      color: c.primary,
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      letterSpacing: 1.2,
      marginBottom: 7,
    },
    cardTitle: {
      color: c.cardForeground,
      fontFamily: "Inter_600SemiBold",
      fontSize: 19,
      lineHeight: 25,
    },
    cardLinks: { marginTop: 12, gap: 6 },
    cardLink: {
      minHeight: 48,
      borderRadius: c.radius,
      backgroundColor: c.secondary,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    cardLinkText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
    },
    compactContainer: { marginTop: 12 },
    compactLinks: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 4,
    },
    compactLink: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    compactLinkText: {
      color: c.primary,
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
    },
    availabilityText: {
      color: c.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },
    errorText: {
      color: c.destructiveText,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      lineHeight: 19,
      marginTop: 10,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.84 },
  });
}
