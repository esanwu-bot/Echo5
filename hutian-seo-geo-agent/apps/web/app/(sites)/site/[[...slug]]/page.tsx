/**
 * γ 渲染器 · catch-all 路由
 *
 * URL 空间（与 siteBase Vite frontend 完全分开，红线 12）：
 *   /site/articles/:id  → 文章页
 *   /site/products/:id   → 商品页
 *
 * γ 物理保证（命门第 7 条）：
 *   1. SSR 注入 <head>：title / meta description / og:* / canonical —— 通过 generateMetadata
 *   2. SSR 注入 <body> JSON-LD：<script type="application/ld+json"> —— 通过页面组件直接渲染
 *   3. 不依赖客户端 JS 执行 —— curl 抓初始 HTML 即含上述元素
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getArticle,
  getProduct,
  getProductsList,
  getSiteSettings,
  SITEBASE_DOMAIN,
} from "@/lib/sites/reader";
import { MarkdownContent } from "@/lib/markdown";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildProductSchema,
} from "@/lib/sites/schema-mapping";
import type {
  ArticleSchema,
  BreadcrumbSchema,
  ItemListSchema,
  ProductSchema,
  WebPageSchema,
} from "@/lib/sites/schema-mapping";
import type { Product, SiteSettings } from "@/lib/sites/types";

// 强制 SSR（每次请求都重新生成，不缓存）
export const dynamic = "force-dynamic";
// 关闭静态生成
export const revalidate = 0;

type PageType = "article" | "product" | "product-list" | "home";

interface ResolvedRoute {
  type: PageType;
  id: string;
}

function resolveRoute(slug: string[] | undefined): ResolvedRoute | null {
  if (!slug || slug.length === 0) return { type: "home", id: "" };
  // B2 第一刀：/site/products → product-list（slug.length === 1）
  if (slug.length === 1) {
    if (slug[0] === "products") return { type: "product-list", id: "" };
    return null;
  }
  const [kind, id] = slug;
  if (kind === "articles") return { type: "article", id };
  if (kind === "products") return { type: "product", id };
  return null;
}

function pageUrl(type: PageType, id: string): string {
  if (type === "home") return `${SITEBASE_DOMAIN}/site`;
  if (type === "product-list") return `${SITEBASE_DOMAIN}/site/products`;
  return `${SITEBASE_DOMAIN}/site/${type === "article" ? "articles" : "products"}/${id}`;
}

// ────────────────────────────────────────────────
// SSR 注入 <head>（命门第 7 条 a）
// ────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Promise<Metadata> {
  const route = resolveRoute(params.slug);
  if (!route) return { title: "Not Found" };

  const settings = await getSiteSettings();
  if (!settings.data) {
    return { title: "Site Not Configured" };
  }
  const s = settings.data;
  const url = pageUrl(route.type, route.id);

  // 演示态判据（这一轮校准的关键防线）：
  //   settings 或 article/product 任一来自 mock/mock-demo → robots noindex,nofollow
  //   球门：爬虫看到 noindex 就不索引假页，避免"建出来的站达标"在商品页破功
  const settingsIsDemo =
    settings.source === "mock" || settings.source === "mock-demo";
  const demoRobots = { index: false, follow: false };

  if (route.type === "home") {
    return {
      title: s.meta_title,
      description: s.meta_description,
      keywords: s.meta_keywords,
      alternates: { canonical: url },
      openGraph: {
        title: s.meta_title,
        description: s.meta_description,
        type: "website",
        url,
        siteName: s.brand_name,
        images: [{ url: s.og_image }],
      },
      twitter: {
        card: "summary_large_image",
        title: s.meta_title,
        description: s.meta_description,
        images: [s.og_image],
      },
      ...(settingsIsDemo ? { robots: demoRobots } : {}),
    };
  }

  // B2 第一刀：产品列表页 metadata
  if (route.type === "product-list") {
    const r = await getProductsList();
    const isDemo =
      settingsIsDemo || r.source === "mock" || r.source === "mock-demo";
    const productCount = r.data?.length ?? 0;
    const title = `${s.brand_name} Products | Electric Cargo Trikes & More`;
    const description = `Browse ${productCount}+ electric trikes from ${s.brand_name}. Cargo trikes, urban commuters, heavy-duty models. CE/UL certified, global shipping.`;
    return {
      title,
      description,
      keywords: s.meta_keywords,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        type: "website",
        url,
        siteName: s.brand_name,
        images: [{ url: s.og_image }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
      ...(isDemo ? { robots: demoRobots } : {}),
    };
  }

  if (route.type === "article") {
    const r = await getArticle(route.id);
    if (!r.data) return { title: "Article Not Found" };
    const a = r.data;
    const isDemo =
      settingsIsDemo || r.source === "mock" || r.source === "mock-demo";
    return {
      title: a.title,
      description: a.summary || s.meta_description,
      keywords: s.meta_keywords,
      alternates: { canonical: url },
      openGraph: {
        title: a.title,
        description: a.summary || s.meta_description,
        type: "article",
        url,
        siteName: s.brand_name,
        publishedTime: a.publish_time,
        images: a.image ? [{ url: a.image }] : [{ url: s.og_image }],
      },
      twitter: {
        card: "summary_large_image",
        title: a.title,
        description: a.summary || s.meta_description,
      },
      ...(isDemo ? { robots: demoRobots } : {}),
    };
  }

  // product
  const r = await getProduct(route.id);
  if (!r.data) return { title: "Product Not Found" };
  const p = r.data;
  const img = Array.isArray(p.images)
    ? p.images[0]
    : typeof p.images === "string"
    ? p.images
    : s.og_image;
  const isDemo =
    settingsIsDemo || r.source === "mock" || r.source === "mock-demo";
  return {
    title: `${p.name} | ${s.brand_name}`,
    description: p.description || s.meta_description,
    keywords: s.meta_keywords,
    alternates: { canonical: url },
    openGraph: {
      title: p.name,
      description: p.description || s.meta_description,
      type: "website",
      url,
      siteName: s.brand_name,
      images: [{ url: img }],
    },
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description: p.description || s.meta_description,
    },
    ...(isDemo ? { robots: demoRobots } : {}),
  };
}

/**
 * DemoBanner — 演示数据水印（这一轮校准的"假数据必须自报家门"防线）
 *
 * 渲染条件：page source === "mock" | "mock-demo"
 * 作用：让人和爬虫都知道这是假数据。爬虫见 noindex meta 不索引；人见 banner 知道这不是真页。
 * 区分：
 *   mock      = 基础设施失联（连接拒/超时/HTTP 5xx），siteBase 真挂，演示兜底
 *   mock-demo = 应用层 bug（HTTP 200 + body code:500，siteBase 既有 bug），连接通但 endpoint 崩，演示兜底
 */
