import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/app/Providers";
import { PwaRegister } from "@/components/app/PwaRegister";

// Pretendard 가변 폰트 — npm `pretendard` 패키지의 파일을 로컬 로드 (외부 요청 없음)
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "가족 퀘스트",
  description: "가족 건강습관 퀘스트 앱",
  applicationName: "가족 퀘스트",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "가족 퀘스트" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c9d2ff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
