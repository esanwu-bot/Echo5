import { SuccessState } from "@/components/Mall/SuccessState"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "加入购物车成功 - 天启芯科技商城",
  description: "已成功加入购物车",
}

export default function AddedSuccessPage() {
  return <SuccessState type="added" />
}
