import type { ReactNode } from "react";
import WorkbenchIcons from "@/components/workbench/Icons";

/**
 * 工作台 layout.  ← 技术方案 §8 / FR-W09
 *
 * - 应用 `workbench-bg` 类（globals.css 已定义网格底纹 + 多色光晕，UX-03）
 * - 不使用 `.mkt` 作用域，直接消费全局主题变量（--bg0/--bg1/--text/…），
 *   由根 layout 的 next-themes ThemeProvider 控制 `class="dark"` 切换
 * - 官网配色由 (marketing)/layout.tsx 的 `.mkt` 作用域隔离，互不污染
 * - 客户端渲染（/workbench 不走 SSG，见 PRD v0.1 验收）
 */
export const dynamic = "force-dynamic";

export default function WorkbenchLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="workbench-bg min-h-screen">
      <WorkbenchIcons />
      {children}
    </div>
  );
}
