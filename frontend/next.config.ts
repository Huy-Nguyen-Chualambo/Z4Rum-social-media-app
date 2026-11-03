import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The movie section is gone (bản quyền + z4phim tách riêng); Z4chat took its
  // slot. Old links and bookmarks land on the new feature instead of a 404.
  async redirects() {
    return [
      { source: "/movies", destination: "/z4chat", permanent: false },
      { source: "/movies/:slug", destination: "/z4chat", permanent: false },
      // Z4world was replaced by Z4theater.
      { source: "/z4world", destination: "/z4theater", permanent: false },
      { source: "/z4world/:path*", destination: "/z4theater", permanent: false },
    ];
  },
};

export default nextConfig;
