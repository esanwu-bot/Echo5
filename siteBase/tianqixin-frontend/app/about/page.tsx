"use client"

import { About } from "@/components/About"
import { useEffect, useState } from "react"
import { homeApi, type FactoryData } from "@/lib/api-client"

export default function AboutPage() {
  const [factoryData, setFactoryData] = useState<FactoryData | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await homeApi.getHomeData()
        console.log('[About Page] Full response:', response)
        console.log('[About Page] Factory data:', response.data?.factory)
        if (response.code === 200 && response.data?.factory) {
          console.log('[About Page] Factory steps:', response.data.factory.steps)
          setFactoryData(response.data.factory)
        }
      } catch (error) {
        console.error("Failed to fetch factory data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">加载中...</div>
  }

  return <About factoryData={factoryData} />
}
