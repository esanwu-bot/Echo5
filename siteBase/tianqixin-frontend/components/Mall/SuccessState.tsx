"use client"

import type React from "react"
import { CheckCircle } from "lucide-react"
import { useTranslation } from 'react-i18next'

interface SuccessStateProps {
  type: "added" | "submitted"
  onNavigate?: (path: string) => void
  orderId?: string
  amount?: string
}

export const SuccessState: React.FC<SuccessStateProps> = ({ type, onNavigate, orderId, amount }) => {
  const { t } = useTranslation()
  const navTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      window.location.href = path
    }
  }

  if (type === "added") {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b mb-6">
          <div className="container mx-auto px-4 md:px-[10%] py-3 font-bold">{t('成功加入购物车')}</div>
        </div>
        <div className="container mx-auto px-4 md:px-[10%] bg-white p-8 py-12">
          <div className="flex items-center gap-4 mb-2">
            <CheckCircle className="text-green-500 w-12 h-12" fill="currentColor" color="white" />
            <span className="text-2xl text-gray-800">{t('已成功加入购物车！')}</span>
          </div>
          <div className="ml-16 text-gray-500 mb-8">{t('商品已添加到您的购物车中')}</div>
          <div className="ml-16 flex gap-4">
            <button onClick={() => navTo('/mall')} className="px-8 py-2 border text-gray-500 hover:bg-gray-50">
              {t('继续购物')}
            </button>
            <button onClick={() => navTo('/mall/cart')} className="px-8 py-2 bg-[#e60012] text-white hover:bg-red-700">
              {t('去购物车结算')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 订单提交成功 - 显示客服联系提示
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b py-4 mb-8">
        <div className="container mx-auto px-4 md:px-[10%] flex items-center gap-4">
          <div className="text-[#e60012] border border-[#e60012] rounded-full p-1">
            <CheckCircle className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold">{t('提交成功')}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-[10%] bg-white p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <CheckCircle className="text-green-500 w-16 h-16" fill="currentColor" color="white" />
          <div className="text-2xl text-gray-800">{t('提交订单成功')}</div>
          {orderId && (
            <div className="text-gray-600 text-sm">
              {t('订单号')}：{orderId}
            </div>
          )}
          {amount && (
            <div className="text-gray-600 text-sm">
              {t('订单金额')}：${amount} USD
            </div>
          )}
          <div className="text-gray-500 text-lg">
            {t('我们客服会主动跟您联系，请保持手机畅通')}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={() => navTo('/member/orders')} className="px-8 py-3 border text-gray-500 hover:bg-gray-50">
            {t('查看订单')}
          </button>
          <button onClick={() => navTo('/mall')} className="px-8 py-3 bg-[#e60012] text-white hover:bg-red-700">
            {t('继续购物')}
          </button>
        </div>
      </div>
    </div>
  )
}
