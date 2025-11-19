import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['v0-sdk'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
  // Configure server timeout for API routes
  serverRuntimeConfig: {
    maxDuration: 120, // 2 minutes
  },
  // Increase response limit for large AI responses
  experimental: {
  },
};

export default nextConfig;
