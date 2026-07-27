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
const HUTIAN_BRAND_NAME = process.env.HUTIAN_BRAND_NAME || "壶天";

// 门禁开关：v1 不通时是否 fallback 到 mock。生产期应关闭，MVP 期开启。
const ALLOW_MOCK_FALLBACK =
  process.env.SITEBASE_ALLOW_MOCK !== "false"; // 默认 true

// 发布态开关（这一轮校准的关键判据）：
//   dev        = 未发布 / 纯演示 / 门禁跑 —— server_error 允许 mock-demo fallback（带水印）
//   production = 已发布 / 会被 submit_sitemap 推 —— server_error 走错误态，绝不渲染假页给爬虫
// 球门：body code:500 是 siteBase 应用层 bug，连接通、服务活、admin 写链路可用，
//       坏的只是单个 endpoint 的渲染逻辑——这不是"基础设施失联"，是"明确错误响应"。
//       dev 期渲染假页方便看页面，但必须自报家门（水印 + noindex）；production 期绝不渲染假页。
const PUBLISH_MODE =
  process.env.SITEBASE_PUBLISH_MODE === "production" ? "production" : "dev";

// dev 期跳过 fetch（避免 Next.js fetch patch 把 abort 当 retry 触发死循环）
// 生产期才真连 v1。门禁跑物理保证用 mock 即可，与数据真假无关。
const SKIP_LIVE_FETCH =
  process.env.NODE_ENV !== "production" &&
  process.env.SITEBASE_SKIP_LIVE !== "false";

/**
 * fetchJson — 调 siteBase v1 public GET
 *
 * 返回四态（这一轮校准：把 body code:500 从 network 拆出成 server_error）：
 *   - { ok: true,  data }                  类0：live 成功
 *   - { ok: false, kind: "network" }       类1：连接拒/超时/HTTP 5xx（基础设施真失联）→ dev 允许 mock fallback
 *   - { ok: false, kind: "server_error" }  新增：HTTP 200 + body code:500（应用层 bug，siteBase 既有 bug）
 *                                           → dev 允许 mock-demo fallback（带水印）；production 错误态不 mock
 *   - { ok: false, kind: "business" }      类3：4xx/业务码(404/400) → 一律不 mock，走 notFound()
 *
 * 校准背景：上一轮把 body code:500 归 network（类1）是错的——id=2007 真商品存在却返 500，
 * id=1 不存在返 404 的对比坐实了 500 是 controller 渲染存在的商品时崩了，不是基础设施失联。
 * 按原表 mock fallback 让真商品渲染成 STM32G474 假商品、HTTP 200、无水印，是假成功换马甲。
 */
type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "network" }
  | { ok: false; kind: "server_error" }
  | { ok: false; kind: "business" };

