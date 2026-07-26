import { RegisterSuccess } from "@/components/RegisterSuccess"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "注册成功 - 天启芯科技",
  description: "注册成功",
}

export default function RegisterSuccessPage() {
  return <RegisterSuccess />
}
