import type { Metadata } from "next";
import Nav from "@/components/marketing/Nav";
import Docs from "@/components/marketing/Docs";
import Footer from "@/components/marketing/Footer";

/**
 * 文档 Wiki 页 —— 产品功能与使用指南。
 *
 * Route Group (marketing) → URL 为 /docs。
 * 渲染策略：force-static（SSG），主体交互在 Docs 客户端组件。
 *
 * 原型：D:/Downloads/Qwen_html_20260809_c8lmt14yl.html（壶天 Wiki）。
 * 样式按当前 marketing 设计语言落地。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "文档 · 壶天 Wiki | 壶天AI 建站",
  description:
    "壶天 Wiki 产品功能与使用指南：双评分诊断、结构化数据、一句话建站、AI 引用追踪、工作空间与席位——用对话完成 SEO 与 GEO 全流程。",
};

export default function DocsPage() {
  return (
    <>
      <Nav />
      <Docs />
      <Footer />
    </>
  );
}
