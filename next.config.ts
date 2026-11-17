import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/uploads/:filename", destination: "/api/media/legacy/:filename" },
        { source: "/avatar.webp", destination: "/api/media/legacy/avatar.webp" },
      ],
    };
  },
};

export default nextConfig;
