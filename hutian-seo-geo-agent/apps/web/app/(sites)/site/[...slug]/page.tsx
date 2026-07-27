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
  getSiteSettings,
  SITEBASE_DOMAIN,
} from "@/lib/sites/reader";
import { MarkdownContent } from "@/lib/markdown";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildProductSchema,
} from "@/lib/sites/schema-mapping";
import type {
  ArticleSchema,
  BreadcrumbSchema,
  ProductSchema,
  WebPageSchema,
} from "@/lib/sites/schema-mapping";

// 强制 SSR（每次请求都重新生成，不缓存）
export const dynamic = "force-dynamic";
// 关闭静态生成
export const revalidate = 0;

type PageType = "article" | "product" | "home";

interface ResolvedRoute {
  type: PageType;
  id: string;
}

function resolveRoute(slug: string[] | undefined): ResolvedRoute | null {
  if (!slug || slug.length === 0) return { type: "home", id: "" };
  if (slug.length < 2) return null;
  const [kind, id] = slug;
  if (kind === "articles") return { type: "article", id };
  if (kind === "products") return { type: "product", id };
  return null;
}

function pageUrl(type: PageType, id: string): string {
  if (type === "home") return `${SITEBASE_DOMAIN}/site`;
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
    };
  }

  if (route.type === "article") {
    const r = await getArticle(route.id);
    if (!r.data) return { title: "Article Not Found" };
    const a = r.data;
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
  };
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

  const schemas: Array<ArticleSchema | ProductSchema | BreadcrumbSchema | WebPageSchema> = [];
  let body: React.ReactNode = null;

  if (route.type === "home") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: s.brand_name,
      description: s.meta_description,
      url,
    });
    body = (
      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">{s.brand_name}</h1>
        <p className="text-lg text-gray-600">{s.site_description}</p>
      </main>
    );
  } else if (route.type === "article") {
    const r = await getArticle(route.id);
    if (!r.data) notFound();
    const a = r.data;
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
