"use client";

import { useState } from "react";

/**
 * 内容日历视图 — 展示 content_calendar_plan 工具生成的文章计划。
 *
 * 数据来源：content_calendar_plan 工具返回的 artifact（kind=content_calendar）。
 * 结构：{ articles[], total_articles, strategy, input_summary }
 *
 * 交互：
 *  - 文章列表：标题 / 目标关键词 / 摘要 / 预计字数 / 优先级
 *  - 点击行 → 详情抽屉（完整摘要 + 建议结构）
 *  - 底部操作栏：导出 CSV / 批量创建页面
 */

/* ── 类型 ─────────────────────────────────────────────────────── */
export interface CalendarArticle {
  title: string;
  target_keyword: string;
  summary: string;
  estimated_word_count: number;
  priority: "high" | "medium" | "low";
  suggested_structure?: string[];
}

export interface ContentCalendarData {
  articles: CalendarArticle[];
  total_articles: number;
  strategy: string;
  input_summary?: {
    keyword_count?: number;
    has_content_gap?: boolean;
    target_audience?: string;
    industry?: string;
  };
}

interface ContentCalendarProps {
  data: ContentCalendarData;
  onClose?: () => void;
}

/* ── 优先级颜色映射 ─────────────────────────────────────────── */
const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-red/15", text: "text-red", label: "高" },
  medium: { bg: "bg-amber/15", text: "text-amber", label: "中" },
  low: { bg: "bg-green/15", text: "text-green", label: "低" },
};

