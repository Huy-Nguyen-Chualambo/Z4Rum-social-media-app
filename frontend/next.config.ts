import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The movie section is gone (bản quyền + z4phim tách riêng); Z4chat took its
  // slot. Old links and bookmarks land on the new feature instead of a 404.
  async redirects() {
    return [
      { source: "/movies", destination: "/z4chat", permanent: false },
      { source: "/movies/:slug", destination: "/z4chat", permanent: false },
    ];
  },
};

export default nextConfig;
