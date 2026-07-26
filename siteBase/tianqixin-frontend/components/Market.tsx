"use client"

import type React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { HomeData } from "../lib/api-client"

interface MarketProps {
  data?: HomeData["sections"]["coverage"]
}

export const Market: React.FC<MarketProps> = ({ data }) => {
  const { t } = useTranslation()
  const [activeRegion, setActiveRegion] = useState("")

  // 使用API返回的regions数据，如果没有则使用默认值
  const regions = data?.regions && data.regions.length > 0
    ? data.regions.map(r => r.name)
    : [t("亚洲"), t("欧洲"), t("北美"), t("非洲")]

  const displayRegions = regions.length > 0 ? regions : [t("亚洲"), t("欧洲"), t("北美"), t("非洲")]
  const currentActive = activeRegion || displayRegions[0]

  // 创建位置映射
  const positions: Record<string, string> = {}
  if (data?.regions && data.regions.length > 0) {
    data.regions.forEach(region => {
      positions[region.name] = region.position
    })
  } else {
    // 默认位置
    positions[t("亚洲")] = "top-[40%] right-[25%]"
    positions[t("欧洲")] = "top-[35%] right-[45%]"
    positions[t("北美")] = "top-[38%] left-[25%]"
    positions[t("非洲")] = "top-[55%] right-[48%]"
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{data?.title || t("市场覆盖广泛")}</h2>
        <p className="text-gray-600 text-sm max-w-3xl mx-auto mb-8">
          {data?.description ||
            t("智远电子元件外贸有限公司的产品与服务已覆盖全球多个国家和地区，包括北美、欧洲、亚洲、非洲等。我们与众多国际知名电子制造商建立了长期稳定的合作关系，赢得了客户的高度认可与信赖。")}
        </p>

        {data?.stats && data.stats.length > 0 && (
          <div className="flex justify-center gap-12 mb-12">
            {data.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-brand-red">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{t(stat.label)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row h-[400px] bg-white rounded-xl shadow-inner overflow-hidden relative">
          {/* Left Tabs */}
          <div className="flex md:flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 z-10 bg-white">
            {displayRegions.map((region) => (
              <button
                key={region}
                onClick={() => setActiveRegion(region)}
                className={`px-6 py-4 text-sm md:text-lg font-medium transition-all relative ${currentActive === region ? "text-brand-red bg-red-50" : "text-gray-400 hover:text-gray-600"}`}
              >
                {currentActive === region && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red hidden md:block"></div>
                )}
                {t(region)}
              </button>
            ))}
          </div>

          {/* Map Area */}
          <div className="flex-1 relative bg-[#F0F4F8] overflow-hidden">
            {/* CSS Grid Map Placeholder */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)",
                backgroundSize: "20px 20px",
              }}
            ></div>

            {/* Abstract Map Shapes */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <svg viewBox="0 0 1000 500" className="w-full h-full text-blue-200 fill-current">
                <path d="M200,150 Q300,100 400,150 T600,150 T800,100" stroke="none" />
                <circle cx="250" cy="200" r="60" />
                <circle cx="500" cy="180" r="50" />
                <circle cx="750" cy="220" r="70" />
                <circle cx="500" cy="300" r="50" />
              </svg>
            </div>

            {/* Pins */}
            {displayRegions.map((region, i) => {
              const position = positions[region] || "top-[50%] left-[50%]"
              return (
                <div
                  key={region}
                  className={`absolute ${position} transition-all duration-500 transform ${currentActive === region ? "scale-110 opacity-100" : "scale-90 opacity-50"}`}
                >
                  <div className="bg-blue-600 text-white px-4 py-1 rounded-full shadow-lg text-sm font-bold relative">
                    {t(region)}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600"></div>
                  </div>
                  {currentActive === region && (
                    <div className="w-3 h-3 bg-blue-600 rounded-full mx-auto mt-2 animate-ping absolute top-full left-0 right-0"></div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
