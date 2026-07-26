"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useNavigate } from "react-router-dom"

export const RegisterSuccess: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      navigate("/member")
    }
  }, [countdown, navigate])

  return (
    <div className="min-h-[calc(100vh-136px)] flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:block w-1/2 bg-[#f0f4f8] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-3/4 h-3/4">
                <div className="absolute inset-0 bg-blue-200/20 blur-3xl rounded-full"></div>
                <img src="/3d-isometric-cloud-server-technology-blue-white.jpg" alt="Cloud Technology" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Success Message */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50/50 p-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-[#e60012] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-medium text-gray-900 mb-2">{t('注册成功')}</h2>
          <p className="text-gray-500 mb-4">{t('您的账户已成功创建')}</p>
          <p className="text-sm text-gray-400">
            {t('将在')} <span className="text-[#e60012] font-bold">{countdown}</span> {t('秒后自动跳转到会员中心...')}
          </p>
          <button
            onClick={() => navigate("/member")}
            className="mt-8 px-8 py-2 bg-[#e60012] text-white rounded-md hover:bg-[#cc0010] transition-colors"
          >
            {t('立即前往')}
          </button>
        </div>
      </div>
    </div>
  )
}
