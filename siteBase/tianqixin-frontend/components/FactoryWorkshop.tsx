import type React from "react"
import type { FactoryData } from "../lib/api-client"
import { useTranslation } from 'react-i18next'
import { getImageUrl } from "../lib/api-client"

interface FactoryWorkshopProps {
  data?: FactoryData
}

export const FactoryWorkshop: React.FC<FactoryWorkshopProps> = ({ data }) => {
  const { t } = useTranslation()
  if (!data) return null

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-12 border-l-4 border-brand-red pl-4">
          {data.title || t('厂区车间')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.steps?.map((step, index) => {
            const imageUrl = getImageUrl(step.image) || `https://placehold.co/200x150/e5e7eb/9ca3af?text=${encodeURIComponent(step.title)}`
            return (
              <div key={step.id || index} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={t(step.title)}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                  />
                </div>
                  <div className="bg-brand-red text-white p-2 text-center">
                  <div className="font-bold text-xs">{step.title_en || t(step.title)}</div>
                  <div className="text-xs opacity-90">{step.title_en || t(step.title)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
