import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { patchPodfile } = require("../plugins/with-ios-pod-deployment-target");

const generatedPodfile = `target 'CUTOS' do
  use_expo_modules!

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
end
`;

describe("iOS pod deployment-target plugin", () => {
  it("aligns every generated pod target after React Native post-install", () => {
    const patched = patchPodfile(generatedPodfile);

    expect(patched).toContain("# CUT OS pod deployment target");
    expect(patched).toContain(
      "build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios_version.to_s",
    );
    expect(patched).toContain("Gem::Version.new(app_deployment_target)");
    expect(patched).toContain(
      "raise 'CUT OS found a nonnumeric pod deployment target; refusing an unverified pod configuration.'",
    );
    expect(patched.indexOf("react_native_post_install(")).toBeLessThan(
      patched.indexOf("# CUT OS pod deployment target"),
    );
  });

  it("is idempotent", () => {
    const once = patchPodfile(generatedPodfile);

    expect(patchPodfile(once)).toBe(once);
    expect(once.match(/# CUT OS pod deployment target/gu)).toHaveLength(1);
  });

  it("fails closed when Expo's post-install shape is not present", () => {
    expect(() => patchPodfile("target 'CUTOS' do\nend\n")).toThrow(
      "refusing to generate an unverified Podfile",
    );
  });

  it("never inserts into a later CocoaPods lifecycle block", () => {
    const withTrailingBlock = `${generatedPodfile}\npost_integrate do |installer|\n  puts installer\nend\n`;
    const patched = patchPodfile(withTrailingBlock);

    expect(patched.indexOf("# CUT OS pod deployment target")).toBeLessThan(
      patched.indexOf("post_integrate do |installer|"),
    );
    expect(
      patched.slice(patched.indexOf("post_integrate do |installer|")),
    ).not.toContain("# CUT OS pod deployment target");
  });

  it("rejects a marker-only or misplaced existing patch", () => {
    const corrupt = generatedPodfile.replace(
      "    react_native_post_install(",
      `    # CUT OS pod deployment target\n    react_native_post_install(`,
    );

    expect(() => patchPodfile(corrupt)).toThrow(
      "refusing to generate an unverified Podfile",
    );
  });

  it("rejects a React Native hook nested inside another Ruby block", () => {
    const nested = generatedPodfile.replace(
      "    react_native_post_install(",
      "    if ENV['CUT_NESTED']\n      react_native_post_install(",
    );

    expect(() => patchPodfile(nested)).toThrow(
      "outside the verified top level",
    );
  });

  it("rejects a React Native hook outside the post-install block", () => {
    const outside = generatedPodfile
      .replace(/    react_native_post_install\([\s\S]*?    \)\n/u, "")
      .replace(
        "end\n",
        `end\n\nreact_native_post_install(\n  installer,\n  config[:reactNativePath],\n)\n`,
      );

    expect(() => patchPodfile(outside)).toThrow(
      "outside the verified top level",
    );
  });

  it("rejects an existing patch whose assignment was commented out", () => {
    const patched = patchPodfile(generatedPodfile);
    const corrupt = patched.replace(
      "          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios_version.to_s",
      "          # build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios_version.to_s",
    );

    expect(() => patchPodfile(corrupt)).toThrow(
      "incomplete or misplaced iOS deployment-target patch",
    );
  });
});
