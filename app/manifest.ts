import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Black Gaming",
    short_name: "Black Gaming",
    description: "Système de gestion — BLACK GAMING",
    start_url: "/admin",
    display: "standalone",
    background_color: "#03123d",
    theme_color: "#03123d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}