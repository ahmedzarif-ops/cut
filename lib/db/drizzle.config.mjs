import { defineConfig } from "drizzle-kit";
const url = process.env.DATABASE_URL;

export default defineConfig({
  // drizzle-kit resolves these from the package working directory. Relative
  // paths also avoid its snapshot loader incorrectly prefixing absolute paths.
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
});
