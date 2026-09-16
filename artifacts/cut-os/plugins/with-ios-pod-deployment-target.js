const { withPodfile } = require("expo/config-plugins");

const IOS_DEPLOYMENT_TARGET = "17.0";
const PATCH_MARKER = "# CUT OS pod deployment target";

function uniqueMatch(contents, pattern, label) {
  const matches = [...contents.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(
      `CUT OS expected exactly one ${label}; refusing to generate an unverified Podfile.`,
    );
  }
  return matches[0];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function closingParenthesisIndex(contents, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let comment = false;

  for (let index = openingIndex; index < contents.length; index += 1) {
    const character = contents[index];
    if (comment) {
      if (character === "\n") comment = false;
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "#") {
      comment = true;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(
    "CUT OS could not locate the end of Expo's react_native_post_install call; refusing to generate an unverified Podfile.",
  );
}

function patchPodfile(contents) {
  const postInstallMatch = uniqueMatch(
    contents,
    /^([\t ]*)post_install do \|installer\|[\t ]*$/gmu,
    "Expo iOS post_install block",
  );
  const reactNativePostInstallMatch = uniqueMatch(
    contents,
    /^([\t ]*)react_native_post_install\(/gmu,
    "react_native_post_install call",
  );
  const postInstallStart = postInstallMatch.index;
  const hookStart = reactNativePostInstallMatch.index;
  const postInstallIndent = postInstallMatch[1];
  const hookIndent = reactNativePostInstallMatch[1];
  const postInstallBodyStart = postInstallStart + postInstallMatch[0].length;
  const postInstallEndMatch = contents
    .slice(postInstallBodyStart)
    .match(new RegExp(`^${escapeRegExp(postInstallIndent)}end[\\t ]*$`, "mu"));
  if (!postInstallEndMatch) {
    throw new Error(
      "CUT OS could not locate the end of Expo's iOS post_install block; refusing to generate an unverified Podfile.",
    );
  }
  const postInstallEnd = postInstallBodyStart + postInstallEndMatch.index;
  const contentBeforeHook = contents.slice(postInstallBodyStart, hookStart);
  const hookIsDirectFirstStatement = /^\n(?:[\t ]*\n)*$/u.test(
    contentBeforeHook,
  );
  if (
    hookStart <= postInstallStart ||
    hookStart >= postInstallEnd ||
    hookIndent !== `${postInstallIndent}  ` ||
    !hookIsDirectFirstStatement
  ) {
    throw new Error(
      "CUT OS found react_native_post_install outside the verified top level of Expo's iOS post_install block; refusing to generate an unverified Podfile.",
    );
  }

  const openingParenthesis = contents.indexOf("(", hookStart);
  const hookEnd = closingParenthesisIndex(contents, openingParenthesis);
  if (hookEnd >= postInstallEnd) {
    throw new Error(
      "CUT OS found an unterminated react_native_post_install call inside Expo's iOS post_install block; refusing to generate an unverified Podfile.",
    );
  }

  const patch = `

    ${PATCH_MARKER}
    # Align every pod with the generated app target, with iOS
    # ${IOS_DEPLOYMENT_TARGET} as the fail-safe floor required by CUT OS and Clerk.
    app_deployment_target = podfile_properties['ios.deploymentTarget'].to_s.strip
    app_deployment_target = '0' if app_deployment_target.empty?
    unless app_deployment_target.match?(/\\A\\d+(?:\\.\\d+)*\\z/)
      raise 'CUT OS found a nonnumeric app deployment target; refusing an unverified pod configuration.'
    end
    minimum_ios_version = [
      Gem::Version.new(app_deployment_target),
      Gem::Version.new('${IOS_DEPLOYMENT_TARGET}'),
    ].max
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |build_configuration|
        configured_version = build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        configured_version = configured_version.to_s.strip
        if configured_version.empty?
          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios_version.to_s
        elsif configured_version.match?(/\\A\\d+(?:\\.\\d+)*\\z/)
          if Gem::Version.new(configured_version) < minimum_ios_version
            build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios_version.to_s
          end
        else
          raise 'CUT OS found a nonnumeric pod deployment target; refusing an unverified pod configuration.'
        end
      end
    end`;

  const markerMatches = [...contents.matchAll(new RegExp(PATCH_MARKER, "gu"))];
  if (markerMatches.length > 0) {
    const markerIndex = markerMatches[0].index;
    const completeExistingPatch =
      markerMatches.length === 1 &&
      markerIndex > hookEnd &&
      markerIndex < postInstallEnd &&
      contents.startsWith(patch, hookEnd + 1);
    if (!completeExistingPatch) {
      throw new Error(
        "CUT OS found an incomplete or misplaced iOS deployment-target patch; refusing to generate an unverified Podfile.",
      );
    }
    return contents;
  }

  return `${contents.slice(0, hookEnd + 1)}${patch}${contents.slice(hookEnd + 1)}`;
}

function withIosPodDeploymentTarget(config) {
  return withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = patchPodfile(modConfig.modResults.contents);
    return modConfig;
  });
}

module.exports = withIosPodDeploymentTarget;
module.exports.patchPodfile = patchPodfile;
