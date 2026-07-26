import { Checkout } from "@/components/Mall/Checkout"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "确认订单 - 天启芯科技商城",
  description: "确认订单信息",
}

export default function CheckoutPage() {
  return <Checkout />
}
