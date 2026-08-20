import path from "node:path";

import type { NextConfig } from "next";

import { OPTIMISED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  // This app sits inside a larger repo with a stray lockfile above it in the
  // user's home directory. Pinning the root stops Turbopack guessing.
  turbopack: { root: path.resolve(".") },
  images: {
    remotePatterns: OPTIMISED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default nextConfig;
