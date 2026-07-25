"use client";

import type { StreamState, PanelTab } from "@/lib/streamReducer";
import type { DiffData, ArtifactData } from "@hutian/agent-protocol";

/**
 * 右栏面板.  ← FR-W06 Diff 联动 / FR-W07 终端与产物
 *
 * 四标签：Diff / Preview / Terminal / Artifacts。
 * activePanel 由 streamReducer 管理（diff/artifact 事件自动切换）。
 * 响应式（NFR-03）：< 1240px 隐藏右栏。
 */

interface RightPanelProps {
  state: StreamState;
  onTabChange: (tab: PanelTab) => void;
}

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: "diff", label: "Diff", icon: "w-diff" },
  { id: "preview", label: "Preview", icon: "w-eye" },
  { id: "term", label: "Terminal", icon: "w-term" },
  { id: "arts", label: "Artifacts", icon: "w-pkg" },
];

export default function RightPanel({ state, onTabChange }: RightPanelProps) {
  const latestDiff = state.diffs[state.diffs.length - 1];

  return (
    <aside className="hidden w-[400px] shrink-0 flex-col border-l border-line bg-bg1/60 xl:flex">
      {/* 标签栏 */}
      <div className="flex items-center border-b border-line bg-bg1/80">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] font-medium transition ${
              state.activePanel === t.id
                ? "text-amber"
                : "text-faint hover:text-dim"
            }`}
          >
            <svg className="h-3.5 w-3.5"><use href={`#${t.icon}`} /></svg>
            {t.label}
            {state.activePanel === t.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber" />
            )}
            {/* 未读计数 */}
            {t.id === "diff" && state.diffs.length > 0 && (
              <span className="ml-0.5 rounded bg-bg3 px-1 text-[9px] font-mono text-dim">
                {state.diffs.length}
              </span>
            )}
            {t.id === "arts" && state.artifacts.length > 0 && (
              <span className="ml-0.5 rounded bg-bg3 px-1 text-[9px] font-mono text-dim">
                {state.artifacts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {state.activePanel === "diff" && (
          <DiffView diff={latestDiff} />
        )}
        {state.activePanel === "preview" && <PreviewView />}
        {state.activePanel === "term" && (
          <TerminalView lines={state.terminalLines} />
        )}
        {state.activePanel === "arts" && (
          <ArtifactsView artifacts={state.artifacts} />
        )}
      </div>
    </aside>
  );
}

/* ════════ Diff ════════ */
function DiffView({ diff }: { diff?: DiffData }) {
  if (!diff) {
    return (
      <EmptyState
        icon="w-diff"
        title="暂无文件变更"
        desc="Agent 执行 edit_file 后，差异将在此高亮显示"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 文件头 */}
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-violet"><use href="#w-edit" /></svg>
          <span className="font-mono text-[12px] text-text">{diff.file}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-green">+{diff.additions}</span>
          <span className="text-red">-{diff.deletions}</span>
        </div>
      </div>

      {/* 差异内容 */}
      <div
        className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed"
        style={{ animation: "fade-in-up 0.4s" }}
      >
        {diff.lines.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.kind === "add"
                ? "bg-green/8"
                : line.kind === "del"
                  ? "bg-red/8"
                  : ""
            }`}
          >
            <span className="w-10 shrink-0 select-none border-r border-line px-2 text-right text-faint">
              {line.no}
            </span>
            <span
              className={`px-3 ${
                line.kind === "add"
                  ? "text-green"
                  : line.kind === "del"
                    ? "text-red"
                    : "text-dim"
              }`}
            >
              {line.kind === "add" ? "+" : line.kind === "del" ? "−" : " "}
              {line.text}
            </span>
          </div>
        ))}
      </div>

      {/* 底部操作 */}
      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <button className="flex items-center gap-1.5 rounded-md border border-line bg-bg2 px-2.5 py-1 text-[11px] text-dim transition hover:text-text">
          <svg className="h-3 w-3"><use href="#w-rollback" /></svg>
          回滚
        </button>
        <button className="flex items-center gap-1.5 rounded-md border border-line bg-bg2 px-2.5 py-1 text-[11px] text-dim transition hover:text-text">
          <svg className="h-3 w-3"><use href="#w-download" /></svg>
          下载 patch
        </button>
      </div>
    </div>
  );
}

/* ════════ Preview (SERP 预览) ════════ */
function PreviewView() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 font-mono text-[10px] tracking-wider text-faint">
        搜索引擎结果页预览（SERP）
      </div>
      <div
        className="rounded-lg border p-4"
        style={{
          background: "var(--serp-bg)",
          color: "var(--serp-text)",
          borderColor: "var(--line)",
        }}
      >
        {/* Google 风格结果 */}
        <div className="mb-1 flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber to-amber2 text-[10px] font-bold text-white">
            壶
          </div>
          <div>
            <div className="text-[13px] font-medium" style={{ color: "var(--serp-text)" }}>
              壶天半导体
            </div>
            <div className="text-[11px]" style={{ color: "var(--serp-sub)" }}>
              hutian.com
            </div>
          </div>
        </div>
        <div className="mb-1 text-[16px]" style={{ color: "var(--serp-link)" }}>
          半导体二极管 — 壶天 | 高性能工业级半导体器件
        </div>
        <div className="text-[12.5px] leading-relaxed" style={{ color: "var(--serp-sub)" }}>
          壶天半导体二极管，适用于工业控制与物联网。SKU: TC-DIODE-001，GTIN:
          6970000000017。库存现货，¥12.80 起，支持批量采购。
        </div>
        <div className="mt-2 flex gap-1.5">
          {["工业级", "InStock", "¥12.80"].map((p) => (
            <span
              key={p}
              className="rounded px-1.5 py-0.5 text-[10px]"
              style={{
                background: "var(--serp-pill)",
                color: "var(--serp-sub)",
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* AI 引擎引用预览 */}
      <div className="mt-4 mb-3 font-mono text-[10px] tracking-wider text-faint">
        生成式引擎引用预览（GEO）
      </div>
      <div className="rounded-lg border border-line bg-bg2 p-4">
        <div className="mb-2 flex items-center gap-2">
          <svg className="h-4 w-4 text-violet"><use href="#w-robot" /></svg>
          <span className="text-[12px] font-medium text-text">
            AI 引擎如何引用壶天
          </span>
        </div>
        <div className="rounded-lg border border-line bg-bg1 p-3 text-[12.5px] leading-relaxed text-dim">
          <span className="text-faint">"</span>
          <strong className="text-text">壶天</strong>（Hutian）是一家
          <strong className="text-text">半导体器件</strong>制造商，主营
          高性能二极管产品，SKU <code className="rounded bg-bg3 px-1 font-mono text-[11px] text-amber">TC-DIODE-001</code>，
          GTIN <code className="rounded bg-bg3 px-1 font-mono text-[11px] text-amber">6970000000017</code>。
          其产品适用于
          <strong className="text-text">工业控制</strong>与
          <strong className="text-text">物联网</strong>场景。
          <span className="text-faint">"</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10.5px] text-faint">
          <svg className="h-3 w-3 text-green"><use href="#w-check" /></svg>
          结构化数据已校验 · 富媒体结果资格 ✓
        </div>
      </div>
    </div>
  );
}

/* ════════ Terminal ════════ */
function TerminalView({
  lines,
}: {
  lines: { id: string; html: string }[];
}) {
  return (
    <div
      className="h-full overflow-y-auto p-3 font-mono text-[12px] leading-relaxed"
      style={{ background: "var(--term-bg)", color: "var(--term-text)" }}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[10px] opacity-50">
        <span className="h-2 w-2 rounded-full bg-red/70" />
        <span className="h-2 w-2 rounded-full bg-amber/70" />
        <span className="h-2 w-2 rounded-full bg-green/70" />
        <span className="ml-2">hutian@workbench</span>
      </div>
      {lines.length === 0 ? (
        <div className="opacity-40">$ 等待命令…</div>
      ) : (
        lines.map((l) => (
          <div
            key={l.id}
            className="animate-fade-in-up"
            dangerouslySetInnerHTML={{ __html: l.html }}
          />
        ))
      )}
      <div className="flex items-center">
        <span className="text-teal">$</span>
        <span
          className="ml-1.5 inline-block h-4 w-2 bg-current"
          style={{ animation: "blink-cursor 1s steps(1) infinite" }}
        />
      </div>
    </div>
  );
}

/* ════════ Artifacts ════════ */
function ArtifactsView({ artifacts }: { artifacts: ArtifactData[] }) {
  if (artifacts.length === 0) {
    return (
      <EmptyState
        icon="w-pkg"
        title="暂无产物"
        desc="Agent 生成的文件将在此列出，可下载或回滚"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="mb-2 font-mono text-[10px] tracking-wider text-faint">
        产物列表（{artifacts.length}）
      </div>
      <div className="space-y-2">
        {artifacts.map((a, i) => (
          <div
            key={i}
            className="animate-fade-in-up flex items-center gap-3 rounded-lg border border-line bg-bg2 p-2.5"
          >
            <div
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                a.kind === "add" ? "bg-green/15 text-green" : "bg-violet/15 text-violet"
              }`}
            >
              <svg className="h-4 w-4">
                <use href={a.kind === "add" ? "#w-plus" : "#w-edit"} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[12px] text-text">
                {a.file}
              </div>
              <div className="flex items-center gap-2 text-[10.5px] text-faint">
                <span>{a.size}</span>
                <span>·</span>
                <span className={a.status === "ok" ? "text-green" : "text-amber"}>
                  {a.status}
                </span>
              </div>
            </div>
            <button className="grid h-7 w-7 place-items-center rounded-md border border-line text-faint transition hover:text-text">
              <svg className="h-3.5 w-3.5"><use href="#w-download" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════ Empty State ════════ */
function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl border border-line bg-bg2 text-faint">
        <svg className="h-5 w-5"><use href={`#${icon}`} /></svg>
      </div>
      <div className="text-[13px] font-medium text-dim">{title}</div>
      <div className="mt-1 text-[11.5px] text-faint">{desc}</div>
    </div>
  );
}
