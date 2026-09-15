import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@lcs/shared"],
  serverExternalPackages: ["sharp"],
  async rewrites() {
    const fallback = process.env.VERCEL
      ? "https://editd-a0u0.onrender.com"
      : "http://localhost:4000";
    const api = (process.env.API_PROXY || process.env.NEXT_PUBLIC_API_URL || fallback).replace(/\/api\/?$/, "");
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${api}/socket.io/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
