import { Login } from "@/components/Login"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登录 - 天启芯科技",
  description: "登录天启芯科技账户",
}

export default function LoginPage() {
  return <Login />
}
