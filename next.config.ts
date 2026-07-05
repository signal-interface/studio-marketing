import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.studio.faradaycapitalsystems.com" }],
        destination: "https://studio.faradaycapitalsystems.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
