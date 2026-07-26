import { MallProductDetail } from "../../../../components/Mall/mallProductDetail"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "产品详情 - 天启芯科技商城",
  description: "产品详情页面",
}

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params
  return <MallProductDetail productId={id} />
}
