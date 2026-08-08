import DeclaredAgeRange
import ExpoModulesCore
import UIKit

public final class CutDeclaredAgeRangeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CutDeclaredAgeRange")

    AsyncFunction("getStatusAsync") { () async throws -> [String: Any] in
      guard #available(iOS 26.2, *) else {
        return [
          "supported": false,
          "isEligibleForAgeFeatures": false,
          "requiredFeatures": []
        ]
      }

      let service = AgeRangeService.shared
      let isEligible = try await service.isEligibleForAgeFeatures
      var requiredFeatures: [String] = []

      if isEligible {
        if #available(iOS 26.4, *) {
          let features = try await service.requiredRegulatoryFeatures
          if features.contains(.declaredAgeRangeRequired) {
            requiredFeatures.append("declaredAgeRangeRequired")
          }
          if features.contains(.significantAppChangeRequiresParentalConsent) {
            requiredFeatures.append("significantAppChangeRequiresParentalConsent")
          }
          if features.contains(.significantAppChangeRequiresAdultNotification) {
            requiredFeatures.append("significantAppChangeRequiresAdultNotification")
          }
        } else {
          // iOS 26.2 and 26.3 identify regulated users with the eligibility
          // property but do not expose the more specific feature set.
          requiredFeatures.append("declaredAgeRangeRequired")
        }
      }

      return [
        "supported": true,
        "isEligibleForAgeFeatures": isEligible,
        "requiredFeatures": requiredFeatures
      ]
    }

    AsyncFunction("requestAdultAgeRangeAsync") { () async throws -> [String: Any] in
      guard #available(iOS 26.2, *) else {
        throw Exception(
          name: "DeclaredAgeRangeUnavailable",
          description: "Apple age-range sharing is unavailable on this version of iOS."
        )
      }

      let viewController = await MainActor.run {
        self.appContext?.utilities?.currentViewController()
      }
      guard let viewController else {
        throw Exception(
          name: "DeclaredAgeRangeViewUnavailable",
          description: "CUT OS could not safely present Apple's age-range sheet."
        )
      }

      let response = try await AgeRangeService.shared.requestAgeRange(
        ageGates: 18,
        in: viewController
      )

      switch response {
      case .declinedSharing:
        return ["status": "declined"]
      case let .sharing(range):
        let lowerBound: Any = range.lowerBound.map { $0 as Any } ?? NSNull()
        let upperBound: Any = range.upperBound.map { $0 as Any } ?? NSNull()
        return [
          "status": "sharing",
          "lowerBound": lowerBound,
          "upperBound": upperBound
        ]
      }
    }
  }
}
