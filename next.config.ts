import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/minio-assets/:path*",
        destination: "http://localhost:9001/:path*",
      },
    ];
  },
};

export default nextConfig;
