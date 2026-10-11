import type { MetadataRoute } from "next";

/** PWA 매니페스트 (/manifest.webmanifest). 홈 화면 설치용 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "가족 퀘스트",
    short_name: "가족 퀘스트",
    description: "가족 건강습관 퀘스트",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F3FA",
    theme_color: "#C9D2FF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
