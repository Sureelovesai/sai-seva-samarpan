import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load .env from the directory containing this config (apps/web), so env vars
// are set even when running "prisma" from repo root
const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(configDir, ".env") });
dotenv.config({ path: path.join(configDir, ".env.local") });

const databaseUrl = process.env.DATABASE_URL?.trim() || "";
/**
 * Neon: use the dashboard "Direct" connection string (host without `-pooler`) for migrations.
 * If unset, falls back to DATABASE_URL (OK if that URL is already direct).
 * Pooled URLs alone often cause P1017 during `migrate deploy`.
 */
const directUrlForMigrations = process.env.DIRECT_URL?.trim() || databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: directUrlForMigrations || env("DATABASE_URL"),
  },
});