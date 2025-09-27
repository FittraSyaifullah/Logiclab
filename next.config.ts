import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['v0-sdk'],
  // Configure server timeout for API routes
  serverRuntimeConfig: {
    maxDuration: 120, // 2 minutes
  },
  // Increase response limit for large AI responses
  experimental: {
    responseLimit: false,
  },
};

export default nextConfig;
