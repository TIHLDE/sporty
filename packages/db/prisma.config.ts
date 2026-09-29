import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig, env } from "prisma/config";

// The web app owns the env file; load it so the Prisma CLI sees DATABASE_URL.
const webEnvFile = path.join(import.meta.dirname, "../../apps/web/.env");
if (!process.env.DATABASE_URL && existsSync(webEnvFile)) {
  process.loadEnvFile(webEnvFile);
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
