"use client"

import React from "react"

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[]
}

/**
 * JSON-LD 结构化数据组件
 * 用于在页面 head 中注入 schema.org 结构化数据，提升搜索引擎 Rich Results 识别能力
 */
export const JsonLd: React.FC<JsonLdProps> = ({ data }) => {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  )
}

/**
 * 构建 Organization 结构化数据
 */
export const buildOrganizationSchema = (domain: string = "https://tikchip.cn") => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "天启芯科技",
  alternateName: ["Tianqixin", "Tikchip"],
  url: domain,
  logo: `${domain}/logo.png`,
  description:
    "天启芯科技（Tianqixin / Tikchip）是专业的电子元器件采购平台，提供半导体、被动元件、连接器、电阻电容等产品搜索、库存查询、BOM配单与样品申请服务。",
  sameAs: [
    // TODO: 企业官方社交账号确认后补充
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    availableLanguage: ["Chinese", "English"],
  },
})

/**
 * 构建 Product 结构化数据
 */
export const buildProductSchema = (
  product: {
    id: number
    name: string
    alias?: string
    image?: string
    brandName?: string
    stock?: number
    price?: number
    currency?: string
    url: string
  },
  domain: string = "https://tikchip.cn"
) => {
  const inStock = typeof product.stock === "number" && product.stock > 0
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.alias || `天启芯科技提供 ${product.name} 的详细参数、技术文档、库存与价格信息。`,
    image: product.image || `${domain}/logo.png`,
    url: `${domain}${product.url}`,
    sku: String(product.id),
    brand: {
      "@type": "Brand",
      name: product.brandName || "天启芯科技",
    },
    offers: {
      "@type": "Offer",
      url: `${domain}${product.url}`,
      priceCurrency: product.currency || "USD",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "天启芯科技",
      },
    },
  }

  if (typeof product.price === "number" && product.price > 0) {
    schema.offers.price = product.price
  }

  return schema
}

/**
 * 构建 BreadcrumbList 结构化数据
 */
export const buildBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>,
  domain: string = "https://tikchip.cn"
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url.startsWith("http") ? item.url : `${domain}${item.url}`,
  })),
})

/**
 * 构建 Article 结构化数据（新闻/文章详情）
 */
export const buildArticleSchema = (
  article: {
    id: number
    title: string
    summary?: string
    image?: string
    publishTime?: string
    updateTime?: string
    url: string
  },
  domain: string = "https://tikchip.cn"
) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.summary || article.title,
  image: article.image || `${domain}/logo.png`,
  url: `${domain}${article.url}`,
  datePublished: article.publishTime,
  dateModified: article.updateTime || article.publishTime,
  author: {
    "@type": "Organization",
    name: "天启芯科技",
  },
  publisher: {
    "@type": "Organization",
    name: "天启芯科技",
    logo: {
      "@type": "ImageObject",
      url: `${domain}/logo.png`,
    },
  },
})

export default JsonLd
