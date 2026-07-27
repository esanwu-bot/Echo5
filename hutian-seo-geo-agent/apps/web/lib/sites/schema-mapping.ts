/**
 * schema-mapping — JSON-LD 生成器（schema-mapping 技能落地）
 *
 * 设计原则：
 *   1. 产物喂渲染器 SSR 注入，不写 seo_pages 表（红线 11：MVP 延后）
 *   2. 通用 schema 优先，电子零件专用字段（mpn_prefix/spec_summary/rohs_compliant）暂不展开（红线 11）
 *   3. 输出符合 schema.org 规范，便于 Google Rich Results 测试
 *
 * 参考实现：siteBase tianqixin-frontend/components/JsonLd.tsx 的 buildProductSchema
 *   （差别：那个在客户端构建，本模块在服务端 SSR 注入）
 */

import type { Article, Product, SiteSettings } from "./types";

interface SchemaBase {
  "@context": "https://schema.org";
  "@type": string;
}

export interface ArticleSchema extends SchemaBase {
  "@type": "Article";
  name: string;
  headline: string;
  description: string;
  datePublished: string;
  author: { "@type": "Organization"; name: string };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: { "@type": "ImageObject"; url: string };
  };
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  image?: string;
}

export interface ProductSchema extends SchemaBase {
  "@type": "Product";
  "@id"?: string;
  name: string;
  description: string;
  sku: string;
  brand: { "@type": "Brand"; name: string };
  category?: string;
  image?: string;
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
    availability: string;
    url: string;
    seller: { "@type": "Organization"; name: string };
  };
}

export interface WebPageSchema extends SchemaBase {
  "@type": "WebPage";
  name: string;
  description: string;
  url: string;
}

export interface BreadcrumbSchema extends SchemaBase {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }>;
}

function absUrl(path: string, domain: string): string {
  if (path.startsWith("http")) return path;
  return `${domain}${path.startsWith("/") ? "" : "/"}${path}`;
}

function firstImage(images: string | string[] | undefined, domain: string): string | undefined {
  if (!images) return undefined;
  if (Array.isArray(images)) {
    return images.length > 0 ? absUrl(images[0], domain) : undefined;
  }
  // siteBase images 字段可能是 JSON 字符串或单 URL
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return absUrl(parsed[0], domain);
    }
  } catch {
    // 不是 JSON，当作单 URL
  }
  return absUrl(images, domain);
}

export function buildArticleSchema(
  article: Article,
  settings: SiteSettings,
  pageUrl: string
): ArticleSchema {
  const schema: ArticleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    name: article.title,
    headline: article.title,
    description: article.summary || article.title,
    datePublished: article.publish_time,
    author: { "@type": "Organization", name: settings.brand_name },
    publisher: {
      "@type": "Organization",
      name: settings.brand_name,
      logo: { "@type": "ImageObject", url: absUrl(settings.og_image, settings.domain) },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };
  const img = firstImage(article.image || article.cover, settings.domain);
  if (img) schema.image = img;
  return schema;
}

export function buildProductSchema(
  product: Product,
  settings: SiteSettings,
  pageUrl: string
): ProductSchema {
  const inStock = product.stock > 0;
  const schema: ProductSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": pageUrl,
    name: product.name,
    description: product.description || product.name,
    sku: String(product.id),
    brand: {
      "@type": "Brand",
      name: product.brand_name || settings.brand_name,
    },
    offers: {
      "@type": "Offer",
      price: String(product.price ?? "0"),
      priceCurrency: "USD",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: pageUrl,
      seller: { "@type": "Organization", name: settings.brand_name },
    },
  };
  if (product.category_name) schema.category = product.category_name;
  const img = firstImage(product.images, settings.domain);
  if (img) schema.image = img;
  return schema;
}

export function buildWebPageSchema(
  name: string,
  description: string,
  url: string
): WebPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
): BreadcrumbSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

/**
 * 验证 schema 合法性（门禁用）
 * 返回 { valid, errors[] }
 */
export function validateSchema(schema: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!schema || typeof schema !== "object") {
    return { valid: false, errors: ["schema is not an object"] };
  }
  const s = schema as Record<string, unknown>;
  if (s["@context"] !== "https://schema.org") {
    errors.push('@context must be "https://schema.org"');
  }
  if (typeof s["@type"] !== "string" || !s["@type"]) {
    errors.push('@type must be a non-empty string');
  }
  return { valid: errors.length === 0, errors };
}
