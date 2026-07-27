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
  /** 壶天侧品牌名（PRD §4.1 现行品牌），优先用于 γ 建站产物 */
  brand_name: string;
  site_description: string;
  site_keywords: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string;
  domain: string;
}

/**
 * FAQ 条目（对齐 siteBase /api/v1/faqs 返回结构）
 * 字段：question / answer / category / product_id / is_hot / sort / status
 */
export interface Faq {
  id: number;
  question: string;
  answer: string;
  category?: string;
  product_id?: number;
  is_hot?: number;
  sort?: number;
  status?: number;
}

/**
 * News 条目（对齐 siteBase /api/v1/news 返回结构）
 * 字段：title / summary / content / image / cover / views / status / create_time
 */
export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content?: string;
  image?: string;
  cover?: string;
  views?: number;
  category?: string;
  publish_time?: string;
  create_time?: string;
}

/**
 * About 内容（对齐 siteBase /api/v1/about/company 返回结构）
 * siteBase 按 type=about|vision|history 分组返回，reader 聚合成单对象
 */
export interface AboutContent {
  about_title: string;
  about: string;
  vision_title: string;
  vision: string;
  history_title: string;
  history: string;
  images?: string[];
}

/**
 * Contact 设置（对齐 siteBase /api/v1/settings/group/contact 返回结构）
 * 字段：contact_phone / contact_email / contact_address / contact_qq / contact_wechat / service_time
 * 补充 company 设置组的 company_name / company_address / company_phone / company_email
 */
export interface ContactSettings {
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  contact_qq?: string;
  contact_wechat?: string;
  service_time: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
}

export interface ReaderResult<T> {
  data: T | null;
  /**
   * live      = siteBase v1 真实数据
   * mock      = 基础设施失联（连接拒/超时/HTTP 5xx）的兜底假数据 → 必须带水印 + noindex
   * mock-demo = 应用层 bug（HTTP 200 + body code:500，siteBase 既有 bug）的兜底假数据 → 必须带水印 + noindex
   * error     = 业务错（404/400）或 production 期禁止 mock → 走 notFound() / 错误态，绝不渲染假页
   * stale     = 仅 settings 用：production 期 siteBase 抖动 → 降级到内置兜底 settings 继续渲染真内容页
   *             （单页数据 article/product 仍按 error 处理；settings 是全局依赖，不能整页死）
   *             stale 不触发 noindex（内容仍可能是 live），不触发 DemoBanner（不是假内容）
   */
  source: "live" | "mock" | "mock-demo" | "error" | "stale";
  error?: string;
}
