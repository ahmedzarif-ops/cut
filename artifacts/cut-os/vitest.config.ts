import { defineConfig } from "vitest/config";

// Unit tests cover pure logic under lib/ only. Screens/components are React
// Native modules and are exercised via the simulator QA flow, not vitest.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
