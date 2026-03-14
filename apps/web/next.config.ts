import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client is loaded from node_modules at runtime (not bundled)
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "andrehouse.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
