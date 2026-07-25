"use client";

import { useEffect, useState } from "react";
import type { StreamState } from "@/lib/streamReducer";

/**
 * 底栏.  ← PRD IA: 分支/同步/工具进度/时钟
 *
 * 左：git 分支 + 同步状态。
 * 中：工具进度（done/total）。
 * 右：实时时钟。
 */

interface StatusBarProps {
  state: StreamState;
}

export default function StatusBar({ state }: StatusBarProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(
        `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`,
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const completed = state.tools.filter((t) => t.status === "done").length;
  const total = state.totalTools || state.tools.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <footer className="relative z-20 flex h-9 items-center gap-4 border-t border-line bg-bg1/80 px-4 text-[11px] text-faint backdrop-blur-xl">
      {/* 左：分支 */}
      <div className="flex items-center gap-1.5">
        <svg className="h-3 w-3 text-violet"><use href="#w-git" /></svg>
        <span className="font-mono">main</span>
      </div>

      {/* 同步 */}
      <div className="flex items-center gap-1.5">
        <svg className="h-3 w-3 text-green"><use href="#w-sync" /></svg>
        <span>已同步</span>
      </div>

      <div className="h-3 w-px bg-line" />

      {/* 中：工具进度 */}
      <div className="flex items-center gap-2">
        <svg className="h-3 w-3 text-amber"><use href="#w-zap" /></svg>
        <span className="font-mono">
          工具 {completed}/{total}
        </span>
        {total > 0 && (
          <div className="h-1 w-20 overflow-hidden rounded-full bg-bg3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber to-teal transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* 右：状态 + 时钟 */}
      {state.agentRunning && (
        <span className="flex items-center gap-1.5 text-amber">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          执行中
        </span>
      )}
      {state.done && (
        <span className="flex items-center gap-1.5 text-green">
          <svg className="h-3 w-3"><use href="#w-check" /></svg>
          完成
        </span>
      )}
      <div className="flex items-center gap-1.5">
        <svg className="h-3 w-3"><use href="#w-clock" /></svg>
        <span className="font-mono tabular-nums">{time}</span>
      </div>
    </footer>
  );
}
