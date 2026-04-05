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

type GlobalPrisma = {
  prisma?: PrismaClientInstance;
  /** Dev only: avoid replacing the singleton in a loop when codegen truly has no contribution models */
  __prismaStaleRebuildDone?: boolean;
  __prismaListedAsCommunityOutreachWarned?: boolean;
};

const globalForPrisma = globalThis as unknown as GlobalPrisma;

function createPrismaClient(): PrismaClientInstance {
  return adapter
    ? new PrismaClient({ adapter: adapter as never, log: ["error"] })
    : new PrismaClient({ log: ["error"] });
}

/** True when generated client matches schema (SevaActivity.listedAsCommunityOutreach). */
function sevaActivityHasListedAsCommunityOutreachField(client: PrismaClientInstance): boolean {
  const fields = (
    client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: { name: string }[] }> };
    }
  )._runtimeDataModel?.models?.SevaActivity?.fields;
  if (!fields?.length) return true;
  return fields.some((f) => f.name === "listedAsCommunityOutreach");
}

/**
 * After `npx prisma generate`, the dev singleton on `globalThis` can still be an OLD PrismaClient
 * instance (missing new delegates like `sevaContributionItem`), which causes
 * "Cannot read properties of undefined (reading 'findMany')". Replace it once in development.
 */
function getPrisma(): PrismaClientInstance {
  let client = globalForPrisma.prisma;

  if (!client) {
    client = createPrismaClient();
    // Always attach to globalThis (dev + prod). Omitting this in production can create multiple
    // PrismaClient instances under Next.js/Turbopack and exhaust Neon’s connection limit (P2037).
    globalForPrisma.prisma = client;
    return client;
  }

  const delegate = (client as { sevaContributionItem?: { findMany?: unknown } }).sevaContributionItem;
  const missingContributionApi = typeof delegate?.findMany !== "function";
  const shouldRebuild =
    process.env.NODE_ENV !== "production" &&
    missingContributionApi &&
    !globalForPrisma.__prismaStaleRebuildDone;

  if (shouldRebuild) {
    globalForPrisma.__prismaStaleRebuildDone = true;
    console.warn(
      "[prisma] Replacing cached dev client: it was created before the latest schema (e.g. item contributions). If errors continue, run: npx prisma generate && restart the dev server."
    );
    client.$disconnect().catch(() => {});
    client = createPrismaClient();
    globalForPrisma.prisma = client;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    !globalForPrisma.__prismaListedAsCommunityOutreachWarned &&
    !sevaActivityHasListedAsCommunityOutreachField(client)
  ) {
    globalForPrisma.__prismaListedAsCommunityOutreachWarned = true;
    console.error(
      "[prisma] Generated client is out of date: SevaActivity.listedAsCommunityOutreach is missing.\n" +
        "  `prisma migrate deploy` only updates the database. Regenerate the client:\n" +
        "  1. Stop the dev server (it locks query_engine-windows.dll.node on Windows).\n" +
        "  2. From apps/web: npx prisma generate\n" +
        "  3. Start the dev server again."
    );
  }

  return client;
}

export const prisma = getPrisma();
