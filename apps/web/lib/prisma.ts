import path from "node:path";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

// Resolve app root: on Vercel/deploy the root is process.cwd(); in monorepo it's process.cwd()/apps/web.
const appsWebPath = path.join(process.cwd(), "apps", "web");
const appRoot = existsSync(appsWebPath) ? appsWebPath : process.cwd();
const requireFromWeb = createRequire(path.join(appRoot, "package.json"));

// 1) Prefer generated client in app (apps/web/generated/prisma) – used on Vercel and after prisma generate
const generatedPath = path.join(appRoot, "generated", "prisma");
function loadPrismaClient() {
  try {
    const entry = path.join(generatedPath, "index.js");
    if (existsSync(entry)) {
      return requireFromWeb(entry).PrismaClient;
    }
  } catch {
    // no-op
  }
  try {
    return requireFromWeb(".prisma/client").PrismaClient;
  } catch {
    // no-op
  }
  throw new Error(
    "Prisma client not found. Run: npx prisma generate --schema=./prisma/schema.prisma (from apps/web), then try again."
  );
}

const PrismaClient = loadPrismaClient();

// Use Neon serverless adapter when DATABASE_URL points to Neon (recommended for Vercel/serverless).
const databaseUrl = process.env.DATABASE_URL;
const useNeonAdapter =
  typeof databaseUrl === "string" &&
  databaseUrl.includes("neon.tech") &&
  databaseUrl.length > 0;

let adapter: unknown = undefined;
if (useNeonAdapter) {
  try {
    const { PrismaNeon } = requireFromWeb("@prisma/adapter-neon");
    adapter = new PrismaNeon({ connectionString: databaseUrl! });
  } catch {
    // Adapter not installed or failed; fall back to default client
  }
}

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientInstance };

export const prisma =
  globalForPrisma.prisma ??
  (adapter
    ? new PrismaClient({ adapter: adapter as never, log: ["error"] })
    : new PrismaClient({ log: ["error"] }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
