import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { fonts } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "壶天 · AI SEO/GEO Agent",
  description: "壶天 SEO/GEO 智能优化平台 — 让品牌被生成式引擎看见",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${fonts.disp.variable} ${fonts.sans.variable} ${fonts.mono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
