import { Register } from "@/components/Register"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "注册 - 天启芯科技",
  description: "注册天启芯科技账户",
}

export default function RegisterPage() {
  return <Register />
}
