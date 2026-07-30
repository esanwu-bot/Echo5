"use client";

import type { StreamState } from "@/lib/streamReducer";

/**
 * 左栏.  ← PRD IA / FR-W01 会话与运行时可视
 *
 * 顶部：新建会话 + 搜索。
 * 中部：会话列表（mock 数据，演示用）。
 * 底部：运行时卡片（上下文窗口 / 模型路由 / 工具数 / MCP / 沙箱）。
 *
 * 响应式（NFR-03）：
 * - ≥900px：常驻左栏（w-64）
 * - <900px：抽屉模式，由 isOpen 控制滑入/滑出
 */

const SESSIONS = [
  { id: "s1", title: "壶天品牌实体更名 + GEO 诊断", time: "进行中", active: true, toolCount: 5 },
  { id: "s2", title: "产品页 Schema 补齐（gtin/price）", time: "2 小时前", active: false, toolCount: 3 },
  { id: "s3", title: "IndexNow 提交 + 收录验证", time: "昨天", active: false, toolCount: 2 },
  { id: "s4", title: "FAQPage 结构化数据生成", time: "3 天前", active: false, toolCount: 4 },
  { id: "s5", title: "AI 引用追踪周报", time: "上周", active: false, toolCount: 1 },
];

interface SidebarProps {
  state: StreamState;
  modelLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onNewSession?: () => void;
}

export default function Sidebar({
  state,
  modelLabel,
  isOpen,
  onClose,
  onNewSession,
}: SidebarProps) {
  const completedTools = state.tools.filter((t) => t.status === "done").length;
  const ctxUsed = Math.min(38 + state.tools.length * 6, 96);

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-14 bottom-9 z-40 flex w-64 flex-col border-r border-line bg-bg1/90 backdrop-blur-xl transition-transform duration-300 lg:static lg:top-0 lg:z-0 lg:translate-x-0 lg:bg-bg1/60 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 新建会话 */}
        <div className="p-3">
          <button
            onClick={onNewSession}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber to-amber2 px-3 py-2.5 text-[13px] font-semibold text-white shadow-glow transition hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4"><use href="#w-plus" /></svg>
            新建会话
          </button>
        </div>

        {/* 搜索 */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-bg2 px-2.5 py-1.5">
            <svg className="h-3.5 w-3.5 text-faint"><use href="#w-search" /></svg>
            <input
              placeholder="搜索会话…"
              className="w-full bg-transparent text-[12px] text-text placeholder:text-faint focus:outline-none"
            />
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <div className="px-2 py-1.5 font-mono text-[10px] tracking-wider text-faint">
            会话历史
          </div>
          {SESSIONS.map((s) => (
            <button
              key={s.id}
              className={`mb-0.5 flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition ${
                s.active ? "bg-bg3" : "hover:bg-bg2"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.active ? "bg-amber animate-[pulse-amber_1.4s_infinite]" : "bg-faint"
                  }`}
                />
                <span className="line-clamp-1 flex-1 text-[12.5px] font-medium text-text">
                  {s.title}
                </span>
              </div>
              <div className="flex items-center justify-between pl-3.5">
                <span className="text-[10.5px] text-faint">{s.time}</span>
                <span className="font-mono text-[10px] text-faint">
                  {s.toolCount} tools
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 运行时卡片 FR-W01 */}
        <div className="border-t border-line p-3">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-faint">
            <svg className="h-3 w-3"><use href="#w-tune" /></svg>
            运行时
          </div>
          <div className="space-y-2 rounded-lg border border-line bg-bg2 p-2.5">
            {/* 上下文窗口 */}
            <RuntimeRow icon="w-layer" label="上下文">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-bg3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal to-violet transition-all duration-500"
                    style={{ width: `${ctxUsed}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-dim">{ctxUsed}%</span>
              </div>
            </RuntimeRow>

            {/* 模型路由 */}
            <RuntimeRow icon="w-cpu" label="模型">
              <span className="font-mono text-[10px] text-violet">{modelLabel}</span>
            </RuntimeRow>

            {/* 工具数 */}
            <RuntimeRow icon="w-zap" label="工具">
              <span className="font-mono text-[10px] text-dim">
                {completedTools}/{state.totalTools || 5}
              </span>
            </RuntimeRow>

            {/* MCP 连接 */}
            <RuntimeRow icon="w-sync" label="MCP">
              <span className="flex items-center gap-1 font-mono text-[10px] text-green">
                <span className="h-1.5 w-1.5 rounded-full bg-green animate-[pulse-dot_2s_infinite]" />
                已连接
              </span>
            </RuntimeRow>

            {/* 沙箱隔离 */}
            <RuntimeRow icon="w-shield" label="沙箱">
              <span className="font-mono text-[10px] text-teal">isolated</span>
            </RuntimeRow>
          </div>
        </div>
      </aside>
    </>
  );
}

function RuntimeRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-[11px] text-dim">
        <svg className="h-3 w-3 text-faint"><use href={`#${icon}`} /></svg>
        {label}
      </div>
      {children}
    </div>
  );
}
