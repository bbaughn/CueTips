import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.discogs.com",
      },
      {
        protocol: "https",
        hostname: "i.discogs.com",
      },
    ],
  },
};

export default nextConfig;
