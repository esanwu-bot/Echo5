"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { TenantUser } from "@/lib/portal/auth";

/**
 * 顶栏.  ← PRD IA / FR-W09 主题切换 / FR-W10 模型路由
 *
 * 品牌 · 工作区 · 模型路由下拉 · 主题切换 · Agent 状态灯 · 账号（登录/登出）。
 * 模型切换会回调 onModelChange 并由父级弹 toast（FR-W10）。
 * 账号信息：未登录时显示「登录」按钮，登录后显示头像 + displayName 下拉。
 */
const MODELS = [
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", tag: "快速", desc: "DeepSeek · 高速版" },
  { id: "hy3-preview", label: "Hunyuan Turbo", tag: "预览", desc: "腾讯混元 · 预览版" },
  { id: "kimi-2.5", label: "Kimi 2.5", tag: "长文", desc: "Moonshot · 256K 上下文" },
] as const;

interface TopBarProps {
  agentRunning: boolean;
  model: string;
  onModelChange: (id: string, label: string) => void;
  onToggleSidebar: () => void;
  /** 当前登录用户（null = 未登录） */
  user: TenantUser | null;
  /** 未登录时点击顶部的登录按钮触发 */
  onRequestLogin?: () => void;
  /** 点击下拉里的登出按钮触发 */
  onLogout?: () => Promise<void> | void;
  /** me 接口校验失败的提示（cookie 过期/网络错），传给 topbar 小红点 */
  authError?: string | null;
}