/* ── 主组件 ─────────────────────────────────────────────────── */
export default function ContentCalendar({ data, onClose }: ContentCalendarProps) {
  const [selectedArticle, setSelectedArticle] = useState<CalendarArticle | null>(null);

  const articles = data.articles || [];
  const totalWords = articles.reduce((sum, a) => sum + (a.estimated_word_count || 0), 0);

  return (
    <div className="flex h-full flex-col bg-bg1">
      {/* 顶栏 */}
      <div className="flex items-center justify-between border-b border-line bg-bg2 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-violet/15 text-violet">
            <svg className="h-4 w-4"><use href="#w-calendar" /></svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-text">内容日历</div>
            <div className="text-[11px] text-faint">{data.strategy || "文章计划"}</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md border border-line bg-bg3 px-3 py-1.5 text-[11px] text-dim transition hover:text-text"
          >
            关闭
          </button>
        )}
      </div>

      {/* Meta strip */}
      <div className="flex items-center gap-4 border-b border-line bg-bg2/50 px-4 py-2.5 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <svg className="h-3 w-3 text-violet"><use href="#w-pkg" /></svg>
          <span className="text-faint">文章数</span>
          <span className="font-mono font-semibold text-text">{data.total_articles || articles.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-3 w-3 text-teal"><use href="#w-edit" /></svg>
          <span className="text-faint">总字数</span>
          <span className="font-mono font-semibold text-text">{totalWords.toLocaleString()}</span>
        </div>
        {data.input_summary?.keyword_count && (
          <div className="flex items-center gap-1.5">
            <svg className="h-3 w-3 text-amber"><use href="#w-search" /></svg>
            <span className="text-faint">关键词</span>
            <span className="font-mono font-semibold text-text">{data.input_summary.keyword_count}</span>
          </div>
        )}
        {data.input_summary?.target_audience && (
          <div className="flex items-center gap-1.5">
            <svg className="h-3 w-3 text-green"><use href="#w-user" /></svg>
            <span className="text-faint">受众</span>
            <span className="font-mono text-text">{data.input_summary.target_audience}</span>
          </div>
        )}
      </div>

      {/* 文章列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 font-mono text-[10px] tracking-wider text-faint">
          文章计划（{articles.length}）
        </div>
        <div className="space-y-2">
          {articles.map((article, i) => {
            const priority = PRIORITY_COLORS[article.priority] || PRIORITY_COLORS.medium;
            return (
              <div
                key={i}
                onClick={() => setSelectedArticle(article)}
                className="animate-fade-in-up cursor-pointer rounded-lg border border-line bg-bg2 p-3 transition hover:border-violet/50 hover:bg-bg3"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-violet/10 font-mono text-[11px] text-violet">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="truncate text-[13px] font-medium text-text">
                        {article.title}
                      </div>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${priority.bg} ${priority.text}`}>
                        {priority.label}
                      </span>
                    </div>
                    <div className="mb-1.5 flex items-center gap-2 text-[11px]">
                      <span className="rounded bg-bg3 px-1.5 py-0.5 font-mono text-amber">
                        {article.target_keyword}
                      </span>
                      <span className="text-faint">·</span>
                      <span className="text-faint">{article.estimated_word_count?.toLocaleString()} 字</span>
                    </div>
                    <div className="line-clamp-2 text-[11.5px] leading-relaxed text-dim">
                      {article.summary}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-2 border-t border-line bg-bg2 px-4 py-2.5">
        <button className="flex items-center gap-1.5 rounded-md border border-line bg-bg3 px-3 py-1.5 text-[11px] text-dim transition hover:text-text">
          <svg className="h-3 w-3"><use href="#w-download" /></svg>
          导出 CSV
        </button>
        <button className="flex items-center gap-1.5 rounded-md bg-violet px-3 py-1.5 text-[11px] font-semibold text-bg1 transition hover:opacity-90">
          <svg className="h-3 w-3"><use href="#w-plus" /></svg>
          批量创建页面
        </button>
      </div>

      {/* 详情抽屉 */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[110] flex items-center justify-end bg-black/40" onClick={() => setSelectedArticle(null)}>
          <div
            className="h-full w-[420px] bg-bg1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "slide-in-right 0.3s" }}
          >
            <div className="flex h-full flex-col">
              {/* 抽屉头 */}
              <div className="flex items-center justify-between border-b border-line bg-bg2 px-4 py-3">
                <div className="text-[13px] font-semibold text-text">文章详情</div>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="rounded-md border border-line bg-bg3 px-2 py-1 text-[11px] text-dim transition hover:text-text"
                >
                  关闭
                </button>
              </div>

              {/* 抽屉内容 */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                  <div className="mb-1 text-[11px] text-faint">标题</div>
                  <div className="text-[14px] font-medium text-text">{selectedArticle.title}</div>
                </div>

                <div className="mb-4">
                  <div className="mb-1 text-[11px] text-faint">目标关键词</div>
                  <div className="rounded bg-bg3 px-2 py-1 font-mono text-[12px] text-amber">
                    {selectedArticle.target_keyword}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-1 text-[11px] text-faint">摘要</div>
                  <div className="text-[12.5px] leading-relaxed text-dim">{selectedArticle.summary}</div>
                </div>

                <div className="mb-4 flex items-center gap-4">
                  <div>
                    <div className="mb-1 text-[11px] text-faint">预计字数</div>
                    <div className="font-mono text-[13px] text-text">{selectedArticle.estimated_word_count?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-faint">优先级</div>
                    <div className={`rounded px-2 py-0.5 text-[12px] font-semibold ${PRIORITY_COLORS[selectedArticle.priority]?.bg} ${PRIORITY_COLORS[selectedArticle.priority]?.text}`}>
                      {PRIORITY_COLORS[selectedArticle.priority]?.label || "中"}
                    </div>
                  </div>
                </div>

                {selectedArticle.suggested_structure && selectedArticle.suggested_structure.length > 0 && (
                  <div>
                    <div className="mb-2 text-[11px] text-faint">建议结构</div>
                    <ul className="space-y-1">
                      {selectedArticle.suggested_structure.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-dim">
                          <span className="mt-0.5 text-violet">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 抽屉底部 */}
              <div className="border-t border-line bg-bg2 px-4 py-3">
                <button className="w-full rounded-md bg-violet py-2 text-[12px] font-semibold text-bg1 transition hover:opacity-90">
                  创建此页面
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
