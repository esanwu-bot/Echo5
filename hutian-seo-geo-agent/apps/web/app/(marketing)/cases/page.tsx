import type { Metadata } from "next";
import Nav from "@/components/marketing/Nav";
import Cases from "@/components/marketing/Cases";
import CTA from "@/components/marketing/CTA";
import Footer from "@/components/marketing/Footer";
import RevealOnScroll from "@/components/marketing/RevealOnScroll";

/**
 * 客户案例页 —— 展示真实客户用壶天 AI 建站的成果。
 *
 * Route Group (marketing) → URL 为 /cases。
 * 渲染策略：force-static（SSG）。
 *
 * 主案例：天启芯科技 (tikchip.cn) —— 电子元器件 / 半导体 B2B 企业官网。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "客户案例 | 壶天AI 建站",
  description:
    "看天启芯科技等真实企业如何用壶天 AI 建站打造「搜得到、问得到」的官网——SEO 原生结构、GEO 生成式优化、中英双语、全球毫秒级分发。",
};

export default function CasesPage() {
  return (
    <>
      <Nav />
      <Cases />
      <CTA />
      <Footer />
      <RevealOnScroll />
    </>
  );
}