export default function TopBar({
  agentRunning,
  model,
  onModelChange,
  onToggleSidebar,
  user,
  onRequestLogin,
  onLogout,
  authError,
}: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await onLogout?.();
    } finally {
      setLogoutLoading(false);
      setAccountOpen(false);
    }
  };

  const initials = user
    ? (user.display_name || user.email || "?").slice(0, 1).toUpperCase()
    : null;

  useEffect(() => setMounted(true), []);

  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const isDark = resolvedTheme === "dark";

  return (
    <header
      className="relative z-30 flex h-14 items-center gap-3 border-b border-line bg-bg1/80 px-4 backdrop-blur-xl"
    >
      {/* 移动端抽屉触发 */}
      <button
        onClick={onToggleSidebar}
        className="hidden w-9 place-items-center rounded-lg text-dim hover:bg-bg2 hover:text-text lg:hidden lg:grid"
        aria-label="切换侧栏"
      >
        <svg className="h-5 w-5"><use href="#w-menu" /></svg>
      </button>

      {/* 品牌 */}
      <a href="/" className="flex items-center gap-2.5">
        <svg className="h-8 w-8"><use href="#w-logo" /></svg>
        <div className="leading-tight">
          <div className="font-grotesk text-[15px] font-bold text-text">
            壶天 <span className="text-faint">/</span> Workbench
          </div>
          <div className="font-mono text-[10px] tracking-wider text-faint">
            SEO · GEO AGENT
          </div>
        </div>
      </a>

      {/* 工作区 */}
      <div className="ml-2 hidden items-center gap-1.5 rounded-lg border border-line bg-bg2 px-2.5 py-1.5 text-[13px] text-dim md:flex">
        <svg className="h-3.5 w-3.5 text-teal"><use href="#w-layer" /></svg>
        <span className="font-medium text-text">hutian-seo</span>
        <span className="text-faint">/</span>
        <span className="font-mono text-[12px]">main</span>
      </div>

      <div className="flex-1" />

      {/* 模型路由 FR-W10 */}
      <div className="relative">
        <button
          onClick={() => setModelOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-line bg-bg2 px-3 py-1.5 text-[13px] font-medium text-text transition hover:border-line2 hover:bg-bg3"
        >
          <svg className="h-4 w-4 text-violet"><use href="#w-cpu" /></svg>
          <span>{current.label}</span>
          <span className="rounded bg-violet/10 px-1.5 py-0.5 text-[10px] font-mono text-violet">
            {current.tag}
          </span>
          <svg className={`h-3.5 w-3.5 text-faint transition-transform ${modelOpen ? "rotate-180" : ""}`}>
            <use href="#w-chev" />
          </svg>
        </button>

        {modelOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setModelOpen(false)}
            />
            <div className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line2 bg-bg1 shadow-glow">
              <div className="border-b border-line px-3 py-2 font-mono text-[11px] tracking-wider text-faint">
                模型路由
              </div>
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onModelChange(m.id, m.label);
                    setModelOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-bg2 ${
                    m.id === model ? "bg-bg2" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-text">
                        {m.label}
                      </span>
                      <span className="rounded bg-bg3 px-1.5 py-0.5 text-[10px] font-mono text-dim">
                        {m.tag}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-faint">{m.desc}</div>
                  </div>
                  {m.id === model && (
                    <svg className="h-4 w-4 text-teal"><use href="#w-check" /></svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 主题切换 FR-W09 */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-bg2 text-dim transition hover:border-line2 hover:text-text"
        aria-label="切换主题"
        title={isDark ? "切换到浅色" : "切换到深色"}
      >
        {mounted && (
          <svg className="h-4 w-4">
            <use href={isDark ? "#w-sun" : "#w-moon"} />
          </svg>
        )}
      </button>

      {/* Agent 状态灯 */}
      <div className="hidden items-center gap-2 rounded-lg border border-line bg-bg2 px-3 py-1.5 sm:flex">
        <span
          className={`h-2 w-2 rounded-full ${
            agentRunning
              ? "bg-amber animate-[pulse-amber_1.4s_infinite]"
              : "bg-green animate-[pulse-dot_2s_infinite]"
          }`}
        />
        <span className="font-mono text-[11px] text-dim">
          {agentRunning ? "RUNNING" : "IDLE"}
        </span>
      </div>

      {/* 账号：未登录 → 登录按钮；已登录 → 头像+displayName 下拉 */}
      {user ? (
        <div className="relative">
          <button
            onClick={() => setAccountOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border bg-bg2 px-2.5 py-1.5 transition hover:border-line2 hover:bg-bg3 ${
              authError ? "border-amber/60" : "border-line"
            }`}
            title={authError || user.email}
          >
            <div className="relative">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal to-violet text-[12px] font-bold text-white">
                {initials}
              </div>
              {authError && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-bg2 bg-amber" />
              )}
            </div>
            <div className="hidden leading-tight text-left lg:block">
              <div className="text-[12.5px] font-semibold text-text">
                {user.display_name || "未命名用户"}
              </div>
              <div className="font-mono text-[10px] text-faint">
                T#{user.tenant_id} · W#{user.workspace_id}
              </div>
            </div>
            <svg className={`h-3.5 w-3.5 text-faint transition-transform ${accountOpen ? "rotate-180" : ""}`}>
              <use href="#w-chev" />
            </svg>
          </button>

          {accountOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setAccountOpen(false)}
              />
              <div className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line2 bg-bg1 shadow-glow">
                <div className="border-b border-line px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-text">
                    {user.display_name || "未命名用户"}
                  </div>
                  <div className="mt-0.5 break-all font-mono text-[10.5px] text-faint">
                    {user.email}
                  </div>
                  {authError ? (
                    <div className="mt-1.5 rounded-md bg-amber/10 px-2 py-1 text-[10.5px] text-amber">
                      {authError}
                    </div>
                  ) : null}
                </div>
                <button
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[12.5px] text-dim transition hover:bg-bg2"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/portal";
                    }
                    setAccountOpen(false);
                  }}
                >
                  <span>前往租户自服务后台</span>
                  <svg className="h-3.5 w-3.5 text-faint"><use href="#w-external" /></svg>
                </button>
                <button
                  disabled={logoutLoading}
                  className="flex w-full items-center justify-between border-t border-line px-3 py-2.5 text-left text-[12.5px] text-red-500 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                  onClick={handleLogout}
                >
                  <span>{logoutLoading ? "退出中…" : "退出登录"}</span>
                  <svg className="h-3.5 w-3.5"><use href="#w-logout" /></svg>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={onRequestLogin}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange to-violet px-3.5 text-[12.5px] font-semibold text-white transition active:scale-[0.99]"
        >
          <svg className="h-4 w-4"><use href="#w-user" /></svg>
          登录
        </button>
      )}
    </header>
  );
}
