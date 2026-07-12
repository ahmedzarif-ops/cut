import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // PGlite boots a WASM Postgres per suite; give hooks generous headroom.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
