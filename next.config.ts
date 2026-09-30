import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos are private: they're resized by our own /p/ route, which checks who's asking.
    loader: "custom",
    loaderFile: "./src/lib/photoLoader.ts",
  },
};

export default nextConfig;
