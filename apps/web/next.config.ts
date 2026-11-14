import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma client is loaded from node_modules at runtime (not bundled)
  serverExternalPackages: ["@prisma/client", "googleapis"],
  // Note: File upload size limit is controlled by MAX_SIZE in app/api/admin/upload-event-asset/route.ts
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
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/portal-events/:id/share-image.jpg",
        destination: "/api/portal-events/:id/share-image",
      },
    ];
  },
};

export default nextConfig;
