"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * 顶栏.  ← PRD IA / FR-W09 主题切换 / FR-W10 模型路由
 *
 * 品牌 · 工作区 · 模型路由下拉 · 主题切换 · Agent 状态灯。
 * 模型切换会回调 onModelChange 并由父级弹 toast（FR-W10）。
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
}

export default function TopBar({
  agentRunning,
  model,
  onModelChange,
  onToggleSidebar,
}: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

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
      <div className="flex items-center gap-2 rounded-lg border border-line bg-bg2 px-3 py-1.5">
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
    </header>
  );
}
