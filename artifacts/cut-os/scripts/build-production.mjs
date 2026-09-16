#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createRequestHandler } = require("../server/serve.js");

// Replit's production public artifact is a zero-JavaScript launch/legal server.
// Constructing its exact request handler validates the canonical public origin,
// templates, publication mode, and approval hashes without creating an Expo Go
// bundle. Native App Store bundles are built separately through EAS.
createRequestHandler({ previewMode: false });

console.log(
  "Validated CUT production public site without generating Expo preview assets.",
);
