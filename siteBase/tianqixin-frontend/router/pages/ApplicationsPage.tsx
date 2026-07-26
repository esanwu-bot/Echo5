import { ApplicationList } from "../../components/ApplicationList"
import { Seo } from "../../components/Seo"

export function ApplicationsPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo
        title="应用领域"
        description="探索天启芯科技电子元器件在工业控制、汽车电子、消费电子、通信设备、新能源等领域的典型应用方案。"
        url="/applications"
        type="website"
      />
      <div className="container mx-auto px-4 py-8">
        <ApplicationList />
      </div>
    </div>
  )
}