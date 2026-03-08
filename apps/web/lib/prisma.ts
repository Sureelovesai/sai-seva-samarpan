import path from "node:path";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

// Static import so the bundler (Turbopack/Webpack) uses the correct generated client with all schema fields (e.g. BlogPost.status).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient: GeneratedClient } = require("../generated/prisma");

// Resolve app root for adapter and requireFromWeb (Neon adapter, etc.).
const appsWebPath = path.join(process.cwd(), "apps", "web");
const appRoot = existsSync(appsWebPath) ? appsWebPath : process.cwd();
const requireFromWeb = createRequire(path.join(appRoot, "package.json"));

const PrismaClient = GeneratedClient;

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
