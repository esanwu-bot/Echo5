import { NewsDetail } from "../../../components/NewsDetail"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新闻详情 - 天启芯科技",
  description: "天启芯科技新闻详情",
}

interface NewsDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params
  return <NewsDetail newsId={id} />
}
