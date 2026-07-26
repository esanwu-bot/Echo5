"use client"

/**
 * 导购助手页面
 * 提供AI驱动的芯片导购服务
 */

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import GuideChatArea from "@/components/guide/GuideChatArea"

export default function GuidePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // 页面标题
  useEffect(() => {
    document.title = t('导购助手 - 天启芯科技')
  }, [t])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 返回导航 */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('返回')}</span>
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <span className="text-sm text-slate-500">{t('半导体导购助手')}</span>
        </div>
      </div>

      {/* 导购聊天区域 */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        <GuideChatArea />
      </div>
    </div>
  )
}
