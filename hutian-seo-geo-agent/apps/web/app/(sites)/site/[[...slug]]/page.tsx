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

type PageType =
  | "article"
  | "product"
  | "product-list"
  | "home"
  | "about"
  | "news"
  | "faq"
  | "contact";

interface ResolvedRoute {
  type: PageType;
  id: string;
}

// 单页路由（slug.length === 1）的映射表
const SINGLE_PAGE_ROUTES: Record<string, PageType> = {
  products: "product-list",
  about: "about",
  news: "news",
  faq: "faq",
  contact: "contact",
};

function resolveRoute(slug: string[] | undefined): ResolvedRoute | null {
  if (!slug || slug.length === 0) return { type: "home", id: "" };
  if (slug.length === 1) {
    const t = SINGLE_PAGE_ROUTES[slug[0]];
    return t ? { type: t, id: "" } : null;
  }
  const [kind, id] = slug;
  if (kind === "articles") return { type: "article", id };
  if (kind === "products") return { type: "product", id };
  return null;
}

function pageUrl(type: PageType, id: string): string {
  if (type === "home") return `${SITEBASE_DOMAIN}/site`;
  if (type === "product-list") return `${SITEBASE_DOMAIN}/site/products`;
  if (type === "article")
    return `${SITEBASE_DOMAIN}/site/articles/${id}`;
  if (type === "product") return `${SITEBASE_DOMAIN}/site/products/${id}`;
  // about/news/faq/contact → /site/{type}
  return `${SITEBASE_DOMAIN}/site/${type}`;
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

  // B2 整站扩展：about/news/faq/contact 四个静态内容页
  // 都是品牌站标配页面，内容用三轮车业务占位，metadata 统一用 settings + 页面标题
  if (
    route.type === "about" ||
    route.type === "news" ||
    route.type === "faq" ||
    route.type === "contact"
  ) {
    const pageMeta: Record<string, { title: string; description: string }> = {
      about: {
        title: `About ${s.brand_name} | Our Story & Mission`,
        description: `Learn about ${s.brand_name}'s mission to revolutionize last-mile delivery with electric cargo trikes. CE/UL certified, built for global markets.`,
      },
      news: {
        title: `${s.brand_name} News & Updates | Electric Trike Industry Insights`,
        description: `Latest news, product updates, and industry insights from ${s.brand_name}. Stay informed about electric cargo trike trends and regulations.`,
      },
      faq: {
        title: `FAQ | ${s.brand_name} Electric Cargo Trikes`,
        description: `Answers to common questions about ${s.brand_name} electric trikes: range, payload, charging, certifications, warranty, and customization options.`,
      },
      contact: {
        title: `Contact ${s.brand_name} | Sales & Support for Electric Trikes`,
        description: `Get in touch with ${s.brand_name} for sales inquiries, technical support, and partnership opportunities. Global shipping, CE/UL certified electric cargo trikes.`,
      },
    };
    const pm = pageMeta[route.type];
    return {
      title: pm.title,
      description: pm.description,
      keywords: s.meta_keywords,
      alternates: { canonical: url },
      openGraph: {
        title: pm.title,
        description: pm.description,
        type: "website",
        url,
        siteName: s.brand_name,
        images: [{ url: s.og_image }],
      },
      twitter: {
        card: "summary_large_image",
        title: pm.title,
        description: pm.description,
      },
      ...(settingsIsDemo ? { robots: demoRobots } : {}),
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

/**
 * SiteNav — 全站导航栏
 *
 * B2 整站扩展：Home/Products/About/News/FAQ/Contact 六入口，品牌名左置。
 * 所有页面共享，在 DemoBanner 之后、body 之前渲染。
 * 当前页面用 underline + text-blue-600 高亮，无 JS 交互（SSR 友好）。
 */
const NAV_ITEMS: Array<{ href: string; label: string; match: PageType }> = [
  { href: "/site", label: "Home", match: "home" },
  { href: "/site/products", label: "Products", match: "product-list" },
  { href: "/site/about", label: "About", match: "about" },
  { href: "/site/news", label: "News", match: "news" },
  { href: "/site/faq", label: "FAQ", match: "faq" },
  { href: "/site/contact", label: "Contact", match: "contact" },
];

function SiteNav({
  brandName,
  currentType,
}: {
  brandName: string;
  currentType: PageType;
}) {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
        <a
          href="/site"
          className="text-xl font-bold text-gray-900 hover:text-blue-600"
        >
          {brandName}
        </a>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={
                "text-sm font-medium " +
                (currentType === item.match
                  ? "text-blue-600 underline"
                  : "text-gray-600 hover:text-blue-600")
              }
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
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

  // FAQPage 内联定义（schema.org/FAQPage，Google 富文本结果用）
  type FAQPageSchema = {
    "@context": "https://schema.org";
    "@type": "FAQPage";
    mainEntity: Array<{
      "@type": "Question";
      name: string;
      acceptedAnswer: { "@type": "Answer"; text: string };
    }>;
  };
  const schemas: Array<
    | ArticleSchema
    | ProductSchema
    | BreadcrumbSchema
    | WebPageSchema
    | ItemListSchema
    | FAQPageSchema
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
  } else if (
    route.type === "about" ||
    route.type === "news" ||
    route.type === "faq" ||
    route.type === "contact"
  ) {
    // B2 整站扩展：四个静态内容页，面包屑统一，body 按类型分支
    schemas.push(
      buildBreadcrumbSchema([
        { name: s.brand_name, url: SITEBASE_DOMAIN },
        {
          name:
            route.type.charAt(0).toUpperCase() + route.type.slice(1),
          url,
        },
      ])
    );

    if (route.type === "about") {
      body = (
        <main className="max-w-4xl mx-auto px-8 py-12">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              About {s.brand_name}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {s.brand_name} designs and manufactures electric cargo trikes
              for sustainable last-mile delivery and urban mobility.
            </p>
          </header>

          {/* 品牌故事 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Our Story
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Founded with a vision to decarbonize urban logistics, {s.brand_name}{" "}
              has spent years engineering electric trikes that combine cargo
              capacity with the agility of a bicycle. From compact urban
              commuters to heavy-duty industrial haulers, our vehicles are
              built to serve businesses and individuals across global markets.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Every trike we build is CE and UL certified, reflecting our
              commitment to safety, quality, and international compliance
              standards.
            </p>
          </section>

          {/* 使命与价值观 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Our Values
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 border rounded-lg">
                <div className="text-3xl mb-3">🌱</div>
                <h3 className="font-semibold text-lg mb-2">Sustainability</h3>
                <p className="text-sm text-gray-600">
                  Electric drivetrains replace fossil fuels, reducing urban
                  emissions one delivery at a time.
                </p>
              </div>
              <div className="p-6 border rounded-lg">
                <div className="text-3xl mb-3">⚙️</div>
                <h3 className="font-semibold text-lg mb-2">Engineering</h3>
                <p className="text-sm text-gray-600">
                  Precision-built frames, reliable motors, and field-tested
                  batteries ensure durability across demanding use cases.
                </p>
              </div>
              <div className="p-6 border rounded-lg">
                <div className="text-3xl mb-3">🌍</div>
                <h3 className="font-semibold text-lg mb-2">Global Reach</h3>
                <p className="text-sm text-gray-600">
                  CE/UL certified for international markets, with shipping and
                  support designed for cross-border customers.
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="bg-blue-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Ready to Explore?
            </h2>
            <p className="text-gray-600 mb-6">
              Browse our full range of electric cargo trikes.
            </p>
            <a
              href="/site/products"
              className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Products
            </a>
          </section>
        </main>
      );
    } else if (route.type === "news") {
      // News 页：占位文章列表（真连 siteBase 后改用 getArticlesList）
      const NEWS_PLACEHOLDER: Array<{
        title: string;
        excerpt: string;
        date: string;
        category: string;
      }> = [
        {
          title: "Electric Cargo Trikes: The Future of Last-Mile Delivery",
          excerpt:
            "How electric trikes are reshaping urban logistics, reducing costs and emissions for delivery businesses worldwide.",
          date: "2026-07-15",
          category: "Industry Insights",
        },
        {
          title: "CE vs UL Certification: What Global Buyers Need to Know",
          excerpt:
            "A practical guide to electric trike certifications for cross-border buyers — what each mark means and why both matter.",
          date: "2026-07-08",
          category: "Compliance",
        },
        {
          title: "Battery Maintenance Tips for Electric Trike Fleets",
          excerpt:
            "Maximize battery lifespan and reduce total cost of ownership with these field-tested maintenance practices.",
          date: "2026-06-28",
          category: "Maintenance",
        },
        {
          title: "How to Choose Between Cargo, Commuter, and Heavy-Duty Trikes",
          excerpt:
            "A buyer's guide covering payload, range, motor power, and use-case matching across our trike categories.",
          date: "2026-06-12",
          category: "Buyer Guides",
        },
      ];
      body = (
        <main className="max-w-4xl mx-auto px-8 py-12">
          <header className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              News &amp; Updates
            </h1>
            <p className="text-lg text-gray-600">
              Industry insights, product updates, and guides from the{" "}
              {s.brand_name} team.
            </p>
          </header>
          <div className="space-y-8">
            {NEWS_PLACEHOLDER.map((post, idx) => (
              <article
                key={idx}
                className="border-b border-gray-200 pb-8 last:border-b-0"
              >
                <div className="text-xs text-blue-600 font-medium mb-2">
                  {post.category} · {post.date}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 hover:text-blue-600 cursor-pointer">
                  {post.title}
                </h2>
                <p className="text-gray-600">{post.excerpt}</p>
                <a
                  href="#"
                  className="inline-block mt-3 text-sm text-blue-600 font-medium hover:underline"
                >
                  Read more →
                </a>
              </article>
            ))}
          </div>
        </main>
      );
    } else if (route.type === "faq") {
      // FAQ 页：三轮车业务 Q&A + FAQPage JSON-LD
      const FAQS: Array<{ q: string; a: string }> = [
        {
          q: "What is the typical range of your electric cargo trikes?",
          a: "Our trikes offer ranges from 60km to 150km per charge, depending on the model. The EcoCargo Trike X1 delivers 80km, while the X3 Pro reaches up to 150km with its 60V 30Ah battery.",
        },
        {
          q: "How much payload can the trikes carry?",
          a: "Payload capacity ranges from 150kg to 400kg. Urban commuter models start at 150kg, while our HeavyDuty H8 handles up to 400kg with its reinforced steel frame.",
        },
        {
          q: "Are your trikes CE and UL certified?",
          a: "Yes. All our electric trikes are CE certified for European markets and UL certified for North American markets. Certification documents are available on request.",
        },
        {
          q: "How long does it take to charge the battery?",
          a: "Standard charge time is 4-6 hours from empty to full. We recommend charging overnight for fleet operations. Fast-charge options are available on select models.",
        },
        {
          q: "Do you offer customization for fleet buyers?",
          a: "Yes. For bulk orders we offer customization on cargo box dimensions, color schemes, battery capacity, and additional features like reverse cameras or GPS tracking.",
        },
        {
          q: "What is the warranty coverage?",
          a: "Our trikes come with a 2-year warranty on the frame and motor, and a 1-year warranty on the battery. Extended warranty options are available for fleet customers.",
        },
        {
          q: "Do you ship internationally?",
          a: "Yes. We ship globally with CE/UL-compliant documentation. Shipping costs and lead times vary by destination — contact our sales team for a quote.",
        },
        {
          q: "Can I get spare parts and after-sales support?",
          a: "Yes. We maintain a spare parts inventory and provide remote technical support. For fleet customers, we offer training and on-site service options.",
        },
      ];
      // FAQPage JSON-LD（schema.org/FAQPage，利于 Google 富文本结果）
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
      body = (
        <main className="max-w-3xl mx-auto px-8 py-12">
          <header className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600">
              Answers to common questions about {s.brand_name} electric cargo
              trikes.
            </p>
          </header>
          <div className="space-y-6">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.q}
                </h2>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 p-6 bg-blue-50 rounded-lg text-center">
            <p className="text-gray-700 mb-3">Still have questions?</p>
            <a
              href="/site/contact"
              className="inline-block bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </main>
      );
    } else {
      // contact
      body = (
        <main className="max-w-4xl mx-auto px-8 py-12">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Contact {s.brand_name}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Questions about our electric trikes? Need a fleet quote? Reach
              out — our team responds within 24 hours.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 联系方式 */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Get in Touch
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Sales Inquiries
                  </dt>
                  <dd className="text-gray-900">sales@hutian-trike.com</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Technical Support
                  </dt>
                  <dd className="text-gray-900">support@hutian-trike.com</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-gray-900">+86 400-XXX-XXXX</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Business Hours
                  </dt>
                  <dd className="text-gray-900">
                    Mon-Fri, 9:00-18:00 (GMT+8)
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Headquarters
                  </dt>
                  <dd className="text-gray-900">
                    [Placeholder — real address to be filled at launch]
                  </dd>
                </div>
              </dl>
            </div>

            {/* 表单占位 */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Send a Message
              </h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Sales inquiry</option>
                    <option>Technical support</option>
                    <option>Fleet / bulk order</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="button"
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Message
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-3">
                Form is a visual placeholder — backend integration pending.
              </p>
            </div>
          </div>
        </main>
      );
    }
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
      <SiteNav brandName={s.brand_name} currentType={route.type} />
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
