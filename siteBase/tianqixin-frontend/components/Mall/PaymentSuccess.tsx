import type React from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

interface PaymentSuccessProps {
  onNavigate?: (path: string) => void
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onNavigate }) => {
  const { t } = useTranslation()
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <div className="bg-white border-b py-4">
        <div className="container mx-auto px-4 md:px-[10%] flex items-center gap-4">
          <div className="text-[#e60012] border-2 border-[#e60012] rounded-full p-1">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold">{t('订单已提交')}</h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white mt-8 mx-auto w-full max-w-6xl h-96">
        <div className="text-center">
          <div className="inline-block mb-4">
            <CheckCircle className="w-20 h-20 text-green-500" fill="currentColor" color="white" />
          </div>
          <h2 className="text-2xl text-gray-700 mb-2">{t('提交订单成功')}</h2>
          <p className="text-gray-500 mb-8">{t('我们客服会主动跟您联系，请保持手机畅通')}</p>
          <div className="flex gap-4 justify-center">
            {onNavigate ? (
              <button onClick={() => onNavigate('/member/orders')} className="px-8 py-3 bg-[#e60012] text-white hover:bg-red-700">
                {t('查看我的订单')}
              </button>
            ) : (
              <Link href="/member/orders" className="px-8 py-3 bg-[#e60012] text-white hover:bg-red-700">
                {t('查看我的订单')}
              </Link>
            )}
            {onNavigate ? (
              <button onClick={() => onNavigate('/mall')} className="px-8 py-3 border text-gray-500 hover:bg-gray-50">
                {t('返回商城')}
              </button>
            ) : (
              <Link href="/mall" className="px-8 py-3 border text-gray-500 hover:bg-gray-50">
                {t('返回商城')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
