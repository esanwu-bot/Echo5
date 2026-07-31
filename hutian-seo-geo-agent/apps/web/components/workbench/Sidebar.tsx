"use client";

import { useMemo } from "react";
import type { StreamState } from "@/lib/streamReducer";
import type { SessionListItem } from "@/lib/sessionList";
import { formatRelativeTime } from "@/lib/sessionList";

/**
 * 左栏.  ← PRD IA / FR-W01 会话与运行时可视
 *
 * 顶部：新建会话 + 搜索。
 * 中部：会话列表（从 hutian_session_list_v1 读取，localStorage 持久化）。
 * 底部：运行时卡片（上下文窗口 / 模型路由 / 工具数 / MCP / 沙箱）。
 *
 * 响应式（NFR-03）：
 * - ≥900px：常驻左栏（w-64）
 * - <900px：抽屉模式，由 isOpen 控制滑入/滑出
 */

interface SidebarProps {
  state: StreamState;
  modelLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onNewSession?: () => void;
  /** 会话列表（localStorage 真相源，父组件管理） */
  sessions: SessionListItem[];
  /** 当前选中 sessionId（null = 空工作台/新建会话未发送首轮消息） */
  currentSessionId: string | null;
  /** 点击会话列表项时的回调：切换到该 sessionId */
  onSelectSession?: (sessionId: string) => void;
  /** 搜索关键词（父组件受控，便于后续加真搜索） */
  searchKeyword?: string;
  onSearchChange?: (kw: string) => void;
  /** 远程同步状态徽标（synced=云端绿 / offline=离线琥珀 / server_error=后端挂红 / local=未登录本地灰） */
  syncStatus?: "synced" | "offline" | "unauthed" | "server_error" | "local";
  /** 连续读失败次数（失败状态时显示"x次"在徽标后，让用户知道还在失败而非已恢复） */
  syncFails?: number;
}

const SYNC_LABEL: Record<string, { text: string; color: string; dot: string }> = {
  synced:       { text: "云端已同步", color: "text-green",       dot: "bg-green" },
  offline:      { text: "离线 · 仅本设备", color: "text-amber",   dot: "bg-amber" },
  server_error: { text: "同步异常 · 仅本设备", color: "text-red", dot: "bg-red" },
  unauthed:     { text: "未认证 · 仅本设备", color: "text-amber",  dot: "bg-amber" },
  local:        { text: "仅本设备", color: "text-faint",          dot: "bg-faint" },
};

export default function Sidebar({
  state,
  modelLabel,
  isOpen,
  onClose,
  onNewSession,
  sessions,
  currentSessionId,
  onSelectSession,
  searchKeyword,
  onSearchChange,
  syncStatus = "local",
  syncFails = 0,
}: SidebarProps) {
  const completedTools = state.tools.filter((t) => t.status === "done").length;
  const ctxUsed = Math.min(38 + state.tools.length * 6, 96);

  const nowMs = useMemo(() => Date.now(), [sessions.length]);
  const filteredSessions = useMemo(() => {
    const kw = searchKeyword?.trim();
    if (!kw) return sessions;
    const lower = kw.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(lower));
  }, [sessions, searchKeyword]);

  /** 当前正在进行的 session：有 agentRunning=true 且 currentSessionId 匹配才显示 pulse 动画 */
  const activeRunningId = state.agentRunning && !state.done ? currentSessionId : null;

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
              value={searchKeyword ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-transparent text-[12px] text-text placeholder:text-faint focus:outline-none"
            />
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="font-mono text-[10px] tracking-wider text-faint">会话历史</span>
            {/* 同步状态徽标 */}
            <span className={`flex items-center gap-1 font-mono text-[9.5px] ${SYNC_LABEL[syncStatus].color}`} title={SYNC_LABEL[syncStatus].text}>
              <span className={`h-1.5 w-1.5 rounded-full ${SYNC_LABEL[syncStatus].dot}`} />
              {SYNC_LABEL[syncStatus].text}
              {syncFails > 0 && syncStatus !== "synced" && syncStatus !== "local" ? (
                <span className="ml-0.5">· {syncFails}次</span>
              ) : null}
            </span>
          </div>
          {filteredSessions.length === 0 ? (
            <div className="px-3 py-8 text-center text-[11px] text-faint">
              {searchKeyword?.trim() ? "无匹配会话" : "暂无历史会话，发送第一条消息即可记录"}
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isSelected = s.id === currentSessionId;
              const isRunning = s.id === activeRunningId;
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectSession?.(s.id)}
                  className={`mb-0.5 flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition ${
                    isSelected ? "bg-bg3" : "hover:bg-bg2"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isRunning
                          ? "bg-amber animate-[pulse-amber_1.4s_infinite]"
                          : isSelected
                            ? "bg-amber/70"
                            : "bg-faint"
                      }`}
                    />
                    <span className="line-clamp-1 flex-1 text-[12.5px] font-medium text-text">
                      {s.title}
                    </span>
                    {s.dirty ? (
                      <span
                        className="shrink-0 font-mono text-[9px] text-amber"
                        title="本会话尚未同步到云端（远程写入失败），仅本设备可见"
                      >
                        未同步
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between pl-3.5">
                    <span className="text-[10.5px] text-faint">
                      {formatRelativeTime(s.lastActiveAt, nowMs)}
                    </span>
                    <span className="font-mono text-[10px] text-faint">
                      {s.toolCount} tools
                    </span>
                  </div>
                </button>
              );
            })
          )}
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
