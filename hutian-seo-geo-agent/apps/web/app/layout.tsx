import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Space_Grotesk, JetBrains_Mono, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const fontDisp = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-disp",
  display: "swap",
});

const fontSans = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
      className={`${fontDisp.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
