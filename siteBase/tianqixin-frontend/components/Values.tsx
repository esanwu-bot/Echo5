import type React from "react"
import { useTranslation } from "react-i18next"
import type { HomeData } from "../lib/api-client"

interface ValuesProps {
  data?: HomeData["sections"]["values"]
}

export const Values: React.FC<ValuesProps> = ({ data }) => {
  const { t } = useTranslation()

  const mainValue = data?.values?.[0] || {
    title: t("诚信经营"),
    description: t("我们秉持诚信原则，与合作伙伴建立互信、互利、共赢的合作关系。"),
  }

  return (
    <section className="relative h-[300px] w-full overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop"
        alt="Teamwork"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-brand-red/90 mix-blend-multiply"></div>

      <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-start md:pl-20 text-white">
        <h2 className="text-4xl font-bold mb-4">{t(mainValue.title)}</h2>
        <p className="text-lg max-w-xl opacity-90">{t(mainValue.description)}</p>

        {data?.values && data.values.length > 1 && (
          <div className="flex gap-6 mt-6">
            {data.values.slice(1).map((value, i) => (
              <div key={i} className="text-sm opacity-80">
                <span className="font-semibold">{t(value.title)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
