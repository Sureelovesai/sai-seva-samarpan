import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env from the directory containing this config (apps/web), so env vars
// are set even when running "prisma" from repo root
const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(configDir, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  engine: "classic",
  datasource: { url: env("DATABASE_URL") },
});