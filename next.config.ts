import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  serverExternalPackages: ["@node-rs/argon2"],
  images: {
    unoptimized: true, // 👈 加上这一行，关闭服务端图片下载和优化
    remotePatterns: [
      {
        protocol: "https",
        hostname: `oku8n3uf8g.ufs.sh`,
        pathname: "/f/*",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;