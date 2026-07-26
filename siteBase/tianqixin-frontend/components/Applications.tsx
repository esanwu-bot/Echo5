import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { Application, ApplicationsSectionData } from "../lib/api-client"
import { applicationApi, getImageUrl } from "../lib/api-client"

interface ApplicationsProps {
  data?: ApplicationsSectionData
}

export const Applications: React.FC<ApplicationsProps> = ({ data }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [applications, setApplications] = useState<Application[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (data && data.applications && data.applications.length > 0) {
        setApplications(data.applications as Application[])
        return
      }

      try {
        const resp = await applicationApi.getApplications({ limit: 6 })
        let list: Application[] = []
        const payload = resp.data as any
        if (Array.isArray(payload)) list = payload
        else if (payload.list) list = payload.list
        else if (payload.applications) list = payload.applications

        if (!mounted) return
        setApplications(list.slice(0, 6))
      } catch (err) {
        console.error('Failed to load applications for Applications component', err)
      }
    }

    load()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleCardClick = (id: number) => {
    navigate(`/applications/${id}`)
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{data?.title || t('产品应用领域')}</h2>
          <p className="text-gray-500 text-sm">
            {data?.description ||
              t('天启芯采用国际领先的GPP芯片生产工艺和先进的SMD封装技术，为客户提供高性价比的全系列二极管、三极管产品。')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="relative group overflow-hidden h-48 cursor-pointer"
              onClick={() => handleCardClick(application.id)}
            >
              <img
                src={getImageUrl(application.cover_image) || "/placeholder.svg"}
                alt={application.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                <div className="flex-1">
                  <span className="text-white font-bold bg-brand-red px-2 py-1 text-xs inline-block mb-2">
                    {application.title}
                  </span>
                  <p className="text-white/90 text-sm line-clamp-2">
                    {application.description}
                  </p>
                </div>
                <div className="ml-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