function DemoBanner({ source }: { source: "mock" | "mock-demo" }) {
  const text =
    source === "mock-demo"
      ? "演示数据 · siteBase 应用层错误（body code:500），已 fallback 到 mock · 此页不会被搜索引擎索引"
      : "演示数据 · siteBase 基础设施失联，已 fallback 到 mock · 此页不会被搜索引擎索引";
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "#f59e0b",
        color: "#fff",
        padding: "10px 16px",
        textAlign: "center",
        fontSize: "13px",
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      ⚠️ {text}
    </div>
  );
}

/**
 * ProductCard — B2 第一刀：产品卡片（首页亮点 + 列表页网格复用）
 *
 * 设计：图片占位区（aspect-video）+ 名称 + 分类 + 价格 + 简介 + 详情链接。
 * 素材用占位：dev 期 images 路径文件可能不存在，img 标签 404 时浏览器显示 broken icon，
 * 但 SSR HTML 合法（爬虫看 alt 即可）。真素材后填时，images 路径换真图即自动显示。
 */
function ProductCard({ p }: { p: Product }) {
  const img = Array.isArray(p.images)
    ? p.images[0]
    : typeof p.images === "string"
    ? p.images
    : "";
  const detailUrl = `/site/products/${p.id}`;
  return (
    <a
      href={detailUrl}
      className="group block rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all"
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-5xl font-bold text-gray-300">
            {p.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="text-xs text-blue-600 font-medium mb-1">
          {p.category_name || "Product"}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
          {p.name}
        </h3>
        <p className="text-2xl font-bold text-blue-600 mb-2">
          ${p.price.toFixed(2)}{" "}
          <span className="text-sm font-normal text-gray-500">USD</span>
        </p>
        <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
        <div className="mt-3 text-sm text-blue-600 font-medium group-hover:underline">
          View Details →
        </div>
      </div>
    </a>
  );
}

// ────────────────────────────────────────────────
// SSR 注入 <body> JSON-LD（命门第 7 条 b）
// ────────────────────────────────────────────────
export default async function SitesPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const route = resolveRoute(params.slug);
  if (!route) notFound();

  const settings = await getSiteSettings();
  if (!settings.data) {
    return (
      <div className="p-8 text-center text-gray-500">
        Site settings unavailable.
      </div>
    );
  }
  const s = settings.data;
  const url = pageUrl(route.type, route.id);

  // 演示态跟踪（与 generateMetadata 同判据）：settings 已 demo 则默认 demo，
  // 后续 article/product 若再 demo，覆盖 demoSource 优先标"最接近页面"的那一层
  let isDemo =
    settings.source === "mock" || settings.source === "mock-demo";
  let demoSource: "mock" | "mock-demo" | null = isDemo
    ? (settings.source as "mock" | "mock-demo")
    : null;

  const schemas: Array<
    ArticleSchema | ProductSchema | BreadcrumbSchema | WebPageSchema | ItemListSchema
  > = [];
  let body: React.ReactNode = null;

  if (route.type === "home") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: s.brand_name,
      description: s.meta_description,
      url,
    });
    // B2 第一刀：首页 Hero + 3 亮点产品卡片 + 关于区
    const productsR = await getProductsList();
    if (productsR.source === "mock" || productsR.source === "mock-demo") {
      isDemo = true;
      demoSource = productsR.source;
    }
    const featured = (productsR.data ?? []).slice(0, 3);
    schemas.push(
      buildBreadcrumbSchema([
        { name: s.brand_name, url: SITEBASE_DOMAIN },
        { name: "Home", url },
      ])
    );
    body = (
      <main>
        {/* Hero 区：独立站门面 */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="max-w-6xl mx-auto px-8 py-20">
            <h1 className="text-5xl font-bold mb-4">{s.brand_name}</h1>
            <p className="text-xl mb-8 max-w-2xl">{s.site_description}</p>
            <a
              href="/site/products"
              className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Browse Products →
            </a>
          </div>
        </section>

        {/* Featured Products：3 亮点卡片 */}
        {featured.length > 0 && (
          <section className="max-w-6xl mx-auto px-8 py-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Featured Products
              </h2>
              <a
                href="/site/products"
                className="text-blue-600 hover:underline font-medium"
              >
                View All →
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featured.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}

        {/* About 区：品牌介绍 + CTA */}
        <section className="bg-gray-50">
          <div className="max-w-4xl mx-auto px-8 py-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              About {s.brand_name}
            </h2>
            <p className="text-lg text-gray-600 mb-8">{s.meta_description}</p>
            <a
              href="/site/products"
              className="inline-block border-2 border-blue-600 text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
            >
              Explore Our Catalog
            </a>
          </div>
        </section>
      </main>
    );
  } else if (route.type === "product-list") {
    // B2 第一刀：产品列表页（独立站核心，卡片网格 + ItemList JSON-LD）
    const r = await getProductsList();
    if (r.source === "mock" || r.source === "mock-demo") {
      isDemo = true;
      demoSource = r.source;
    }
    const products = r.data ?? [];
    schemas.push(
      buildItemListSchema(products, s, url),
      buildBreadcrumbSchema([
        { name: s.brand_name, url: SITEBASE_DOMAIN },
        { name: "Products", url },
      ])
    );
    body = (
      <main className="max-w-6xl mx-auto px-8 py-12">
        <nav className="text-sm text-gray-500 mb-6">
          <a href="/site" className="hover:underline">
            {s.brand_name}
          </a>
          {" / "}
          <span>Products</span>
        </nav>
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {s.brand_name} Products
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Browse our full range of electric trikes. From cargo to commuter,
            heavy-duty to folding — CE/UL certified, built for global markets.
          </p>
        </header>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : r.source === "error" ? (
          // B2 焊料：production 期列表取数失败 → 空列表 + 显式错误态（非假列表，非正常空）
          // 球门：production 绝不返假列表给爬虫索引；错误态让用户知道是临时故障不是真没货
          <div className="text-center py-12">
            <p className="text-red-600 font-medium mb-2">
              Products temporarily unavailable.
            </p>
            <p className="text-sm text-gray-500">
              We&apos;re unable to load the product catalog right now. Please
              try again later.
            </p>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">
            No products available.
          </p>
        )}
      </main>
    );
  } else if (route.type === "article") {
    const r = await getArticle(route.id);
    if (!r.data) notFound();
    const a = r.data;
    if (r.source === "mock" || r.source === "mock-demo") {
      isDemo = true;
      demoSource = r.source;
    }
    schemas.push(
      buildArticleSchema(a, s, url),
      buildBreadcrumbSchema([
        { name: s.brand_name, url: SITEBASE_DOMAIN },
        { name: "文章", url: `${SITEBASE_DOMAIN}/site/articles` },
        { name: a.title, url },
      ])
    );
    body = (
      <main className="max-w-3xl mx-auto p-8">
        <nav className="text-sm text-gray-500 mb-4">
          <a href={`${SITEBASE_DOMAIN}/site`} className="hover:underline">
            {s.brand_name}
          </a>
          {" / "}
          <span>文章</span>
        </nav>
        <article>
          <h1 className="text-4xl font-bold mb-3">{a.title}</h1>
          <p className="text-gray-600 mb-6">{a.summary}</p>
          <MarkdownContent content={a.content} />
        </article>
      </main>
    );
  } else {
    // product
    const r = await getProduct(route.id);
    if (!r.data) notFound();
    const p = r.data;
    if (r.source === "mock" || r.source === "mock-demo") {
      isDemo = true;
      demoSource = r.source;
    }
    schemas.push(
      buildProductSchema(p, s, url),
      buildBreadcrumbSchema([
        { name: s.brand_name, url: SITEBASE_DOMAIN },
        { name: "商品", url: `${SITEBASE_DOMAIN}/site/products` },
        { name: p.name, url },
      ])
    );
    const img = Array.isArray(p.images)
      ? p.images[0]
      : typeof p.images === "string"
      ? p.images
      : "";
    body = (
      <main className="max-w-4xl mx-auto p-8">
        <nav className="text-sm text-gray-500 mb-4">
          <a href={`${SITEBASE_DOMAIN}/site`} className="hover:underline">
            {s.brand_name}
          </a>
          {" / "}
          <span>商品</span>
        </nav>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={p.name}
              className="w-full rounded-lg border"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold mb-2">{p.name}</h1>
            <p className="text-xl text-blue-600 mb-4">
              ${p.price.toFixed(2)}{" "}
              <span className="text-sm text-gray-500">USD</span>
            </p>
            <p className="text-gray-700 mb-4">{p.description}</p>
            <p className="text-sm text-gray-500">
              库存：{p.stock > 0 ? `${p.stock} 件` : "缺货"}
            </p>
            {p.features && (
              <div className="mt-4 text-sm">
                <strong>特性：</strong> {p.features}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      {isDemo && demoSource && <DemoBanner source={demoSource} />}
      {body}
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
