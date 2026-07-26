import type { ReactNode } from "react";
import InboxIcons from "@/components/inbox/Icons";

/**
 * Inbox Route Group layout. ← v0.2 协作收件箱
 *
 * - 复用 workbench 主题变量（--bg0/--bg1/--text/…），与工作台同套主题切换
 * - 不使用 .mkt 作用域（那是官网专用）
 * - 客户端渲染（/inbox 不走 SSG，与 workbench 一致）
 * - workbench-bg 类提供深色网格底纹 + 多色光晕（与工作台同款）
 */
export const dynamic = "force-dynamic";

export default function InboxLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="workbench-bg min-h-screen">
      <InboxIcons />
      {children}
    </div>
  );
}
