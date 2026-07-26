import { Cart } from "@/components/Mall/Cart"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "购物车 - 天启芯科技商城",
  description: "我的购物车",
}

export default function CartPage() {
  return <Cart />
}
