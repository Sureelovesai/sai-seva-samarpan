/**
 * Sets DATABASE_URL to a dummy value if missing (for Vercel/build environments)
 * then runs prisma generate. Runtime still needs a real DATABASE_URL in env.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://localhost:5432/dummy?schema=public";
}

const cwd = path.join(__dirname, "..");
const schemaPath = path.join(cwd, "prisma", "schema.prisma");
const normalizedPath = path.normalize(schemaPath);
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
