import path from "node:path";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

// Resolve app root: on Vercel/deploy the root is process.cwd(); in monorepo it's process.cwd()/apps/web.
const appsWebPath = path.join(process.cwd(), "apps", "web");
const appRoot = existsSync(appsWebPath) ? appsWebPath : process.cwd();
const requireFromWeb = createRequire(path.join(appRoot, "package.json"));
// Require that resolves from this file's package (apps/web) so Node finds apps/web/node_modules/.prisma/client
function getRequireFromThisPackage() {
  if (typeof __filename !== "undefined") return createRequire(__filename);
  try {
    return createRequire((import.meta as { url?: string }).url ?? path.join(appRoot, "lib", "prisma.ts"));
  } catch {
    return requireFromWeb;
  }
}
const requireFromThisPackage = getRequireFromThisPackage();

// Only use static ".prisma/client" so Next.js bundler can resolve it. No require(variable).
function loadPrismaClient(): typeof import(".prisma/client").PrismaClient {
  try {
    return requireFromThisPackage(".prisma/client").PrismaClient;
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
