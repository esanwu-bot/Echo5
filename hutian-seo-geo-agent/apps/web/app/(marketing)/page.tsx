import type { Metadata } from "next";
import Nav from "@/components/marketing/Nav";
import Hero from "@/components/marketing/Hero";
import Features from "@/components/marketing/Features";
import Flow from "@/components/marketing/Flow";
import Templates from "@/components/marketing/Templates";
import Pricing from "@/components/marketing/Pricing";
import CTA from "@/components/marketing/CTA";
import Footer from "@/components/marketing/Footer";
import RevealOnScroll from "@/components/marketing/RevealOnScroll";

/**
 * 官网首页 —— SSG（async server component）。
 * Route Group (marketing) → URL 为 /（不带 marketing 前缀）。
 * 渲染策略：force-static，构建时静态生成（NFR-01 LCP < 2.5s）。
 *
 * Section 顺序对照原型：Nav → Hero（含打字机+3D+浮动指标+stats）→ Features（6 项能力）
 * → Flow（四步诊断法·深色）→ Templates（3 行业模板）→ Pricing（月/年切换）→ CTA → Footer。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "壶天AI 建站 | 用一句话，AI 帮你建好站",
  description:
    "壶天AI 建站 —— 用自然语言描述需求，AI 自动生成 SEO 原生、GEO 友好、全端响应的高性能网站，30 秒上线。",
};

export default async function HomePage() {
  return (
    <>
      <Nav />
      <Hero />
      <Features />
      <Flow />
      <Templates />
      <Pricing />
      <CTA />
      <Footer />
      <RevealOnScroll />
    </>
  );
}
