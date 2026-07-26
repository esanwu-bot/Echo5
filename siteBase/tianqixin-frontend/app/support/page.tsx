import { TechnicalSupport } from "@/components/TechnicalSupport"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "技术支持 - 天启芯科技",
  description: "天启芯科技技术支持服务",
}

export default function SupportPage() {
  return <TechnicalSupport />
}
