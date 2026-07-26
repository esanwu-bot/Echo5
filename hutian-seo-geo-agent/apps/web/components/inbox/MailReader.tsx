"use client";

import { useEffect, useRef } from "react";
import type { EmailMeta, EmailLetter } from "@hutian/agent-protocol";
import EvidenceCard from "./EvidenceCard";

/**
 * 右栏：邮件阅读器. ← PRD §4.3
 *
 * - 空态：未选邮件
 * - 已选：邮件头 + 线程（多封信） + 回复框
 * - 处理中：processing 占位条（由 reducer.processing 驱动）
 * - 回执：approval_ack 追加新信件到线程末尾
 */

interface MailReaderProps {
  mail: EmailMeta | null;
  thread: EmailLetter[];
  processing: { mailId: string; text: string } | null;
  replyDraft: string;
  onReplyDraftChange: (text: string) => void;
  onApproval: (action: string, label: string, replyText?: string) => void;
  onSendReply: () => void;
}

export default function MailReader({
  mail,
  thread,
  processing,
  replyDraft,
  onReplyDraftChange,
  onApproval,
  onSendReply,
}: MailReaderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 线程变化时滚到底（处理中/回执出现时）
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [thread, processing]);

  if (!mail) {
    return (
      <main className="flex-1 overflow-y-auto bg-bg0">
        <div className="grid h-full place-items-center text-center text-faint">
          <div>
            <svg className="mx-auto mb-3 h-10 w-10 opacity-40"><use href="#i-inbox" /></svg>
            <div className="text-[14px]">
              选择一封反馈开始阅读
              <br />
              <span className="text-[12px]">
                Agent 的发现、建议与周报都会出现在这里
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 取线程最后一封（含 quick 选项）
  const last = thread[thread.length - 1];
  const quick = last?.quick ?? [];

  return (
    <main ref={scrollRef} className="flex-1 overflow-y-auto bg-bg0 min-w-0">
      <div className="mx-auto max-w-3xl px-6 py-7">
        {/* 邮件头 */}
        <div className="flex animate-rise items-start gap-3.5">
          <div
            className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl text-[15px] font-extrabold text-white ${
              mail.from === "agent"
                ? "bg-gradient-to-br from-amber to-amber2"
                : "bg-gradient-to-br from-teal to-blue"
            }`}
          >
            {mail.from === "agent" ? "壶" : "我"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-grotesk text-[22px] font-bold leading-tight tracking-tight">
              {mail.subject}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-semibold text-text">
                {mail.fromName}{" "}
                <small className="font-normal text-dim">
                  → {mail.from === "agent" ? "我" : "壶天 Agent"}
                </small>
              </span>
              <span className="font-mono text-[12px] text-faint">{mail.time}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-bg1 text-dim transition hover:border-line2 hover:bg-bg2 hover:text-text"
              title="标星"
            >
              <svg className="h-3.5 w-3.5"><use href="#i-star" /></svg>
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-bg1 text-dim transition hover:border-line2 hover:bg-bg2 hover:text-text"
              title="归档"
            >
              <svg className="h-3.5 w-3.5"><use href="#i-arch" /></svg>
            </button>
            <button
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-bg1 text-dim transition hover:border-line2 hover:bg-bg2 hover:text-text"
              title="删除"
            >
              <svg className="h-3.5 w-3.5"><use href="#i-trash" /></svg>
            </button>
          </div>
        </div>

        {/* 线程 */}
        <div className="mt-6 flex flex-col gap-4.5">
          {thread.map((letter, i) => (
            <Letter key={letter.id} letter={letter} delay={i * 0.08} />
          ))}

          {/* 处理中占位条 */}
          {processing && (
            <div className="flex animate-fly items-center gap-2.5 rounded-xl border border-dashed border-line2 bg-bg2 px-4 py-3 text-[13px] text-dim">
              <span className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-line2 border-t-amber" />
              {processing.text}
            </div>
          )}
        </div>

        {/* 回复框 */}
        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-bg1 animate-rise">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[12.5px] text-dim">
            <svg className="h-3.5 w-3.5 text-amber"><use href="#i-reply" /></svg>
            回复 <b className="text-text">{mail.from === "agent" ? "壶天 SEO Agent" : "此线程"}</b>
          </div>

          {/* 快捷批复按钮 */}
          {quick.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {quick.map((q) => {
                const cls =
                  q.kind === "ok"
                    ? "text-green border-green/30 bg-green/10"
                    : q.kind === "no"
                      ? "text-red border-red/25 bg-red/10"
                      : "text-blue border-blue/30 bg-blue/10";
                const icon = q.kind === "ok" ? "i-check" : q.kind === "no" ? "i-x" : "i-reply";
                return (
                  <button
                    key={q.action}
                    onClick={() => onApproval(q.action, q.label)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition hover:-translate-y-px hover:shadow ${cls}`}
                  >
                    <svg className="h-3 w-3"><use href={`#${icon}`} /></svg>
                    {q.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 文本框 */}
          <textarea
            value={replyDraft}
            onChange={(e) => onReplyDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                onSendReply();
              }
            }}
            placeholder="或直接打字追问 / 派活，例如：把 gtin 换成我们真实的条码…"
            className="min-h-16 w-full resize-none border-none bg-transparent px-4 py-3 font-sans text-[13.5px] leading-relaxed text-text outline-none placeholder:text-faint"
          />

          {/* 底部 */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <span className="font-mono text-[11px] text-faint">
              ⌘Enter 发送 · 批复会触发 Agent 执行并回执
            </span>
            <button
              onClick={onSendReply}
              disabled={!replyDraft.trim()}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber to-amber2 px-4 py-2 text-[13px] font-bold text-white shadow-[0_3px_12px_rgba(247,114,52,0.3)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(247,114,52,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <svg className="h-3.5 w-3.5"><use href="#i-send" /></svg>
              发送
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/** 单封信件 */
function Letter({ letter, delay }: { letter: EmailLetter; delay: number }) {
  return (
    <div
      className="animate-rise rounded-xl border border-line bg-bg1 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* 发信人 */}
      <div className="mb-3.5 flex items-center gap-2.5">
        <div
          className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-[12px] font-extrabold text-white ${
            letter.who === "agent"
              ? "bg-gradient-to-br from-amber to-amber2"
              : "bg-gradient-to-br from-teal to-blue"
          }`}
        >
          {letter.who === "agent" ? "壶" : "我"}
        </div>
        <b className="text-[13.5px] text-text">
          {letter.who === "agent" ? "壶天 SEO Agent" : "我（站长）"}
        </b>
        <span className="font-mono text-[11.5px] text-faint">{letter.when}</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
            letter.who === "agent"
              ? "bg-amber/10 text-amber"
              : "bg-teal/10 text-teal"
          }`}
        >
          {letter.badge}
        </span>
      </div>

      {/* 正文 — 原型用 HTML 字符串，这里用 dangerouslySetInnerHTML 保留富文本 */}
      <div
        className="text-content"
        dangerouslySetInnerHTML={{ __html: letter.textHtml }}
      />

      {/* 证据卡 */}
      {letter.evidence && letter.evidence.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {letter.evidence.map((e, i) => (
            <EvidenceCard key={i} data={e} />
          ))}
        </div>
      )}
    </div>
  );
}
