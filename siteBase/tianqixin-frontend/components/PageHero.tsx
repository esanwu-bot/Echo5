import type React from "react"

interface PageHeroProps {
  title: string
  subtitle?: string
  bgImage?: string
}

export const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  bgImage = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop", // Fallback newspaper/office image
}) => {
  return (
    <div className="relative w-full h-[300px] md:h-[400px] overflow-hidden text-white flex items-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transform scale-105"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">{title}</h1>
        {subtitle && <p className="text-lg md:text-xl text-gray-200 max-w-2xl font-light">{subtitle}</p>}
      </div>
    </div>
  )
}
