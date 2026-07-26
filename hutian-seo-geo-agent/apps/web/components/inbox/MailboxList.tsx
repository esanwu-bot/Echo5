"use client";

import type { EmailMeta } from "@hutian/agent-protocol";

/**
 * 左栏：邮箱分类导航. ← PRD §4.3
 *
 * 收件箱 / 待我批复 / 已发送 / 归档（周报、已归档）。
 * 计数实时更新自 mails 状态。
 */
interface MailboxListProps {
  mails: EmailMeta[];
}

const CATEGORIES = [
  { id: "inbox",   label: "收件箱",   icon: "i-inbox", match: (m: EmailMeta) => true },
  { id: "approve", label: "待我批复", icon: "i-clock", match: (m: EmailMeta) => m.category === "approve" },
  { id: "sent",    label: "已发送",   icon: "i-send",  match: (m: EmailMeta) => m.from === "me" },
] as const;

const ARCHIVE = [
  { id: "report", label: "周报",     icon: "i-chart", match: (m: EmailMeta) => m.category === "report" },
  { id: "arch",   label: "已归档",   icon: "i-arch",  match: (m: EmailMeta) => m.category === "done" },
] as const;

export default function MailboxList({ mails }: MailboxListProps) {
  const count = (match: (m: EmailMeta) => boolean) =>
    mails.filter(match).length;
  const unread = mails.filter((m) => m.unread).length;

  return (
    <nav className="hidden w-56 flex-shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-line bg-bg1 p-3 lg:flex">
      {/* 派活按钮 */}
      <button className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-amber to-amber2 py-2.5 text-[13.5px] font-bold text-white shadow-[0_4px_14px_rgba(247,114,52,0.28)] transition hover:-translate-y-px hover:shadow-[0_8px_22px_rgba(247,114,52,0.38)]">
        <svg className="h-3.5 w-3.5"><use href="#i-pen" /></svg>
        给 Agent 派活
      </button>

      {CATEGORIES.map((cat) => {
        const c = count(cat.match);
        const isHot = cat.id === "inbox" && unread > 0;
        return (
          <button
            key={cat.id}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-dim transition hover:bg-bg2"
          >
            <svg className="h-4 w-4 opacity-85"><use href={`#${cat.icon}`} /></svg>
            <span className="flex-1 text-left">{cat.label}</span>
            {c > 0 && (
              <span className={`rounded-full px-2 py-px font-mono text-[11px] ${
                isHot
                  ? "bg-amber text-white"
                  : "bg-bg2 text-dim"
              }`}>
                {c}
              </span>
            )}
          </button>
        );
      })}

      <div className="px-3 pb-1.5 pt-3.5 text-[10.5px] font-bold tracking-wider text-faint">
        归档
      </div>

      {ARCHIVE.map((cat) => {
        const c = count(cat.match);
        return (
          <button
            key={cat.id}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-dim transition hover:bg-bg2"
          >
            <svg className="h-4 w-4 opacity-85"><use href={`#${cat.icon}`} /></svg>
            <span className="flex-1 text-left">{cat.label}</span>
            {c > 0 && (
              <span className="rounded-full bg-bg2 px-2 py-px font-mono text-[11px] text-dim">
                {c}
              </span>
            )}
          </button>
        );
      })}

      <div className="mt-auto border-t border-line pt-3 text-[11.5px] leading-relaxed text-dim">
        壶天 SEO Agent · <strong className="text-text">在线</strong><br />
        下次周报 周一 09:00
      </div>
    </nav>
  );
}
