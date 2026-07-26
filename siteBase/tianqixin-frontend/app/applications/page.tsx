import { ApplicationList } from "@/components/ApplicationList"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "应用领域 - 天启芯科技",
  description: "天启芯科技应用领域，涵盖电源管理、电机驱动等多个领域",
}

export default function ApplicationsPage() {
  return <ApplicationList />
}
