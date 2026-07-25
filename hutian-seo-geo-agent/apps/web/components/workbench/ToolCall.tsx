"use client";

import { useEffect, useState } from "react";
import type { ToolCallState } from "@/lib/streamReducer";

/**
 * 工具调用块.  ← FR-W02 / UX-01 / UX-07
 *
 * 状态机：running（spinner）→ done（✓ + 耗时）。
 * 旧块自动折叠（UX-07）：当 isLatest 变为 false 时自动折叠，可手动点击展开。
 * 输出区按工具类型渲染：checks 列表 / meters 仪表 / citations 引用分布。
 */

interface ToolCallProps {
  tool: ToolCallState;
  isLatest: boolean;
}

export default function ToolCall({ tool, isLatest }: ToolCallProps) {
  const [expanded, setExpanded] = useState(true);

  // UX-07: 不再是最新工具时自动折叠
  useEffect(() => {
    if (!isLatest && tool.status === "done") {
      setExpanded(false);
    }
  }, [isLatest, tool.status]);

  const running = tool.status === "running";

  return (
    <div className="animate-fade-in-up px-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
          running
            ? "border-amber/40 bg-amber/5"
            : tool.ok
              ? "border-line bg-bg1 hover:border-line2"
              : "border-red/40 bg-red/5"
        }`}
      >
        {/* 状态图标 */}
        <span className="grid h-7 w-7 shrink-0 place-items-center">
          {running ? (
            <span
              className="h-4 w-4 rounded-full border-2 border-amber/30 border-t-amber"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          ) : tool.ok ? (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-green/15 text-green">
              <svg className="h-3 w-3"><use href="#w-check" /></svg>
            </span>
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-red/15 text-red">
              <svg className="h-3 w-3"><use href="#w-x" /></svg>
            </span>
          )}
        </span>

        {/* 名称 + 参数 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] font-semibold text-text">
              {tool.name}
            </span>
            {running && (
              <span className="font-mono text-[10px] text-amber">running…</span>
            )}
            {!running && tool.durationMs != null && (
              <span className="font-mono text-[10px] text-faint">
                {(tool.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <div className="truncate font-mono text-[11px] text-faint">
            {tool.args}
          </div>
        </div>

        {/* 展开箭头 */}
        {!running && !!tool.output && (
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-faint transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <use href="#w-chev" />
          </svg>
        )}
      </button>

      {/* 输出区 */}
      {expanded && !running && !!tool.output && (
        <ToolOutput output={tool.output} />
      )}
    </div>
  );
}

/** 按工具输出结构渲染：checks / meters / citations / 通用 */
function ToolOutput({ output }: { output: unknown }) {
  const data = output as Record<string, unknown>;

  return (
    <div className="animate-fade-in-up mt-1.5 ml-10 space-y-2.5 rounded-lg border border-line bg-bg2/50 p-3">
      {/* checks 列表（entity_rename / run_diagnosis / edit_file / submit_sitemap） */}
      {Array.isArray(data.checks) && (
        <div className="space-y-1.5">
          {(data.checks as Array<{ ok: boolean; text: string }>).map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]">
              <svg
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                  c.ok ? "text-green" : "text-red"
                }`}
              >
                <use href={c.ok ? "#w-check" : "#w-x"} />
              </svg>
              <span className="text-dim" dangerouslySetInnerHTML={{ __html: c.text }} />
            </div>
          ))}
        </div>
      )}

      {/* meters 仪表（run_diagnosis 双评分） */}
      {Array.isArray(data.meters) && (
        <div className="grid grid-cols-2 gap-3">
          {(data.meters as Array<{ label: string; value: number; color: string }>).map(
            (m, i) => (
              <div key={i} className="rounded-lg border border-line bg-bg1 p-2.5">
                <div className="mb-1.5 text-[11px] text-faint">{m.label}</div>
                <div className="flex items-end gap-1.5">
                  <span
                    className={`font-grotesk text-2xl font-bold ${
                      m.color === "amber" ? "text-amber" : "text-teal"
                    }`}
                  >
                    {m.value}
                  </span>
                  <span className="mb-0.5 text-[11px] text-faint">/100</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-bg3">
                  <div
                    className={`h-full rounded-full ${
                      m.color === "amber"
                        ? "bg-gradient-to-r from-amber to-amber2"
                        : "bg-gradient-to-r from-teal to-green"
                    }`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* citations 引用分布（trace_citations） */}
      {Array.isArray(data.citations) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-faint">AI 引用来源分布</span>
            <span className="font-mono text-violet">
              总量 {data.total as number} · {data.sentiment as string} · 增速 {data.growth as string}
            </span>
          </div>
          <div className="flex h-6 overflow-hidden rounded-lg">
            {(data.citations as Array<{ engine: string; share: number; tag: string; note: string }>).map(
              (c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border-r border-bg0 text-[10px] font-bold text-white last:border-r-0"
                  style={{
                    width: `${c.share}%`,
                    background: ENGINE_COLORS[c.tag] ?? "#6A3FC5",
                  }}
                  title={`${c.engine} · ${c.share}% · ${c.note}`}
                >
                  {c.share >= 12 ? `${c.share}%` : ""}
                </div>
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {(data.citations as Array<{ engine: string; share: number; tag: string }>).map(
              (c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10.5px] text-dim">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: ENGINE_COLORS[c.tag] ?? "#6A3FC5" }}
                  />
                  {c.engine} {c.share}%
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ENGINE_COLORS: Record<string, string> = {
  ds: "#6A3FC5",
  gpt: "#10A37F",
  kimi: "#1D2129",
  oth: "#86909C",
};
