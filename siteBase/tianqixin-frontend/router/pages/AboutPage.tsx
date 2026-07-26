import { About } from "../../components/About"
import { Seo } from "../../components/Seo"

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      <Seo
        title="关于我们"
        description="了解天启芯科技公司简介、发展历程、核心价值观、生产基地与资质认证，致力于为全球客户提供高品质电子元器件。"
        url="/about"
        type="website"
      />
      <div className="container mx-auto px-4 py-8">
        <About />
      </div>
    </div>
  )
}