async function fetchJson<T>(path: string): Promise<FetchResult<T>> {
  if (SKIP_LIVE_FETCH) return { ok: false, kind: "network" };
  const url = `${SITEBASE_URL}${path}`;
  try {
    const timeout = new Promise<FetchResult<T>>((resolve) =>
      setTimeout(() => resolve({ ok: false, kind: "network" }), 1500)
    );
    const req = fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": "zh-CN" },
    }).then(async (res): Promise<FetchResult<T>> => {
      if (!res.ok) {
        // HTTP 5xx = 网关/服务进程真挂（类1，可 mock）；HTTP 4xx = 业务错（类3，不 mock）
        return { ok: false, kind: res.status >= 500 ? "network" : "business" };
      }
      const json = (await res.json()) as {
        code: number;
        data?: T;
        msg?: string;
      };
      if (json && (json.code === 0 || json.code === 200) && json.data) {
        return { ok: true, data: json.data };
      }
      // HTTP 200 + body code:500 = 应用层 bug（siteBase ProductController 既有 bug 归此类）
      // 这不是基础设施失联——连接通、服务活、admin 写链路可用，坏的只是这个 endpoint 的渲染逻辑
      // → 归 server_error，按发布态分流：dev mock-demo（带水印），production 错误态不 mock
      if (json && json.code >= 500) return { ok: false, kind: "server_error" };
      // code:400/404 → 业务错（类3，不 mock）
      return { ok: false, kind: "business" };
    });
    return (await Promise.race([req, timeout])) as FetchResult<T>;
  } catch {
    return { ok: false, kind: "network" };
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

// ────────────────────────────────────────────────
// B2 第一刀：三轮车独立站占位素材
// 球门：这一刀跑通"首页 Hero + 产品列表"模板，素材用占位，真素材后填。
// 占位产品呼应上一轮 live 建出的 EcoCargo Trike X1（id=2007）。
// 真连 siteBase /products 列表接口后，这些 mock 退化为 fallback。
// ────────────────────────────────────────────────
const MOCK_PRODUCTS_LIST: Product[] = [
  {
    id: 2007,
    name: "EcoCargo Trike X1",
    product_code: "ECT-X1",
    description:
      "Electric cargo trike for last-mile delivery. 250W motor, 36V 15Ah battery, 80km range, 150kg payload. CE & UL certified.",
    price: 1890,
    stock: 48,
    images: "/uploads/ecocargo-trike-x1.jpg",
    category_id: 101,
    brand_id: 1,
    brand_name: HUTIAN_BRAND_NAME,
    category_name: "Electric Cargo Trikes",
    is_on_sale: 1,
    rohs_compliant: 1,
    features: "250W motor,80km range,150kg payload,CE/UL certified",
  },
  {
    id: 2008,
    name: "EcoCargo Trike X2",
    product_code: "ECT-X2",
    description:
      "Upgraded cargo trike with 500W motor and 48V 20Ah battery. 120km range, 200kg payload, dual hydraulic brakes.",
    price: 2450,
    stock: 32,
    images: "/uploads/ecocargo-trike-x2.jpg",
    category_id: 101,
    brand_id: 1,
    brand_name: HUTIAN_BRAND_NAME,
    category_name: "Electric Cargo Trikes",
    is_on_sale: 1,
    rohs_compliant: 1,
    features: "500W motor,120km range,200kg payload,dual hydraulic brakes",
  },
  {
    id: 2009,
    name: "EcoCargo Trike X3 Pro",
    product_code: "ECT-X3P",
    description:
      "Premium cargo trike with tilting mechanism, 750W motor, 60V 30Ah battery. 150km range, 250kg payload, reverse camera.",
    price: 3280,
    stock: 18,
    images: "/uploads/ecocargo-trike-x3-pro.jpg",
    category_id: 101,
    brand_id: 1,
    brand_name: HUTIAN_BRAND_NAME,
    category_name: "Electric Cargo Trikes",
    is_on_sale: 1,
    rohs_compliant: 1,
    features: "750W motor,150km range,250kg payload,tilting mechanism",
  },
  {
    id: 2010,
    name: "UrbanGlide Trike S",
    product_code: "UG-S",
    description:
      "Compact urban commuter trike. 350W motor, 36V 12Ah battery, 70km range, foldable frame for easy storage.",
    price: 1290,
    stock: 65,
    images: "/uploads/urbanglide-trike-s.jpg",
    category_id: 102,
    brand_id: 1,
    brand_name: HUTIAN_BRAND_NAME,
    category_name: "Urban Commuter Trikes",
    is_on_sale: 1,
    rohs_compliant: 1,
    features: "350W motor,70km range,foldable frame,compact design",
  },
  {
    id: 2011,
    name: "HeavyDuty Trike H8",
    product_code: "HD-H8",
    description:
      "Industrial heavy-duty trike for logistics. 1000W motor, 72V 40Ah battery, 100km range, 400kg payload, reinforced steel frame.",
    price: 4680,
    stock: 12,
    images: "/uploads/heavyduty-trike-h8.jpg",
    category_id: 103,
    brand_id: 1,
    brand_name: HUTIAN_BRAND_NAME,
    category_name: "Heavy-Duty Trikes",
    is_on_sale: 1,
    rohs_compliant: 1,
    features: "1000W motor,100km range,400kg payload,reinforced steel frame",
  },
  {
    id: 2012,
    name: "Folding Trike F3",
    product_code: "FT-F3",
    description:
      "Lightweight folding trike for mixed-mode commute. 250W motor, 36V 10Ah battery, 60km range, 22kg weight, fits in car trunk.",
    price: 980,
    stock: 88,
    images: "/uploads/folding-trike-f3.jpg",
    category_id: 102,
    brand_id: 1,
    brand_name: HUTIAN_BRAND_NAME,
    category_name: "Urban Commuter Trikes",
    is_on_sale: 1,
    rohs_compliant: 1,
    features: "250W motor,60km range,22kg weight,fits in car trunk",
  },
];

// MOCK_SETTINGS — stale 降级兜底站配置（B2 三轮车独立站）
// 品牌单源：所有含品牌名的文本字段从 HUTIAN_BRAND_NAME 派生，不留硬编码旧名（天启芯科技/半导体/STM32）
// 球门（P0 修复）：stale 不触发 noindex，兜底 head 会被索引 → 兜底内容必须是壶天+三轮车业务，
//   否则 production 降级时站活了但挂旧牌子/错业务描述，违反 PRD §4.1 且污染索引
const TRIKE_TAGLINE = "Electric Cargo Trikes & Urban Mobility";
const MOCK_SETTINGS: SiteSettings = {
  site_name: HUTIAN_BRAND_NAME,
  brand_name: HUTIAN_BRAND_NAME,
  site_description: `${HUTIAN_BRAND_NAME} manufactures electric cargo trikes, urban commuter trikes, and heavy-duty mobility solutions. CE/UL certified, built for global markets.`,
  site_keywords:
    "electric cargo trike,urban commuter trike,heavy-duty trike,CE certified trike,UL certified trike,electric tricycle,cargo trike",
  meta_title: `${HUTIAN_BRAND_NAME} - ${TRIKE_TAGLINE}`,
  meta_description: `${HUTIAN_BRAND_NAME} designs and builds electric cargo trikes, urban commuters, and heavy-duty mobility solutions. 250W-1000W motors, 60-150km range, 150-400kg payload. CE/UL certified, global shipping.`,
  meta_keywords:
    "electric cargo trike,cargo tricycle,urban commuter trike,heavy-duty trike,CE certified,UL certified,global shipping",
  og_image: "/logo.png",
  domain: SITEBASE_DOMAIN,
};

// ────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────

export async function getArticle(id: string | number): Promise<ReaderResult<Article>> {
  const r = await fetchJson<Article>(`/articles/${id}`);
  if (r.ok) return { data: r.data, source: "live" };
  // business（404/400）：一律不 mock，走 notFound()，绝不渲染假页污染索引
  if (r.kind === "business") {
    return { data: null, source: "error", error: `article ${id} business error` };
  }
  // network / server_error：按发布态分流
  //   dev        → 允许 mock fallback（network 标 "mock"，server_error 标 "mock-demo" 区分来源）
  //   production → 错误态，绝不渲染假页给爬虫（siteBase 真挂或应用层 bug 都不 mock）
  if (PUBLISH_MODE === "dev" && ALLOW_MOCK_FALLBACK) {
    const source = r.kind === "server_error" ? "mock-demo" : "mock";
    return { data: { ...MOCK_ARTICLE, id: Number(id) || 1 }, source };
  }
  return {
    data: null,
    source: "error",
    error: `article ${id} ${r.kind} error (publish=${PUBLISH_MODE})`,
  };
}

export async function getProduct(id: string | number): Promise<ReaderResult<Product>> {
  const r = await fetchJson<Product>(`/products/${id}`);
  if (r.ok) return { data: r.data, source: "live" };
  if (r.kind === "business") {
    return { data: null, source: "error", error: `product ${id} business error` };
  }
  // network / server_error：按发布态分流（同 getArticle）
  // 球门：id=2007 真商品存在却返 body code:500（siteBase ProductController 既有 bug），
  //       dev 期 mock-demo fallback 让门禁可跑（带水印 + noindex），production 期走错误态不污染索引
  if (PUBLISH_MODE === "dev" && ALLOW_MOCK_FALLBACK) {
    const source = r.kind === "server_error" ? "mock-demo" : "mock";
    return { data: { ...MOCK_PRODUCT, id: Number(id) || 1 }, source };
  }
  return {
    data: null,
    source: "error",
    error: `product ${id} ${r.kind} error (publish=${PUBLISH_MODE})`,
  };
}

/**
 * getProductsList — B2 第一刀：产品列表页数据源
 *
 * 调 siteBase /api/v1/products（public GET，列表接口）。
 * 真连路径待 siteBase 侧验证（route/api.php 是否暴露无 id 的列表 endpoint）；
 * dev 期 SKIP_LIVE_FETCH=true 走 mock，先用三轮车占位素材跑通模板。
 *
 * 错误态分流同 getProduct：business 不 mock，network/server_error 按发布态分流。
 * 球门：列表页是独立站门面，dev 期 mock 兜底让模板可跑（带水印 + noindex），
 *       production 期走错误态，绝不渲染假列表给爬虫索引。
 */
export async function getProductsList(): Promise<ReaderResult<Product[]>> {
  const r = await fetchJson<Product[]>(`/products`);
  if (r.ok) return { data: r.data, source: "live" };
  if (r.kind === "business") {
    return { data: null, source: "error", error: `products-list business error` };
  }
  if (PUBLISH_MODE === "dev" && ALLOW_MOCK_FALLBACK) {
    const source = r.kind === "server_error" ? "mock-demo" : "mock";
    return { data: MOCK_PRODUCTS_LIST, source };
  }
  return {
    data: null,
    source: "error",
    error: `products-list ${r.kind} error (publish=${PUBLISH_MODE})`,
  };
}

export async function getSiteSettings(): Promise<ReaderResult<SiteSettings>> {
  // /api/v1/settings/group/seo — 证据 route/api.php:451
  const r = await fetchJson<Record<string, string>>(`/settings/seo`);
  // r.ok 且 data 完整 → live
  if (r.ok && r.data && r.data.meta_title) {
    const data = r.data;
    return {
      data: {
        site_name: data.site_name || MOCK_SETTINGS.site_name,
        brand_name: HUTIAN_BRAND_NAME,
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
  // 否则按错误态分流。r.ok 但 data 不完整（缺 meta_title）也走这里，视为 server_error 兜底
  // 用 if/else 让 TS 正确 narrowing：r.ok 为 false 时 r 有 kind 字段
  const kind: "network" | "server_error" | "business" = r.ok
    ? "server_error"
    : r.kind;
  // dev 期：mock 兜底（区分 mock / mock-demo，带水印 + noindex）
  if (PUBLISH_MODE === "dev" && ALLOW_MOCK_FALLBACK) {
    const source = kind === "server_error" ? "mock-demo" : "mock";
    return { data: MOCK_SETTINGS, source };
  }
  // production 期：settings 是全局依赖，不能整页死 → 降级到兜底 settings + 标 stale
  // 球门（洞②修复）：单页数据（article/product）production 失败走 error/404 合理；
  //   但 settings 每页硬依赖，整站 404 = "取数零容错"，siteBase 闪一下真用户也被全赶走。
  // stale 不触发 noindex/DemoBanner（内容仍可能是 live），让真内容页继续渲染。
  // 业务错（404/400）也走 stale：settings endpoint 缺失属配置问题，用兜底比整站死强。
  return {
    data: MOCK_SETTINGS,
    source: "stale",
    error: `settings ${kind} (publish=${PUBLISH_MODE}, fallback=stale)`,
  };
}

export { SITEBASE_DOMAIN };
