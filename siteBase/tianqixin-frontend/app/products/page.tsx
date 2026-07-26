import ParametricSearch from "../../components/parametric-search/ParametricSearch"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "产品中心 - 天启芯科技",
  description: "天启芯科技产品中心，提供电阻、电感、电容、集成电路等电子元件",
}

export default function ProductsPage() {
  return <ParametricSearch />
}
