import { Payment } from "@/components/Mall/Payment"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "支付 - 天启芯科技商城",
  description: "订单支付",
}

export default function PaymentPage() {
  return <Payment />
}
