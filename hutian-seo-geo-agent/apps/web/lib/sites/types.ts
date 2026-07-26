/**
 * γ 渲染器类型定义
 * 与 siteBase backend /api/v1/* 返回结构对齐（参考 route/api.php + api/ArticleController.php + api/ProductController.php）
 */

export interface Article {
  id: number;
  title: string;
  summary: string;
  content: string;
  category_id: number;
  category?: { id: number; name: string } | null;
  publish_time: string;
  views: number;
  image?: string;
  cover?: string;
}

export interface Product {
  id: number;
  name: string;
  product_code: string;
  description: string;
  price: number;
  stock: number;
  images: string | string[];
  category_id: number;
  brand_id?: number;
  brand_name?: string;
  category_name?: string;
  is_on_sale: number;
  rohs_compliant?: number;
  features?: string;
}

export interface SiteSettings {
  site_name: string;
  site_description: string;
  site_keywords: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string;
  domain: string;
}

export interface ReaderResult<T> {
  data: T | null;
  source: "live" | "mock" | "error";
  error?: string;
}
