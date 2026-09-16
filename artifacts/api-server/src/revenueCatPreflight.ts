import {
  RevenueCatConfigurationPreflightError,
  verifyRevenueCatConfiguration,
} from "./lib/revenueCatConfigurationPreflight";

async function run(): Promise<void> {
  try {
    await verifyRevenueCatConfiguration({
      apiKey: process.env["REVENUECAT_SECRET_API_KEY"],
      projectId: process.env["REVENUECAT_PROJECT_ID"],
      entitlementRestId: process.env["REVENUECAT_ENTITLEMENT_REST_ID"],
      appRestId: process.env["REVENUECAT_APP_REST_ID"],
      offeringRestId: process.env["REVENUECAT_OFFERING_REST_ID"],
    });
    process.stdout.write('{"status":"verified"}\n');
  } catch (error) {
    const reason =
      error instanceof RevenueCatConfigurationPreflightError
        ? error.reason
        : "unknown_error";
    process.stderr.write(`${JSON.stringify({ status: "failed", reason })}\n`);
    process.exitCode = 1;
  }
}

void run();
