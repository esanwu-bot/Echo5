import type React from "react"
import { useTranslation } from "react-i18next"
import type { HomeData } from "../lib/api-client"

interface CareersProps {
  data?: HomeData["sections"]["careers"]
}

export const Careers: React.FC<CareersProps> = ({ data }) => {
  const { t } = useTranslation()

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center gap-12">
        <div className="w-full md:w-1/3 text-center md:text-left">
          <h2 className="text-3xl font-bold mb-6 text-gray-900">{data?.title || t("加入我们的团队")}</h2>
          <p className="text-gray-600 mb-8 text-sm leading-relaxed">
            {data?.description ||
              t("我们的节奏快且富挑战性，而且我们的员工成就了我们的卓越。想要改变世界并爱上您的工作，欢迎加入我们。")}
          </p>
          <button className="bg-brand-red text-white px-8 py-3 text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
            {t("搜索空缺职位")}
          </button>

          {data?.positions && data.positions.length > 0 && (
            <div className="mt-8 text-left">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">{t("热门职位:")}</h4>
              <ul className="space-y-2">
                {data.positions.slice(0, 3).map((pos, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    • {t(pos.title)} - {t(pos.location)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="w-full md:w-2/3 h-96 relative overflow-hidden rounded-lg shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?q=80&w=2070&auto=format&fit=crop"
            alt="City Skyline"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-900/20"></div>
        </div>
      </div>
    </section>
  )
}
