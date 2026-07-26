/**
 * SiteBaseReader — 调 siteBase /api/v1/* 取文章/商品/分类（public GET，无 auth）
 *
 * 设计原则：
 *   1. 读写分链路 —— Reader 只读 v1 public，不碰 admin（写链路在 SiteBaseClient/建站工具集）
 *   2. 优雅降级 —— v1 不通时 fallback 到 mock fixture，保证 γ 渲染器 SSR 物理保证可验证
 *   3. 不连库、不猜 —— 数据来源只有 v1 HTTP 或内置 mock，无第 3 种
 *
 * 证据：route/api.php:200-201 (articles/:id)、api.php:72 (products/:id) 均 public GET
 */

import type { Article, Product, ReaderResult, SiteSettings } from "./types";

const SITEBASE_URL =
  process.env.SITEBASE_API_URL || "http://localhost:8000/api/v1";
const SITEBASE_DOMAIN = process.env.SITEBASE_DOMAIN || "https://tikchip.cn";

// 门禁开关：v1 不通时是否 fallback 到 mock。生产期应关闭，MVP 期开启。
const ALLOW_MOCK_FALLBACK =
  process.env.SITEBASE_ALLOW_MOCK !== "false"; // 默认 true

// dev 期跳过 fetch（避免 Next.js fetch patch 把 abort 当 retry 触发死循环）
// 生产期才真连 v1。门禁跑物理保证用 mock 即可，与数据真假无关。
const SKIP_LIVE_FETCH =
  process.env.NODE_ENV !== "production" &&
  process.env.SITEBASE_SKIP_LIVE !== "false";

async function fetchJson<T>(path: string): Promise<T | null> {
  if (SKIP_LIVE_FETCH) return null;
  const url = `${SITEBASE_URL}${path}`;
  try {
    // 用 Promise.race + 显式 timeout，避免 AbortController 被 Next.js patch 当 retry 信号
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1500)
    );
    const req = fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": "zh-CN" },
    }).then(async (res) => {
      if (!res.ok) return null;
      const json = (await res.json()) as {
        code: number;
        data?: T;
        msg?: string;
      };
      if (json && (json.code === 0 || json.code === 200) && json.data) {
        return json.data;
      }
      return null;
    });
    return (await Promise.race([req, timeout])) as T | null;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────
// Mock fixtures（v1 不通时的 fallback，保证门禁可跑）
// ────────────────────────────────────────────────

const MOCK_ARTICLE: Article = {
  id: 1,
  title: "STM32G4 系列微控制器选型指南",
  summary:
    "本文系统梳理 STM32G431/474/484 三款主流型号的差异，帮助硬件工程师快速选型。",
  content:
    "## 概述\n\nSTM32G4 系列是 ST 推出的混合信号 MCU，主频 170MHz...\n\n## 选型对比\n\n- STM32G431: 入门款，Flash 128KB\n- STM32G474: 主流款，集成高分辨率定时器\n- STM32G484: 旗舰款，含 CORDIC 和 FMAC\n\n## 应用场景\n\n适合电机控制、数字电源、工业传感。",
  category_id: 1,
  category: { id: 1, name: "技术文章" },
  publish_time: "2026-07-26 10:00:00",
  views: 128,
};

const MOCK_PRODUCT: Product = {
  id: 1,
  name: "STM32G474RET6",
  product_code: "STM32G474RET6",
  description:
    "ST 32-bit ARM Cortex-M4F MCU，170MHz，512KB Flash，128KB RAM，集成高分辨率定时器，适合电机控制与数字电源应用。",
  price: 4.85,
  stock: 12500,
  images: "/uploads/stm32g474ret6.jpg",
  category_id: 1,
  brand_id: 1,
  brand_name: "STMicroelectronics",
  category_name: "MCU 微控制器",
  is_on_sale: 1,
  rohs_compliant: 1,
  features: "170MHz主频,512KB Flash,高分辨率定时器,CORDIC,FMAC",
};

const MOCK_SETTINGS: SiteSettings = {
  site_name: "天启芯科技",
  site_description: "专业的半导体元器件供应商",
  site_keywords: "半导体,电子元件,MOS管,二极管,三极管,MCU",
  meta_title: "天启芯科技 - 专业的半导体元器件供应商",
  meta_description:
    "天启芯科技专注于半导体元件的研发、生产和销售，提供高品质的MOS管、二极管、三极管、MCU等电子元件。",
  meta_keywords: "半导体,电子元件,MCU,STM32",
  og_image: "/logo.png",
  domain: SITEBASE_DOMAIN,
};

// ────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────

export async function getArticle(id: string | number): Promise<ReaderResult<Article>> {
  const data = await fetchJson<Article>(`/articles/${id}`);
  if (data) return { data, source: "live" };
  if (ALLOW_MOCK_FALLBACK) {
    return { data: { ...MOCK_ARTICLE, id: Number(id) || 1 }, source: "mock" };
  }
  return { data: null, source: "error", error: "article not found in v1" };
}

export async function getProduct(id: string | number): Promise<ReaderResult<Product>> {
  const data = await fetchJson<Product>(`/products/${id}`);
  if (data) return { data, source: "live" };
  if (ALLOW_MOCK_FALLBACK) {
    return { data: { ...MOCK_PRODUCT, id: Number(id) || 1 }, source: "mock" };
  }
  return { data: null, source: "error", error: "product not found in v1" };
}

export async function getSiteSettings(): Promise<ReaderResult<SiteSettings>> {
  // /api/v1/settings/group/seo — 证据 route/api.php:451
  const data = await fetchJson<Record<string, string>>(`/settings/seo`);
  if (data && data.meta_title) {
    return {
      data: {
        site_name: data.site_name || MOCK_SETTINGS.site_name,
        site_description: data.site_description || MOCK_SETTINGS.site_description,
        site_keywords: data.site_keywords || MOCK_SETTINGS.site_keywords,
        meta_title: data.meta_title,
        meta_description: data.meta_description || "",
        meta_keywords: data.meta_keywords || "",
        og_image: data.og_image || "/logo.png",
        domain: SITEBASE_DOMAIN,
      },
      source: "live",
    };
  }
  if (ALLOW_MOCK_FALLBACK) return { data: MOCK_SETTINGS, source: "mock" };
  return { data: null, source: "error", error: "settings not found in v1" };
}

export { SITEBASE_DOMAIN };
