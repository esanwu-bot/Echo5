"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Shield, Zap, Thermometer, Activity, Cpu, ChevronLeft, ChevronRight } from "lucide-react"
import type { HomeData } from "../lib/api-client"

interface HeroProps {
  data?: HomeData["heroBanner"]
}

export const Hero: React.FC<HeroProps> = ({ data }) => {
  const { t } = useTranslation()
  const [currentSlide, setCurrentSlide] = useState(0)

  const banners = data?.banners?.length
    ? data.banners
    : [
      { id: 1, title: t("引领芯片创新"), image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop", link: "/series", sort: 1 },
      { id: 2, title: t("面向工业与消费领域"), image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop", link: "/applications", sort: 2 },
      { id: 3, title: t("专业技术支持"), image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop", link: "/support", sort: 3 },
    ]

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length)

  return (
    <section className="relative w-full h-[500px] md:h-[600px] bg-slate-900 overflow-hidden text-white">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
        >
          <img src={banner.image || "/placeholder.svg"} alt={banner.title ? t(banner.title) : ''} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-900/90"></div>
        </div>
      ))}

      <div className="container mx-auto px-4 md:px-8 h-full flex flex-col md:flex-row items-center justify-center relative z-10">
        <div className="w-full md:w-1/2 space-y-8 text-center md:text-left pt-10 md:pt-0">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter">
            {banners[currentSlide]?.title ? t(banners[currentSlide].title) : "MultiProtect"}
          </h2>
          {data?.subtitle && <p className="text-lg text-gray-300">{t(data.subtitle)}</p>}
          <div className="grid grid-cols-2 gap-6 max-w-md mx-auto md:mx-0">
            <div className="flex items-center space-x-3">
              <Zap className="text-green-400 w-8 h-8" />
              <div className="text-left">
                <div className="text-sm text-gray-300">Over-voltage</div>
                <div className="font-semibold">Protection</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Thermometer className="text-green-400 w-8 h-8" />
              <div className="text-left">
                <div className="text-sm text-gray-300">Over-Temperature</div>
                <div className="font-semibold">Control</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Activity className="text-green-400 w-8 h-8" />
              <div className="text-left">
                <div className="text-sm text-gray-300">Short-Circuit</div>
                <div className="font-semibold">Protection</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="text-green-400 w-8 h-8" />
              <div className="text-left">
                <div className="text-sm text-gray-300">Overload</div>
                <div className="font-semibold">Protection</div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 justify-center md:justify-start mt-8">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1 w-8 transition-colors ${index === currentSlide ? "bg-brand-red" : "bg-gray-600"}`}
              />
            ))}
          </div>
        </div>

        <div className="w-full md:w-1/2 flex justify-center items-center mt-10 md:mt-0">
          <div className="relative w-64 h-80 md:w-80 md:h-96 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-cyan-400/50 rounded-[40px] flex flex-col items-center justify-center backdrop-blur-sm shadow-[0_0_50px_rgba(0,255,255,0.3)]">
            <div className="w-40 h-40 bg-slate-800 border border-gray-600 rounded flex items-center justify-center relative">
              <div className="absolute inset-0 grid grid-cols-4 gap-1 opacity-30">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="bg-gray-500 rounded-full m-1"></div>
                ))}
              </div>
              <Cpu className="w-20 h-20 text-gray-300" />
              <span className="absolute bottom-2 text-xs text-cyan-400 font-mono">ASM235CM</span>
            </div>
            <div className="absolute -top-4 -right-4 text-cyan-400 animate-pulse">
              <Shield className="w-12 h-12 fill-current opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </section>
  )
}
