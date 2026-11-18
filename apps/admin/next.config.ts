import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**" },
    ],
  },
  transpilePackages: [
    "@pharma/api-client",
    "@pharma/shared-types",
    "@pharma/validation",
  ],
};

export default nextConfig;
