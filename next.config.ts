import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['v0-sdk'],
  },
  // Increase API route timeout to 2 minutes (120 seconds)
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  // Configure server timeout
  serverRuntimeConfig: {
    maxDuration: 120, // 2 minutes
  },
};

export default nextConfig;
