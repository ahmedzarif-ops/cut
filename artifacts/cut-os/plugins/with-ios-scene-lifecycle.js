const fs = require("node:fs");
const path = require("node:path");

const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const APP_DELEGATE_MARKER = "// CUT OS scene lifecycle";
const SCENE_CONFIGURATION_NAME = "Default Configuration";
const SCENE_DELEGATE_FILE = "SceneDelegate.swift";

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneClassName: "UIWindowScene",
        UISceneConfigurationName: SCENE_CONFIGURATION_NAME,
        UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
      },
    ],
  },
};

const LEGACY_REACT_NATIVE_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const TVOS_REACT_NATIVE_START = `#if os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const APP_DELEGATE_SCENE_CONFIGURATION = `
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    guard connectingSceneSession.role == .windowApplication else {
      return UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
    }

    let configuration = UISceneConfiguration(
      name: "${SCENE_CONFIGURATION_NAME}",
      sessionRole: connectingSceneSession.role)
    configuration.sceneClass = UIWindowScene.self
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

const SCENE_DELEGATE_SWIFT = `import React
import UIKit

@MainActor
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      fatalError("CUT OS expected a UIWindowScene for its application scene")
    }

    let appDelegate = requireAppDelegate()

    if let existingWindow = appDelegate.window,
      existingWindow.rootViewController != nil
    {
      existingWindow.windowScene = windowScene
      window = existingWindow
      existingWindow.makeKeyAndVisible()
      return
    }

    guard let factory = appDelegate.reactNativeFactory else {
      fatalError("CUT OS scene connected before Expo's React Native factory was initialized")
    }

    let sceneWindow = UIWindow(windowScene: windowScene)
    window = sceneWindow
    appDelegate.window = sceneWindow

    let launchOptions = makeLaunchOptions(
      appLaunchOptions: appDelegate.initialLaunchOptions,
      connectionOptions: connectionOptions)
    appDelegate.initialLaunchOptions = nil

    factory.startReactNative(
      withModuleName: "main",
      in: sceneWindow,
      launchOptions: launchOptions)
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    requireAppDelegate().applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    requireAppDelegate().applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    requireAppDelegate().applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    requireAppDelegate().applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    let appDelegate = requireAppDelegate()

    for context in URLContexts {
      _ = appDelegate.application(
        UIApplication.shared,
        open: context.url,
        options: makeApplicationOpenOptions(from: context))
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = requireAppDelegate().application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }

  private func requireAppDelegate() -> AppDelegate {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      fatalError("CUT OS could not resolve its Expo AppDelegate")
    }

    return appDelegate
  }

  private func makeApplicationOpenOptions(
    from context: UIOpenURLContext
  ) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [
      .openInPlace: context.options.openInPlace,
    ]

    if let sourceApplication = context.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = context.options.annotation {
      options[.annotation] = annotation
    }

    return options
  }

  private func makeLaunchOptions(
    appLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?,
    connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions = appLaunchOptions ?? [:]

    if let urlContext = connectionOptions.urlContexts.first {
      launchOptions[.url] = urlContext.url

      if let sourceApplication = urlContext.options.sourceApplication {
        launchOptions[.sourceApplication] = sourceApplication
      }
      if let annotation = urlContext.options.annotation {
        launchOptions[.annotation] = annotation
      }
    }

    if let userActivity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }

    return launchOptions.isEmpty ? nil : launchOptions
  }
}
`;

function countOccurrences(contents, needle) {
  return contents.split(needle).length - 1;
}

function canonicalizePlistValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizePlistValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalizePlistValue(value[key])]),
    );
  }

  return value;
}

function assertPatchedAppDelegate(contents) {
  const requiredSnippets = [
    APP_DELEGATE_MARKER,
    "var initialLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?",
    "self.initialLaunchOptions = launchOptions",
    "configurationForConnecting connectingSceneSession: UISceneSession",
    "configuration.delegateClass = SceneDelegate.self",
    TVOS_REACT_NATIVE_START,
  ];

  for (const snippet of requiredSnippets) {
    if (countOccurrences(contents, snippet) !== 1) {
      throw new Error(
        `CUT OS found an incomplete or duplicate iOS scene patch at: ${snippet}`,
      );
    }
  }

  if (contents.includes(LEGACY_REACT_NATIVE_START)) {
    throw new Error(
      "CUT OS found legacy iOS window creation after applying the scene lifecycle patch.",
    );
  }
}

