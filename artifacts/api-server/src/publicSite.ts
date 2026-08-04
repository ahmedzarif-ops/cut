import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import type { RequestHandler } from "express";
import { parseProductionCanonicalOrigin } from "./lib/allowedHosts";
import { hasRootProductionBasePath } from "./lib/productionConfig";

// The public/legal implementation remains shared with the mobile artifact's
// local legal tooling. esbuild bundles both this CommonJS module and its
// publication-gate dependency into the API production artifact.
// @ts-expect-error The source-controlled CommonJS module has no TS declaration.
import publicSiteModule from "../../cut-os/server/serve.js";

interface PublicSiteModule {
  createRequestHandler(options: {
    appName: string;
    basePath?: string;
    buildSha?: string;
    previewMode: false;
    publicationStatus?: string;
    publicAppOrigin: string;
    requireBuildSha: boolean;
    templateRoot: string;
  }): (request: IncomingMessage, response: ServerResponse) => void;
}

const { createRequestHandler } = publicSiteModule as PublicSiteModule;

const DEVELOPMENT_PUBLIC_ORIGIN = "https://preview.cutos.app";

/**
 * Resolve the one browser-facing origin used by the landing/legal surface,
 * CORS, and Clerk proxy. Production never guesses from Host or provider-
 * injected domain headers, and two different configured origins fail closed.
 */
export function resolvePublicSiteOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.NODE_ENV !== "production") {
    return env.PUBLIC_APP_ORIGIN ?? DEVELOPMENT_PUBLIC_ORIGIN;
  }

  const corsOrigin = parseProductionCanonicalOrigin(env.CORS_ALLOWED_ORIGINS);
  const publicOrigin = parseProductionCanonicalOrigin(env.PUBLIC_APP_ORIGIN);

  if (
    !corsOrigin ||
    !publicOrigin ||
    corsOrigin.origin !== publicOrigin.origin
  ) {
    throw new Error(
      "PUBLIC_APP_ORIGIN must exactly match the canonical CORS_ALLOWED_ORIGINS production origin.",
    );
  }

  return publicOrigin.origin;
}

/**
 * Development tooling may still mount its preview under a path. Production is
 * one root-routed application, so accepting a mounted public surface would
 * split its canonical/legal URLs from `/api` and the Clerk proxy.
 */
export function resolvePublicSiteBasePath(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (env.NODE_ENV !== "production") return env.BASE_PATH;
  if (!hasRootProductionBasePath(env.BASE_PATH)) {
    throw new Error(
      "BASE_PATH must be absent, empty, or / for the production single-host topology.",
    );
  }
  return undefined;
}

export function resolvePublicSiteTemplateRoot(
  env: NodeJS.ProcessEnv = process.env,
): string {
  // Production builds copy templates beside the bundle so the deployment is
  // self-contained. Vitest/source execution falls back to the shared source
  // directory without weakening the production build contract.
  const packagedRoot = fileURLToPath(
    new URL("./public-site/templates/", import.meta.url),
  );
  if (existsSync(packagedRoot)) return packagedRoot;

  if (env.NODE_ENV === "production") {
    throw new Error(
      "Packaged production public-site templates are missing from the API artifact.",
    );
  }

  return fileURLToPath(
    new URL("../../cut-os/server/templates/", import.meta.url),
  );
}

export function createProductionPublicSiteMiddleware(
  env: NodeJS.ProcessEnv = process.env,
): RequestHandler {
  const handler = createRequestHandler({
    appName: "CUT OS",
    basePath: resolvePublicSiteBasePath(env),
    buildSha: env.BUILD_SHA,
    previewMode: false,
    publicationStatus: env.LEGAL_SITE_PUBLICATION_STATUS,
    publicAppOrigin: resolvePublicSiteOrigin(env),
    requireBuildSha: env.NODE_ENV === "production",
    templateRoot: resolvePublicSiteTemplateRoot(env),
  });

  return (request, response) => {
    handler(request, response);
  };
}
