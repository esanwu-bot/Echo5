import type React from "react"
import { useTranslation } from "react-i18next"
import { Cpu, PenTool, Wrench, MessageCircle, GraduationCap, Headphones } from "lucide-react"
import type { HomeData } from "../lib/api-client"

interface SupportProps {
  data?: HomeData["sections"]["support"]
}

const iconMap: Record<string, React.ElementType> = {
  consultation: MessageCircle,
  training: GraduationCap,
  support: Headphones,
  default: Cpu,
}

export const Support: React.FC<SupportProps> = ({ data }) => {
  const { t } = useTranslation()

  const services = data?.services?.length
    ? data.services.map((service) => ({
        title: service.title,
        description: service.description,
        icon: iconMap[service.icon] || iconMap.default,
      }))
    : [
        { title: t("电子元件选型"), icon: Cpu, description: t("专业的技术团队为您提供产品选型和应用建议") },
        { title: t("电路设计"), icon: PenTool, description: t("系统的产品使用培训和技术指导") },
        { title: t("故障排查"), icon: Wrench, description: t("7x24小时的技术支持和维护服务") },
      ]

  return (
    <section className="relative py-20 bg-slate-900 text-white">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-30">
        <img
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop"
          className="w-full h-full object-cover"
          alt="Tech background"
        />
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10 text-center">
        <h2 className="text-3xl font-bold mb-4">{data?.title || t("技术支持")}</h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-12 text-sm">
          {data?.description || t("我们拥有一支专业的技术团队，为客户提供电子元件选型、电路设计、故障排查等技术支持，帮助客户解决技术难题。")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service, i) => {
            const IconComponent = service.icon
            return (
              <div
                key={i}
                className="group relative overflow-hidden h-48 bg-slate-800 border border-slate-700 hover:border-brand-red transition-colors cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-slate-900/50 group-hover:opacity-70 transition-opacity" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">
                  <IconComponent className="w-12 h-12 mb-4 text-brand-red" />
                  <span className="text-sm font-semibold">{t(service.title)}</span>
                  <p className="text-xs text-gray-400 mt-2 text-center">{t(service.description)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