function patchAppDelegate(contents) {
  if (contents.includes(APP_DELEGATE_MARKER)) {
    assertPatchedAppDelegate(contents);
    return contents;
  }

  const factoryProperty = "  var reactNativeFactory: RCTReactNativeFactory?\n";
  const didFinishAnchor = `  ) -> Bool {
    let delegate = ReactNativeDelegate()
`;
  const linkingAnchor = "\n  // Linking API\n";

  const expectedAnchors = [
    [factoryProperty, "Expo React Native factory property"],
    [didFinishAnchor, "Expo did-finish-launching body"],
    [LEGACY_REACT_NATIVE_START, "Expo legacy React Native window startup"],
    [linkingAnchor, "Expo linking methods"],
  ];

  for (const [anchor, label] of expectedAnchors) {
    if (countOccurrences(contents, anchor) !== 1) {
      throw new Error(
        `CUT OS could not uniquely locate ${label}; refusing to patch an unverified AppDelegate.`,
      );
    }
  }

  let patched = contents.replace(
    factoryProperty,
    `${factoryProperty}\n  ${APP_DELEGATE_MARKER}\n  var initialLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?\n`,
  );
  patched = patched.replace(
    didFinishAnchor,
    `  ) -> Bool {\n    self.initialLaunchOptions = launchOptions\n\n    let delegate = ReactNativeDelegate()\n`,
  );
  patched = patched.replace(LEGACY_REACT_NATIVE_START, TVOS_REACT_NATIVE_START);
  patched = patched.replace(
    linkingAnchor,
    `${APP_DELEGATE_SCENE_CONFIGURATION}${linkingAnchor}`,
  );

  assertPatchedAppDelegate(patched);
  return patched;
}

function configureSceneManifest(infoPlist) {
  const existing = infoPlist.UIApplicationSceneManifest;

  if (
    existing !== undefined &&
    JSON.stringify(canonicalizePlistValue(existing)) !==
      JSON.stringify(canonicalizePlistValue(SCENE_MANIFEST))
  ) {
    throw new Error(
      "CUT OS found a conflicting UIApplicationSceneManifest; refusing to overwrite an unverified scene configuration.",
    );
  }

  return {
    ...infoPlist,
    UIApplicationSceneManifest: structuredClone(SCENE_MANIFEST),
  };
}

function withSceneDelegateSource(config) {
  return withXcodeProject(config, (modConfig) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(
      modConfig.modRequest.projectRoot,
    );
    const relativeFilePath = path.join(projectName, SCENE_DELEGATE_FILE);
    const absoluteFilePath = path.join(
      modConfig.modRequest.platformProjectRoot,
      relativeFilePath,
    );

    if (fs.existsSync(absoluteFilePath)) {
      const existing = fs.readFileSync(absoluteFilePath, "utf8");
      if (existing !== SCENE_DELEGATE_SWIFT) {
        throw new Error(
          "CUT OS found a conflicting SceneDelegate.swift; refusing to overwrite native source.",
        );
      }
    }

    modConfig.modResults = IOSConfig.XcodeProjectFile.createBuildSourceFile({
      project: modConfig.modResults,
      nativeProjectRoot: modConfig.modRequest.platformProjectRoot,
      filePath: relativeFilePath,
      fileContents: SCENE_DELEGATE_SWIFT,
      overwrite: false,
    });

    const projectContents = modConfig.modResults.writeSync();
    if (
      countOccurrences(projectContents, `${SCENE_DELEGATE_FILE} in Sources`) < 2
    ) {
      throw new Error(
        "CUT OS could not verify SceneDelegate.swift in the application Sources build phase.",
      );
    }

    return modConfig;
  });
}

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (modConfig) => {
    modConfig.modResults = configureSceneManifest(modConfig.modResults);
    return modConfig;
  });

  config = withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== "swift") {
      throw new Error(
        "CUT OS requires a Swift AppDelegate for its verified iOS scene lifecycle patch.",
      );
    }

    modConfig.modResults.contents = patchAppDelegate(
      modConfig.modResults.contents,
    );
    return modConfig;
  });

  return withSceneDelegateSource(config);
}

module.exports = withIosSceneLifecycle;
module.exports.APP_DELEGATE_MARKER = APP_DELEGATE_MARKER;
module.exports.SCENE_DELEGATE_SWIFT = SCENE_DELEGATE_SWIFT;
module.exports.SCENE_MANIFEST = SCENE_MANIFEST;
module.exports.configureSceneManifest = configureSceneManifest;
module.exports.patchAppDelegate = patchAppDelegate;
