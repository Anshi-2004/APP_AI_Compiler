import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 2: Allow images from AI-generated sources
  images: {
    remotePatterns: [],
  },
  // Suppress hydration warnings from dark mode class
  reactStrictMode: true,
  // Phase 2: Enable server actions for API proxy
  experimental: {},
};

export default nextConfig;
