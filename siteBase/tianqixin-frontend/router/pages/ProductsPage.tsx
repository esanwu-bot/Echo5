import { ProductList } from "../../components/ProductList"
import { Seo } from "../../components/Seo"
import { useNavigate } from "react-router-dom"

export function ProductsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo
        title="产品中心"
        description="浏览天启芯科技全系列电子元器件产品，包括半导体、被动元件、连接器、电阻电容等，支持型号搜索、参数筛选与在线采购。"
        url="/products"
        type="website"
      />
      <div className="container mx-auto px-4 py-8">
        <ProductList onNavigate={navigate} />
      </div>
    </div>
  )
}