import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Header } from "../components/Header"
import { Footer } from "../components/Footer"
import { AuthProvider } from "../contexts/auth-context"
import { Toaster } from "sonner"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "天启芯科技 - Tianqixin Technology",
  description: "为全球电子制造提供更加优质、高效、便捷的电子元件供应与服务",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

// 语言代码到 HTML lang 属性的映射
const htmlLangMap: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 从 localStorage 读取当前语言，动态设置 html lang 属性
  const currentLang = typeof window !== 'undefined'
    ? (localStorage.getItem('lang') || 'zh')
    : 'zh'
  const htmlLang = htmlLangMap[currentLang] || 'zh-CN'

  return (
    <html lang={htmlLang}>
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <div className="min-h-screen w-full bg-white flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Analytics />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
