import { NewsList } from "../../components/NewsList"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新闻中心 - 天启芯科技",
  description: "天启芯科技最新新闻与动态",
}

export default function NewsPage() {
  return <NewsList />
}
