import { PaymentSuccess } from "@/components/Mall/PaymentSuccess"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "支付成功 - 天启芯科技商城",
  description: "支付成功",
}

export default function PaymentSuccessPage() {
  return <PaymentSuccess />
}
