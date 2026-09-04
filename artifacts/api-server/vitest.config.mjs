import { defineConfig } from "vitest/config";

// Native ESM avoids a TypeScript config-loader dependency before the test
// suite starts. The application and tests remain TypeScript.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // PGlite boots a WASM Postgres per suite; give hooks generous headroom.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
