"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

interface PaymentProps {
  onNavigate?: (path: string) => void
}

export const Payment: React.FC<PaymentProps> = ({ onNavigate }) => {
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    // 支付功能暂未开放，3秒后自动跳转
    const timer = setTimeout(() => {
      if (onNavigate) {
        onNavigate("/member/orders")
      } else {
        router.push("/member/orders")
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [router, onNavigate])

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b py-4 mb-8">
        <div className="container mx-auto px-4 md:px-[10%] flex items-center gap-4">
          <div className="text-[#e60012] border-2 border-[#e60012] rounded-full p-1">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">{t('订单已提交')}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-[10%] bg-white p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <CheckCircle className="text-green-500 w-16 h-16" fill="currentColor" color="white" />
          <div className="text-2xl text-gray-800">{t('提交订单成功')}</div>
          <div className="text-gray-500 text-lg">
            {t('我们客服会主动跟您联系，请保持手机畅通')}
          </div>
          <div className="text-gray-400 text-sm">
            {t('页面将在 3 秒后自动跳转到订单列表')}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/member/orders" className="px-8 py-3 bg-[#e60012] text-white hover:bg-red-700">
            {t('查看我的订单')}
          </Link>
          <Link href="/mall" className="px-8 py-3 border text-gray-500 hover:bg-gray-50">
            {t('返回商城')}
          </Link>
        </div>
      </div>
    </div>
  )
}
