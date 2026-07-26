"use client";

import type { EmailMeta } from "@hutian/agent-protocol";

/**
 * 中栏：邮件列表. ← PRD §4.3
 *
 * 列表头（计数 + 过滤器）+ 邮件卡片滚动区。
 */

type Filter = "all" | "approve" | "diag" | "report" | "unread";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all",     label: "全部" },
  { id: "approve", label: "待批复" },
  { id: "diag",    label: "诊断" },
  { id: "report",  label: "周报" },
  { id: "unread",  label: "未读" },
];

const CATEGORY_LABEL: Record<EmailMeta["category"], string> = {
  approve: "待批复",
  diag:    "诊断",
  report:  "周报",
  done:    "完成",
};

interface MailListProps {
  mails: EmailMeta[];
  allMailsCount: number;
  unreadCount: number;
  selectedId: string | null;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
  onSelectMail: (id: string) => void;
}

export default function MailList({
  mails,
  allMailsCount,
  unreadCount,
  selectedId,
  filter,
  onFilterChange,
  onSelectMail,
}: MailListProps) {
  return (
    <section className="flex w-80 flex-shrink-0 flex-col border-r border-line bg-bg2 min-h-0 md:w-80 sm:w-72">
      {/* 列表头 */}
      <div className="border-b border-line px-4 pb-3 pt-4">
        <h2 className="flex items-center gap-2 font-grotesk text-[18px] font-bold">
          收件箱
          <span className="font-mono text-[12px] font-medium text-dim">
            {allMailsCount} 封 · {unreadCount} 未读
          </span>
        </h2>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`rounded-full border px-2.5 py-1 text-[12px] transition ${
                filter === f.id
                  ? "border-text bg-text text-bg1"
                  : "border-line bg-bg1 text-dim hover:border-line2 hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 邮件滚动区 */}
      <div className="flex-1 overflow-y-auto">
        {mails.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-faint">
            这个分类暂时没有反馈
          </div>
        ) : (
          mails.map((m) => {
            const isSelected = m.id === selectedId;
            const isUnread = m.unread;
            const catLabel = CATEGORY_LABEL[m.category];
            const catColor =
              m.category === "approve" ? "text-amber bg-amber/10" :
              m.category === "diag"    ? "text-blue bg-blue/10" :
              m.category === "report"  ? "text-violet bg-violet/10" :
              "text-green bg-green/10";
            return (
              <button
                key={m.id}
                onClick={() => onSelectMail(m.id)}
                className={`relative flex w-full gap-3 border-b border-line px-4 py-3.5 text-left transition hover:bg-bg1 ${
                  isSelected ? "bg-bg1" : ""
                }`}
              >
                {isSelected && (
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-amber" />
                )}
                {/* 头像 */}
                <div
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px] text-[13px] font-extrabold text-white ${
                    m.from === "agent"
                      ? "bg-gradient-to-br from-amber to-amber2"
                      : "bg-gradient-to-br from-teal to-blue"
                  }`}
                >
                  {m.from === "agent" ? "壶" : "我"}
                </div>
                {/* 主体 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate text-[13px] ${
                      isUnread ? "font-bold text-text" : "text-dim"
                    }`}>
                      {m.fromName}
                    </span>
                    <span className="ml-auto flex-shrink-0 font-mono text-[11px] text-faint">
                      {m.time}
                    </span>
                  </div>
                  <div className={`mt-0.5 truncate text-[13.5px] ${
                    isUnread ? "font-bold text-text" : "text-dim"
                  }`}>
                    {m.subject}
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px] text-faint">
                    {m.snippet}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {isUnread && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber shadow-[0_0_0_3px_rgba(247,114,52,0.15)]" />
                    )}
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-semibold ${catColor}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {catLabel}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
