import React from "react";
import { Image, StyleSheet } from "react-native";

export function BrandMark() {
  return (
    <Image
      source={require("@/assets/images/dawatfit-icon.png")}
      accessibilityLabel="DawatFit"
      style={styles.mark}
    />
  );
}

const styles = StyleSheet.create({
  mark: { width: 56, height: 56, borderRadius: 14, marginBottom: 24 },
});
