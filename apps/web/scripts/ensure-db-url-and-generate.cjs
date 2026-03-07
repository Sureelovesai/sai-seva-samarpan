/**
 * Sets DATABASE_URL to a dummy value if missing (for Vercel/build environments)
 * then runs prisma generate. Runtime still needs a real DATABASE_URL in env.
 */
const { execSync } = require("child_process");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://localhost:5432/dummy?schema=public";
}

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const normalizedPath = path.normalize(schemaPath);
execSync(`npx prisma generate --schema="${normalizedPath}"`, {
  stdio: "inherit",
  env: process.env,
  cwd: path.join(__dirname, ".."),
});
