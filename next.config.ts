import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Disable Vercel toolbar on all deployments
  devIndicators: false,
};

export default nextConfig;
