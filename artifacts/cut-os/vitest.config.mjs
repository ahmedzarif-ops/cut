import { defineConfig } from "vitest/config";

// Keep this config as native ESM. Loading a TypeScript config makes Vite spin
// up an esbuild config-loader service before tests can start, which is brittle
// in local Apple Silicon and stripped-down CI environments.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
