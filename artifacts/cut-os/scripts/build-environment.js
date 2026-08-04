const TOOLING_ENVIRONMENT_VARIABLES = Object.freeze([
  "ANDROID_HOME",
  "ANDROID_SDK_ROOT",
  "BABEL_ENV",
  "CI",
  "COLORTERM",
  "ComSpec",
  "EAS_BUILD",
  "EAS_BUILD_PLATFORM",
  "EAS_BUILD_PROFILE",
  "EAS_BUILD_RUNNER",
  "EXPO_DEBUG",
  "EXPO_NO_DOTENV",
  "EXPO_NO_METRO_LAZY",
  "EXPO_OFFLINE",
  "EXPO_PACKAGER_PROXY_URL",
  "EXPO_USE_FAST_RESOLVER",
  "FORCE_COLOR",
  "HOME",
  "JAVA_HOME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "NODE_ENV",
  "NODE_EXTRA_CA_CERTS",
  "NODE_OPTIONS",
  "NO_COLOR",
  "PATH",
  "PATHEXT",
  "PNPM_HOME",
  "REACT_NATIVE_PACKAGER_HOSTNAME",
  "SHELL",
  "SystemRoot",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "TZ",
  "USER",
  "UV_THREADPOOL_SIZE",
  "WATCHMAN_SOCK",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
]);

// These are the only values intentionally exposed to the JavaScript bundle.
// Adding a new public runtime setting requires an explicit review here.
const PUBLIC_BUILD_VARIABLES = Object.freeze([
  "EXPO_PUBLIC_CLERK_PROXY_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_DOMAIN",
  "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  "EXPO_PUBLIC_REPL_ID",
  "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
  "EXPO_PUBLIC_REVENUECAT_PRODUCT_ID",
  "EXPO_PUBLIC_SUPPORT_URL",
  "EXPO_PUBLIC_TERMS_URL",
]);

const SENSITIVE_ENVIRONMENT_NAME_PATTERN =
  /(?:^|_)(?:CREDENTIALS?|PASS(?:WORD|WD)?|PRIVATE_?KEY|SECRET(?:S)?|SIGNING_?KEY|TOKEN)(?:_|$)/iu;

function isSensitiveEnvironmentName(name) {
  return SENSITIVE_ENVIRONMENT_NAME_PATTERN.test(name);
}

function hasSafePublicValue(name, value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (isSensitiveEnvironmentName(name)) return false;

  if (name === "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") {
    return /^pk_(?:live|test)_[A-Za-z0-9_-]+$/u.test(value);
  }

  if (name === "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY") {
    return /^(?:appl|test)_[A-Za-z0-9_-]+$/u.test(value);
  }

  return true;
}

function copyEnvironmentValue(target, source, name) {
  const value = source[name];
  if (typeof value === "string") target[name] = value;
}

/**
 * Construct Metro's child-process environment from an allowlist. Metro and
 * project config can execute JavaScript during bundling, so server credentials
 * must never enter that process even though Expo normally inlines only
 * EXPO_PUBLIC_* values.
 */
function createMetroEnvironment(sourceEnvironment, publicOverrides = {}) {
  const result = {};

  for (const name of TOOLING_ENVIRONMENT_VARIABLES) {
    if (!isSensitiveEnvironmentName(name)) {
      copyEnvironmentValue(result, sourceEnvironment, name);
    }
  }

  // The caller supplies every reviewed public build value. Prevent Expo from
  // refilling this child process from an unreviewed local .env file after the
  // allowlist has been constructed.
  result.EXPO_NO_DOTENV = "1";

  for (const name of PUBLIC_BUILD_VARIABLES) {
    const value = sourceEnvironment[name];
    if (hasSafePublicValue(name, value)) result[name] = value;
  }

  for (const name of PUBLIC_BUILD_VARIABLES) {
    const value = publicOverrides[name];
    if (hasSafePublicValue(name, value)) result[name] = value;
  }

  return result;
}

module.exports = {
  PUBLIC_BUILD_VARIABLES,
  TOOLING_ENVIRONMENT_VARIABLES,
  createMetroEnvironment,
  isSensitiveEnvironmentName,
};
