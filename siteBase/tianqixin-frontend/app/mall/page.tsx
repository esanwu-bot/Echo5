import { MallHome } from "../../components/Mall/MallHome"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "商城 - 天启芯科技",
  description: "天启芯科技在线商城",
}

export default function MallPage() {
  return <MallHome />
}
