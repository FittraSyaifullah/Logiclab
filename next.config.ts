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
  eslint: {
    // ✅ Don’t block production builds on lint errors
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
