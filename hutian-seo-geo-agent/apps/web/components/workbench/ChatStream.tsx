"use client";

import { useEffect, useRef } from "react";
import type { StreamState } from "@/lib/streamReducer";
import { MarkdownRenderer } from "./MarkdownRenderer";
import Thinking from "./Thinking";
import ToolCall from "./ToolCall";
import PlanList from "./PlanList";
import StatCards from "./StatCards";

/**
 * 中栏对话流.  ← FR-W02 / FR-W03 / FR-W04 / FR-W05 / UX-02 / UX-06
 *
 * 按 state.timeline 顺序渲染消息气泡 + 工具块 + 计划清单 + 指标卡。
 * 自动滚动到底部；thinking 态显示三点动效。
 */

interface ChatStreamProps {
  state: StreamState;
  /** 当前 sessionId（null=全新会话未发送；非 null=已创建/切到历史会话） */
  sessionId?: string | null;
}

export default function ChatStream({ state, sessionId }: ChatStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新内容追加时自动滚动到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state.timeline.length, state.thinking, state.tools.length]);

  const lastToolId =
    state.tools.length > 0 ? state.tools[state.tools.length - 1].id : null;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto max-w-3xl space-y-3 py-4">
        {/* 空状态：两种情况分别渲染 */}
        {state.timeline.length === 0 && (
          sessionId ? (
            // 切到历史会话但 messages 为空（bridge 重启/内存蒸发）
            <div className="animate-fade-in-up px-4 py-8 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-bg3 text-faint">
                <svg className="h-6 w-6" width="24" height="24"><use href="#w-clock" /></svg>
              </div>
              <h2 className="font-grotesk text-base font-semibold text-dim">
                该会话的对话内容未持久化
              </h2>
              <p className="mt-1.5 text-[12px] text-faint">
                侧栏保留了标题、时间和工具数摘要，但对话正文存在 Agent 服务的内存里。
              </p>
              <p className="mt-0.5 text-[12px] text-faint">
                服务重启后正文会丢失——完整历史持久化（跨设备同步）待后续版本。
              </p>
              <p className="mt-3 text-[12px] text-dim">
                你可以在下方输入框继续对话，Agent 会基于当前 session 续接。
              </p>
            </div>
          ) : (
            // 全新会话（未发送首轮）
            <div className="animate-fade-in-up px-4 py-8 text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber to-amber2 text-white shadow-glow">
                <svg className="h-6 w-6" width="24" height="24"><use href="#w-logo" /></svg>
              </div>
              <h2 className="font-grotesk text-lg font-bold text-text">
                壶天 SEO/GEO 工作台
              </h2>
              <p className="mt-1.5 text-[13px] text-dim">
                用一句话下达意图，Agent 自主完成诊断—修复—提交—验证闭环
              </p>
              <div className="mt-4 rounded-lg border border-line bg-bg1 px-3 py-2 text-left text-[12px] text-faint">
                <div className="mb-1 font-medium text-dim">试试这些：</div>
                <ul className="space-y-1">
                  <li>· 诊断 https://example.com 的 SEO 情况</li>
                  <li>· 追踪「壶天」在 AI 引擎里的引用</li>
                  <li>· 把品牌从「天启芯」改为「壶天」</li>
                </ul>
              </div>
            </div>
          )
        )}

        {state.timeline.map((entry, i) => {
          if (entry.kind === "message") {
            const msg = state.messages.find((m) => m.id === entry.id);
            if (!msg) return null;
            return <MessageBubble key={`m-${i}`} msg={msg} />;
          }
          if (entry.kind === "tool") {
            const tool = state.tools.find((t) => t.id === entry.id);
            if (!tool) return null;
            return (
              <ToolCall
                key={`t-${i}`}
                tool={tool}
                isLatest={tool.id === lastToolId}
              />
            );
          }
          if (entry.kind === "plan") {
            return <PlanList key={`p-${i}`} items={state.planItems} />;
          }
          if (entry.kind === "stats") {
            return <StatCards key={`s-${i}`} items={state.stats} />;
          }
          return null;
        })}

        {state.thinking && <Thinking />}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
}: {
  msg: { role: "user" | "agent"; content: string; ts: string };
}) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`animate-fade-in-up flex items-start gap-2.5 px-4 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* 头像 */}
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
          isUser
            ? "bg-bg3 text-dim"
            : "bg-gradient-to-br from-amber to-amber2 text-white"
        }`}
      >
        <svg className="h-4 w-4">
          <use href={isUser ? "#w-chat" : "#w-robot"} />
        </svg>
      </div>

      {/* 气泡 */}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
          isUser
            ? "rounded-tr-sm border bg-[var(--bubble-user-bg)] text-text"
            : "rounded-tl-sm border border-line bg-bg1 text-text"
        }`}
        style={
          isUser
            ? { borderColor: "var(--bubble-user-bd)" }
            : undefined
        }
      >
        {isUser ? (
          <div>{msg.content}</div>
        ) : (
          <MarkdownRenderer content={msg.content} />
        )}
        <div
          className={`mt-1 font-mono text-[10px] text-faint ${
            isUser ? "text-right" : ""
          }`}
        >
          {msg.ts}
        </div>
      </div>
    </div>
  );
}
