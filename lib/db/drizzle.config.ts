import { defineConfig } from "drizzle-kit";
import path from "path";

// DATABASE_URL is only needed by commands that touch a live database
// (push/migrate/studio). Offline commands (generate) must work without it so
// migrations can be authored in CI and sandboxes with no provisioned DB.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  ...(url ? { dbCredentials: { url } } : {}),
});
