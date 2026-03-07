import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client is loaded from node_modules at runtime (not bundled)
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
