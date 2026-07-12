/**
 * CUT OS design tokens.
 *
 * Brand: a precision "operating system" for body recomposition. Deep navy
 * canvas, electric-blue primary, high-contrast typography — calm, premium,
 * Apple-like. Dark is the hero appearance; a matching light palette is
 * provided so the app respects the device setting.
 */

const dark = {
  // Legacy aliases (kept for backward compatibility)
  text: "#F1F5F9",
  tint: "#3B82F6",

  // Core surfaces
  background: "#0B1120",
  foreground: "#F1F5F9",

  // Cards / elevated surfaces
  card: "#131D30",
  cardForeground: "#F1F5F9",

  // Primary action color
  primary: "#3B82F6",
  primaryForeground: "#FFFFFF",

  // Secondary / less-emphasis interactive surfaces
  secondary: "#1E293B",
  secondaryForeground: "#E2E8F0",

  // Muted / subdued elements
  muted: "#1E293B",
  mutedForeground: "#94A3B8",

  // Accent highlights
  accent: "#1D4ED8",
  accentForeground: "#FFFFFF",

  // Positive / on-track status
  success: "#22C55E",
  successForeground: "#FFFFFF",

  // Warning / attention
  warning: "#F59E0B",
  warningForeground: "#0B1120",

  // Destructive actions
  destructive: "#EF4444",
  destructiveForeground: "#FFFFFF",

  // Borders and input outlines
  border: "#24314A",
  input: "#1B2740",
};

const light: typeof dark = {
  text: "#0B1120",
  tint: "#2563EB",

  background: "#F7F9FC",
  foreground: "#0B1120",

  card: "#FFFFFF",
  cardForeground: "#0B1120",

  primary: "#2563EB",
  primaryForeground: "#FFFFFF",

  secondary: "#EEF2F7",
  secondaryForeground: "#0B1120",

  muted: "#EEF2F7",
  mutedForeground: "#5B6B85",

  accent: "#DBEAFE",
  accentForeground: "#1E3A8A",

  success: "#16A34A",
  successForeground: "#FFFFFF",

  warning: "#D97706",
  warningForeground: "#FFFFFF",

  destructive: "#DC2626",
  destructiveForeground: "#FFFFFF",

  border: "#E2E8F0",
  input: "#E2E8F0",
};

const colors = {
  light,
  dark,
  // Border radius (in px), applied to cards, buttons, inputs, and modals.
  radius: 14,
};

export default colors;
