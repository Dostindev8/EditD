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
    const raw = (process.env.API_PROXY || process.env.NEXT_PUBLIC_API_URL || "").trim();
    // Empty/whitespace env must not become destination "/api/..." (self-loop → 404).
    const api = (raw || fallback).replace(/\/$/, "").replace(/\/api$/i, "");
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
