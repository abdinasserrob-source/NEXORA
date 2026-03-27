import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Désactive l’indicateur « N » / activité de build en bas à gauche en dev. */
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
