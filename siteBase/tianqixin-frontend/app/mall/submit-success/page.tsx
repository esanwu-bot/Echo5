import { SuccessState } from "@/components/Mall/SuccessState"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "订单提交成功 - 天启芯科技商城",
  description: "订单提交成功",
}

export default function SubmitSuccessPage() {
  return <SuccessState type="submitted" />
}
