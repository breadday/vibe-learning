import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { WebVitals } from "@/components/WebVitals";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe Learning",
  description: "좋은 바이브코딩 영상을 빠르게 이해하고 직접 따라 해보는 학습 페이지",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        {children}
        <WebVitals />
        <Analytics />
      </body>
    </html>
  );
}
