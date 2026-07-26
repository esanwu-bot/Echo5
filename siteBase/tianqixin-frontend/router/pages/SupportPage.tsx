import { TechnicalSupport } from "../../components/TechnicalSupport"
import { Seo } from "../../components/Seo"

export function SupportPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo
        title="技术支持"
        description="天启芯科技技术支持中心，提供产品选型、技术文档下载、样片申请、BOM配单、FAQ与在线咨询服务。"
        url="/support"
        type="website"
      />
      <div className="container mx-auto px-4 py-8">
        <TechnicalSupport />
      </div>
    </div>
  )
}