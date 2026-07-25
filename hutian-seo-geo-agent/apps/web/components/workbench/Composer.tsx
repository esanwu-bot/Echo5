"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 输入区.  ← FR-W08 输入与模式
 *
 * - 首轮 done 后可编辑（agentRunning 时禁用）
 * - Enter 发送（Shift+Enter 换行）
 * - Auto / Manual 模式切换
 */

interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

type Mode = "auto" | "manual";

export default function Composer({ disabled, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 自适应高度
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
  };

  return (
    <div className="border-t border-line bg-bg1/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        {/* 模式切换 */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-line bg-bg2 p-0.5">
            {(["auto", "manual"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  mode === m
                    ? m === "auto"
                      ? "bg-amber/15 text-amber"
                      : "bg-blue/15 text-blue"
                    : "text-faint hover:text-dim"
                }`}
              >
                {m === "auto" ? (
                  <svg className="h-3 w-3"><use href="#w-zap" /></svg>
                ) : (
                  <svg className="h-3 w-3"><use href="#w-tune" /></svg>
                )}
                {m === "auto" ? "Auto" : "Manual"}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-faint">
            {mode === "auto"
              ? "Agent 自主编排，工具全自动执行"
              : "每步工具调用需确认"}
          </span>
        </div>

        {/* 输入框 */}
        <div
          className={`flex items-end gap-2 rounded-xl border bg-bg2 p-2 transition ${
            disabled
              ? "border-line opacity-60"
              : "border-line2 focus-within:border-amber/50 focus-within:shadow-glow"
          }`}
        >
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={disabled}
            rows={1}
            placeholder={
              disabled
                ? "Agent 执行中…"
                : mode === "auto"
                  ? "描述你的 SEO/GEO 目标，Agent 自主完成…"
                  : "输入指令，Manual 模式下每步需确认…"
            }
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] text-text placeholder:text-faint focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber to-amber2 text-white shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            aria-label="发送"
          >
            <svg className="h-4 w-4"><use href="#w-send" /></svg>
          </button>
        </div>

        {/* 底部提示 */}
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10.5px] text-faint">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-bg2 px-1 font-mono text-[9px]">Enter</kbd>
              发送
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-bg2 px-1 font-mono text-[9px]">⇧+Enter</kbd>
              换行
            </span>
          </div>
          <span className="font-mono">{text.length} chars</span>
        </div>
      </div>
    </div>
  );
}
