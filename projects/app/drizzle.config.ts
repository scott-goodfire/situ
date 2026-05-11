import { homedir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/data/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url:
      process.env.SITU_DB_PATH ?? join(homedir(), ".situ", "sessions", "manual", "session.sqlite"),
  },
});
