import { useEffect, useState } from "react"
import { Hero } from "../../components/Hero"
import { Products } from "../../components/Products"
import { FactoryWorkshop } from "../../components/FactoryWorkshop"
import { Applications } from "../../components/Applications"
import { About } from "../../components/About"
import { Support } from "../../components/Support"
import { Market } from "../../components/Market"
import { Values } from "../../components/Values"
import { Vision } from "../../components/Vision"
import { Careers } from "../../components/Careers"
import { Seo } from "../../components/Seo"
import { JsonLd, buildOrganizationSchema } from "../../components/JsonLd"
import { homeApi } from "../../lib/api-client"
import { HomeData } from "../../lib/api-client"

export function HomePage() {
  const [homeData, setHomeData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const loadData = async () => {
      console.log('HomePage: Starting to load data...');
      try {
        const homeResponse = await homeApi.getHomeData()

        if (homeResponse.code === 200) {
          console.log('HomePage: Successfully loaded API data:', homeResponse.data);
          setHomeData(homeResponse.data)
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  console.log('HomePage: Rendering with homeData:', homeData);
  console.log('HomePage: Hero banner data:', homeData?.heroBanner);
  console.log('HomePage: Factory data:', homeData?.factory);
  
  return (
    <>
      <Seo
        title="天启芯科技 - 专业电子元器件采购平台"
        description="天启芯科技（Tianqixin / Tikchip）是专业的电子元器件采购平台，提供半导体、被动元件、连接器、电阻电容等产品搜索、库存查询、BOM配单与样品申请服务。"
        url="/"
        type="website"
      />
      <JsonLd data={buildOrganizationSchema()} />
      {homeData && (
        <>
          <Hero data={homeData.heroBanner} />
          <Products data={homeData.sections?.products} />
          <Applications data={homeData.applications} />
          <About />
          <FactoryWorkshop data={homeData.factory} />
          <Support data={homeData.sections?.support} />
          <Market data={homeData.sections?.coverage} />
          <Values data={homeData.sections?.values} />
          <Vision data={homeData.sections?.vision} />
          <Careers data={homeData.sections?.careers} />
        </>
      )}
    </>
  )
}