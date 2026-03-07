/**
 * Reset Seva activities, signups, and logged hours so all dashboards show 0.
 * Run from apps/web: node scripts/reset-all-data.js
 * (Uses .env in apps/web for DATABASE_URL.)
 */
const path = require("path");
const fs = require("fs");

// Load .env from apps/web
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
            val = val.slice(1, -1);
          process.env[key] = val;
        }
      }
    });
}

const { PrismaClient } = require(".prisma/client");
const prisma = new PrismaClient();

async function main() {
  const signups = await prisma.sevaSignup.deleteMany({});
  const activities = await prisma.sevaActivity.deleteMany({});
  const loggedHours = await prisma.loggedHours.deleteMany({});
  console.log("Reset complete:");
  console.log("  SevaSignup deleted:", signups.count);
  console.log("  SevaActivity deleted:", activities.count);
  console.log("  LoggedHours deleted:", loggedHours.count);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
