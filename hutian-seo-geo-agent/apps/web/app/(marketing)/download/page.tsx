import type { Metadata } from "next";
import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import RevealOnScroll from "@/components/marketing/RevealOnScroll";
import DownloadApp from "@/components/marketing/DownloadApp";

/**
 * 下载页 —— 提供 Agent 桌面版安装包下载。
 *
 * Route Group (marketing) → URL 为 /download。
 * 渲染策略：force-static（SSG）。
 *
 * 主体交互（OS 检测、平台 tab、校验和、形态选择）在 DownloadApp client component。
 * 依据 qwen 原型 D:/Downloads/Qwen_html_20260726_6ld86v5zx.html 转写。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "下载壶天 Agent 桌面版 | 壶天AI 建站",
  description:
    "下载壶天 SEO/GEO Agent 桌面版，本地优先、零部署、内置自建 Agent Loop；或直接在浏览器在线体验 SEO/GEO 工作台。",
};

export default function DownloadPage() {
  return (
    <>
      <Nav />
      <DownloadApp />
      <Footer />
      <RevealOnScroll />
    </>
  );
}
