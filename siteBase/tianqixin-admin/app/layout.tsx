import type { Metadata } from 'next'
import './globals.css'
import AppLayout from '../components/AppLayout'
import AuthGuard from '../components/AuthGuard'
import { AuthProvider } from '../contexts/AuthContext'
import { App } from 'antd'

export const metadata: Metadata = {
  title: '天启芯管理系统',
  description: '天启芯后台管理系统',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <App>
          <AuthProvider>
            <AuthGuard>
              <AppLayout>
                {children}
              </AppLayout>
            </AuthGuard>
          </AuthProvider>
        </App>
      </body>
    </html>
  )
}
