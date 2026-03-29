/**
 * Sets DATABASE_URL to a dummy value if missing (for Vercel/build environments)
 * then runs prisma migrate deploy (when a real URL is provided), then prisma generate.
 * Runtime still needs a real DATABASE_URL in env.
 *
 * Neon + Prisma Migrate: if DIRECT_URL is unset, copy DATABASE_URL so generate/CLI
 * match prisma.config.ts. For migrations against a *pooled* URL, set DIRECT_URL in
 * .env to Neon's "Direct" connection string (see .env.example).
 *
 * Set SKIP_PRISMA_MIGRATE_ON_BUILD=1 to skip migrate deploy during build (manual only).
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const hadDatabaseUrl = Boolean(
  process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim()
);
if (!hadDatabaseUrl) {
  process.env.DATABASE_URL = "postgresql://localhost:5432/dummy?schema=public";
}

if (!process.env.DIRECT_URL || !String(process.env.DIRECT_URL).trim()) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const cwd = path.join(__dirname, "..");
const schemaPath = path.join(cwd, "prisma", "schema.prisma");
const normalizedPath = path.normalize(schemaPath);

/** postinstall uses --generate-only so we do not run migrate on every npm install (or twice on Vercel). */
const generateOnly = process.argv.includes("--generate-only");

function runMigrateDeploy() {
  if (generateOnly) return;
  if (!hadDatabaseUrl) return;
  if (process.env.SKIP_PRISMA_MIGRATE_ON_BUILD) {
    console.log(
      "[ensure-db-url-and-generate] SKIP_PRISMA_MIGRATE_ON_BUILD set; skipping prisma migrate deploy.\n"
    );
    return;
  }
  console.log("[ensure-db-url-and-generate] prisma migrate deploy …\n");
  execSync(`npx prisma migrate deploy --schema="${normalizedPath}"`, {
    stdio: "inherit",
    env: process.env,
    cwd,
  });
}
const generatedDir = path.join(cwd, "generated", "prisma");
const clientExists =
  fs.existsSync(path.join(generatedDir, "index.js")) ||
  fs.existsSync(path.join(generatedDir, "index.mjs"));

function runGenerate() {
  execSync(`npx prisma generate --schema="${normalizedPath}"`, {
    stdio: "inherit",
    env: process.env,
    cwd,
  });
}

try {
  runMigrateDeploy();
  runGenerate();
} catch (err) {
  const msg = err?.message || String(err);
  const isLikelyLock =
    msg.includes("EPERM") ||
    msg.includes("operation not permitted") ||
    msg.includes("rename");
  if (clientExists && isLikelyLock) {
    console.error(
      "\n[ensure-db-url-and-generate] Prisma generate failed (file locked). Using existing client and continuing.\n"
    );
    process.exit(0);
  }
  if (clientExists && err?.status === 1) {
    console.error(
      "\n[ensure-db-url-and-generate] Prisma generate failed. Using existing client and continuing.\n"
    );
    process.exit(0);
  }
  if (isLikelyLock) {
    console.error("\n---");
    console.error(
      "Prisma generate failed: the generated file is locked (often on Windows)."
    );
    console.error("Do this then run 'npm run build' again:");
    console.error(
      "  1. Stop the dev server (Ctrl+C in the terminal running 'npm run dev')."
    );
    console.error(
      "  2. Close Cursor/VS Code (or at least close this project folder)."
    );
    console.error("  3. Delete the folder: apps\\web\\generated");
    console.error("  4. Reopen the project and run: npm run build");
    console.error("---\n");
  }
  throw err;
}
