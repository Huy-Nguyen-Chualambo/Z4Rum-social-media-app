import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Z4rum",
    short_name: "Z4rum",
    description: "Z4rum Social App",
    lang: "vi",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#0a0f1e",
    theme_color: "#0a0f1e",
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
