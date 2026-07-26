"use client"

import React from "react"
import { Helmet } from "react-helmet-async"

interface SeoProps {
  title: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  canonical?: string
  type?: "website" | "article" | "product"
  locale?: string
  siteName?: string
  noindex?: boolean
  children?: React.ReactNode
}

const DEFAULT_DOMAIN = "https://tikchip.cn"
const DEFAULT_IMAGE = `${DEFAULT_DOMAIN}/logo.png`
const DEFAULT_SITE_NAME = "天启芯科技"
const DEFAULT_LOCALE = "zh_CN"

/**
 * SEO 元数据组件
 * 统一注入 title、description、canonical、Open Graph 与 Twitter Card 标签
 */
export const Seo: React.FC<SeoProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  canonical,
  type = "website",
  locale = DEFAULT_LOCALE,
  siteName = DEFAULT_SITE_NAME,
  noindex = false,
  children,
}) => {
  const fullTitle = title.includes(siteName) ? title : `${title} - ${siteName}`
  const fullUrl = url ? (url.startsWith("http") ? url : `${DEFAULT_DOMAIN}${url}`) : DEFAULT_DOMAIN
  const fullImage = image ? (image.startsWith("http") ? image : `${DEFAULT_DOMAIN}${image}`) : DEFAULT_IMAGE
  const canonicalUrl = canonical ? (canonical.startsWith("http") ? canonical : `${DEFAULT_DOMAIN}${canonical}`) : fullUrl

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={fullImage} />

      {/* Canonical */}
      <link rel="canonical" href={canonicalUrl} />

      {children}
    </Helmet>
  )
}

export default Seo
