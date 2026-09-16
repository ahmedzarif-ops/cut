import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  APP_DELEGATE_MARKER,
  SCENE_DELEGATE_SWIFT,
  SCENE_MANIFEST,
  configureSceneManifest,
  patchAppDelegate,
} = require("../plugins/with-ios-scene-lifecycle");

const generatedAppDelegate = `import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }
}
`;

describe("iOS scene lifecycle plugin", () => {
  it("moves iOS React Native startup to a scene while preserving Expo launch", () => {
    const patched = patchAppDelegate(generatedAppDelegate);

    expect(patched).toContain(APP_DELEGATE_MARKER);
    expect(patched).toContain("self.initialLaunchOptions = launchOptions");
    expect(patched).toContain(
      "return super.application(application, didFinishLaunchingWithOptions: launchOptions)",
    );
    expect(patched).toContain(
      "configurationForConnecting connectingSceneSession: UISceneSession",
    );
    expect(patched).toContain(
      "configuration.delegateClass = SceneDelegate.self",
    );
    expect(patched).toContain("#if os(tvOS)");
    expect(patched).not.toContain("#if os(iOS) || os(tvOS)");
  });

  it("is idempotent and rejects incomplete marked patches", () => {
    const once = patchAppDelegate(generatedAppDelegate);

    expect(patchAppDelegate(once)).toBe(once);
    expect(once.match(/\/\/ CUT OS scene lifecycle/gu)).toHaveLength(1);
    expect(() =>
      patchAppDelegate(`${generatedAppDelegate}\n${APP_DELEGATE_MARKER}`),
    ).toThrow("incomplete or duplicate");
  });

  it("fails closed when Expo's generated AppDelegate shape changes", () => {
    expect(() => patchAppDelegate("public class AppDelegate {}\n")).toThrow(
      "refusing to patch an unverified AppDelegate",
    );
  });

  it("adds the exact single-window scene manifest and rejects conflicts", () => {
    expect(configureSceneManifest({ CFBundleDisplayName: "CUT OS" })).toEqual({
      CFBundleDisplayName: "CUT OS",
      UIApplicationSceneManifest: SCENE_MANIFEST,
    });
    expect(
      configureSceneManifest({ UIApplicationSceneManifest: SCENE_MANIFEST }),
    ).toEqual({ UIApplicationSceneManifest: SCENE_MANIFEST });
    const plistParsedManifest = Object.assign(
      Object.create(null),
      SCENE_MANIFEST,
    );
    expect(
      configureSceneManifest({
        UIApplicationSceneManifest: plistParsedManifest,
      }),
    ).toEqual({ UIApplicationSceneManifest: SCENE_MANIFEST });
    expect(() =>
      configureSceneManifest({
        UIApplicationSceneManifest: {
          UIApplicationSupportsMultipleScenes: true,
        },
      }),
    ).toThrow("conflicting UIApplicationSceneManifest");
  });

  it("wires Expo startup, subscriber lifecycle, and deep links through SceneDelegate", () => {
    expect(SCENE_DELEGATE_SWIFT).toContain(
      "UIWindow(windowScene: windowScene)",
    );
    expect(SCENE_DELEGATE_SWIFT).toContain("factory.startReactNative(");
    expect(SCENE_DELEGATE_SWIFT).toContain(
      "applicationDidBecomeActive(UIApplication.shared)",
    );
    expect(SCENE_DELEGATE_SWIFT).toContain(
      "openURLContexts URLContexts: Set<UIOpenURLContext>",
    );
    expect(SCENE_DELEGATE_SWIFT).toContain(
      "continue userActivity: NSUserActivity",
    );
    expect(SCENE_DELEGATE_SWIFT).toContain(
      "UIApplication.LaunchOptionsKey.userActivityType.rawValue",
    );
  });
});
