import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    formats: ["image/avif", "image/webp"],
  },
  // These ship native or Node-only code and must not be bundled into the server build.
  serverExternalPackages: ["mongoose", "pino", "bcryptjs"],
};

export default nextConfig;
