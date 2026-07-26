"use client";

/**
 * Inbox 顶栏. ← PRD §4.3 / 复用 workbench 主题变量
 *
 * 品牌 · 面包屑 · 搜索 · 头像。比 workbench TopBar 简化（无模型路由/主题切换，
 * 主题跟随 workbench 同套 next-themes）。
 */
interface TopBarProps {
  unreadCount?: number;
}

export default function TopBar({ unreadCount = 0 }: TopBarProps) {
  return (
    <header className="relative z-30 flex h-14 items-center gap-3 border-b border-line bg-bg1/80 px-4 backdrop-blur-xl">
      {/* 品牌 */}
      <a href="/" className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber to-amber2 font-grotesk text-[15px] font-bold text-white shadow-[0_3px_10px_rgba(247,114,52,0.3)]">
          壶
        </div>
        <div className="leading-tight">
          <div className="font-grotesk text-[15px] font-bold text-text">
            壶天 <span className="text-faint">/</span> Inbox
          </div>
          <div className="font-mono text-[10px] tracking-wider text-faint">
            站长协作收件箱
          </div>
        </div>
      </a>

      {/* 面包屑 */}
      <div className="ml-2 hidden items-center gap-2 text-[13px] text-dim md:flex">
        <span className="h-1 w-1 rounded-full bg-line2" />
        <span className="font-semibold text-text">hutian.com</span>
        <span className="h-1 w-1 rounded-full bg-line2" />
        <span>收件箱</span>
      </div>

      <div className="flex-1" />

      {/* 搜索 */}
      <div className="hidden items-center gap-2 rounded-lg border border-line bg-bg2 px-3 py-1.5 text-[13px] text-dim transition focus-within:border-amber focus-within:bg-bg1 md:flex md:w-72">
        <svg className="h-3.5 w-3.5"><use href="#i-search" /></svg>
        <input
          className="flex-1 border-none bg-transparent text-text outline-none"
          placeholder="搜索反馈、产品页、SKU…"
        />
        <span className="rounded border border-line px-1.5 py-px font-mono text-[10px] text-faint">⌘K</span>
      </div>

      {/* 头像 */}
      <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-teal to-blue text-[12px] font-bold text-white">
        站
      </div>

      {/* 未读徽章 */}
      {unreadCount > 0 && (
        <span className="rounded-full bg-amber px-2 py-0.5 font-mono text-[11px] font-bold text-white">
          {unreadCount}
        </span>
      )}
    </header>
  );
}
