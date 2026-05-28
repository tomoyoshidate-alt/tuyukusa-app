import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  },
  {
    key: "Pragma",
    value: "no-cache",
  },
  {
    key: "Expires",
    value: "0",
  },
];

const nextConfig: NextConfig = {
  generateEtags: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: noStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
