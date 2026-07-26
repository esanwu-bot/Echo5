"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Hero } from "../components/Hero"
import { Products } from "../components/Products"
import { Applications } from "../components/Applications"
import { About } from "../components/About"
import { Support } from "../components/Support"
import { Market } from "../components/Market"
import { Values } from "../components/Values"
import { Vision } from "../components/Vision"
import { Careers } from "../components/Careers"
import { homeApi, HomeData } from "../lib/api-client"

export default function HomePage() {
  const { i18n } = useTranslation()
  const [homeData, setHomeData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true)
        const response = await homeApi.getHomeData()
        console.log('[HomePage] ===== API Response Debug =====')
        console.log('[HomePage] response:', response)
        console.log('[HomePage] response.code:', response.code)
        console.log('[HomePage] response.data:', response.data)
        console.log('[HomePage] response.data type:', typeof response.data)
        console.log('[HomePage] response.data keys:', response.data ? Object.keys(response.data) : 'no data')
        console.log('[HomePage] response.data.factory:', response.data?.factory)
        console.log('[HomePage] ===== End Debug =====')
        
        if (response.code === 200) {
          setHomeData(response.data)
        }
      } catch (error) {
        console.error("Failed to fetch home data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [i18n.language]) // Re-fetch when language changes

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  console.log('[HomePage] Rendering with homeData:', homeData)
  console.log('[HomePage] homeData?.factory:', homeData?.factory)

  return (
    <>
      <Hero data={homeData?.heroBanner} />
      <Products data={homeData?.sections?.products} newProducts={homeData?.newProducts} factoryData={homeData?.factory} />
      <Applications data={homeData?.sections?.applications} />
      <About />
      <Support data={homeData?.sections?.support} />
      <Market data={homeData?.sections?.coverage} />
      <Values data={homeData?.sections?.values} />
      <Vision />
      <Careers data={homeData?.sections?.careers} />
    </>
  )
}
