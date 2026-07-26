"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Package } from "lucide-react"
import { apiClient } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/api/config"

interface StatsData {
  quotes: number
  samples: number
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData>({ quotes: 0, samples: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.BUSINESS_APPLICATIONS.STATISTICS)
        const data = res.data?.data
        if (data) {
          setStats({
            quotes: data.quotes?.total ?? 0,
            samples: data.samples?.total ?? 0,
          })
        }
      } catch (error) {
        console.error("获取统计数据失败:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    {
      title: "报价申请",
      value: stats.quotes,
      icon: FileText,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "样品申请",
      value: stats.samples,
      icon: Package,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {cards.map((card, index) => (
        <Card key={index} className="border border-[#e5e9f0] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`${card.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#9aa3be] uppercase tracking-wide">{card.title}</div>
                <div className="text-[26px] font-bold text-[#1a1d2e] leading-tight">
                  {loading ? "-" : card.value.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
