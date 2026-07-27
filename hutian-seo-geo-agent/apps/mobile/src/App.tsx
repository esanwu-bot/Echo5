import { useCallback, useEffect, useState } from "react";
import { useAgentSession } from "@/lib/useAgentSession";
import ChatStream from "@/components/workbench/ChatStream";
import Composer from "@/components/workbench/Composer";
import WorkbenchIcons from "@/components/workbench/Icons";
import type { PanelTab, StreamState } from "@/lib/streamReducer";

/**
 * 移动壳入口 —— Capacitor WebView 渲染移动工作台。
 *
 * IA 重构（不是缩桌面三栏，见 docs/移动的技术选型.md）：
 * - 对话流 = 唯一主舞台（复用 ChatStream + Composer）
 * - 会话 = 侧滑抽屉（burger 按钮触发）+ 底部"会话"tab 双入口
 * - Diff/终端/产物 = 对话流内联卡 + 点击弹底部 sheet（复用 RightPanel 内容）
 * - 底部三 tab：工作台 / 会话 / 我的
 * - safe-area 适配刘海/全面屏
 */
type Tab = "work" | "sess" | "me";

export default function MobileApp() {
  const mode: "mock" | "sse" = (() => {
    if (typeof window === "undefined") return "mock";
    const m = (window as { __HUTIAN_DESKTOP_MODE__?: "mock" | "sse" })
      .__HUTIAN_DESKTOP_MODE__;
    return m ?? "mock";
  })();

  // baseURL: Capacitor 套壳下相对路径 /api/... 无法解析，需注入绝对 URL。
  // mock 模式不需要；sse 模式指向远程 BFF 或本地 sidecar。
  const baseURL = mode === "sse" ? (import.meta.env.VITE_API_BASE ?? "") : "";

  const { state, send, setPanel, startMock } = useAgentSession(mode, baseURL);
  const [tab, setTab] = useState<Tab>("work");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<PanelTab>("arts");

  // mock 模式自动播 demo
  useEffect(() => {
    if (mode === "mock") startMock();
  }, [mode, startMock]);

  const openSheet = useCallback((t: PanelTab) => {
    setSheetTab(t);
    setSheetOpen(true);
  }, []);

  return (
    <div className="workbench-bg flex h-screen flex-col overflow-hidden">
      <WorkbenchIcons />

      {/* 顶栏 */}
      <header
        className="safe-pt flex items-center gap-2.5 border-b border-line bg-bg1 px-4 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg2"
          aria-label="会话"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-dim" />
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-[17px] font-extrabold tracking-wide">壶天</span>
          <span className="text-[9px] font-semibold tracking-widest text-faint">SEO / GEO AGENT</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-lg border border-line bg-bg2 px-2 py-1 text-[11px] text-dim">
            DeepSeek V4
          </span>
          <span
            className={`h-2 w-2 rounded-full ${state.agentRunning ? "bg-amber" : "bg-green"}`}
            style={state.agentRunning ? { boxShadow: "0 0 8px var(--amber)" } : { boxShadow: "0 0 8px var(--green)" }}
          />
        </div>
      </header>

      {/* 主体 */}
      <main className="relative flex-1 overflow-hidden">
        {/* 工作台 tab */}
        {tab === "work" && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              <ChatStream state={state} />
            </div>
            <Composer
              disabled={state.agentRunning && !state.done}
              onSend={send}
            />
          </div>
        )}

        {/* 会话 tab */}
        {tab === "sess" && <SessionsList state={state} />}

        {/* 我的 tab */}
        {tab === "me" && <MePage />}

        {/* 侧滑抽屉 */}
        <SessionsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          state={state}
        />

        {/* 底部 sheet（产物/终端/Diff） */}
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          state={state}
          activeTab={sheetTab}
          onTabChange={setSheetTab}
        />
      </main>

      {/* 底部 tab */}
      <nav
        className="safe-pb flex border-t border-line bg-bg1"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <TabButton active={tab === "work"} onClick={() => setTab("work")} icon="💬" label="工作台" />
        <TabButton active={tab === "sess"} onClick={() => setTab("sess")} icon="🗂" label="会话" />
        <TabButton active={tab === "me"} onClick={() => setTab("me")} icon="👤" label="我的" />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] ${active ? "text-violet" : "text-faint"}`}
    >
      <span className="text-[18px]">{icon}</span>
      {label}
    </button>
  );
}

// ── 会话列表（tab 版 + 抽屉版共用数据）──
const SESSIONS = [
  { id: "s1", title: "诊断 tikchip.cn 产品页", sub: "run_diagnosis · 进行中", active: true },
  { id: "s2", title: "电动三轮车站 SEO 审计", sub: "已完成 · 4 工具", active: false },
  { id: "s3", title: "品牌更名 壶天 全站", sub: "entity_rename · 已写盘", active: false },
  { id: "s4", title: "FAQPage 结构化数据生成", sub: "已完成 · 2 工具", active: false },
  { id: "s5", title: "AI 引用追踪周报", sub: "已完成 · 1 工具", active: false },
];

function SessionsList({ state }: { state: StreamState }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pb-2 pt-4 text-[12px] tracking-widest text-faint">最近会话</div>
      {SESSIONS.map((s) => (
        <div
          key={s.id}
          className={`flex items-center justify-between border-b border-line px-4 py-3.5 ${s.active ? "border-l-2 border-l-violet bg-bg2" : ""}`}
        >
          <div>
            <div className="text-[14px] font-semibold">{s.title}</div>
            <div className="mt-0.5 text-[11px] text-faint">{s.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionsDrawer({ open, onClose, state }: { open: boolean; onClose: () => void; state: StreamState }) {
  return (
    <>
      <div
        className={`absolute inset-0 z-40 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute bottom-0 left-0 top-0 z-50 flex w-[80%] flex-col border-r border-line bg-bg1 transition-transform duration-280 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="safe-pt px-4 pb-3 pt-12 text-[13px] tracking-widest text-faint">会话</div>
        <div className="mx-4 mb-3 rounded-xl border border-dashed border-line py-3 text-center text-[13px] text-dim">
          ＋ 新建会话
        </div>
        <div className="flex-1 overflow-y-auto">
          {SESSIONS.map((s) => (
            <div
              key={s.id}
              className={`border-b border-line px-4 py-3 ${s.active ? "border-l-2 border-l-violet bg-bg2" : ""}`}
            >
              <div className="text-[14px] font-semibold">{s.title}</div>
              <div className="mt-0.5 text-[11px] text-faint">{s.sub}</div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

// ── 底部 sheet（产物/终端/Diff）──
function BottomSheet({
  open,
  onClose,
  state,
  activeTab,
  onTabChange,
}: {
  open: boolean;
  onClose: () => void;
  state: StreamState;
  activeTab: PanelTab;
  onTabChange: (t: PanelTab) => void;
}) {
  const tabs: { id: PanelTab; label: string }[] = [
    { id: "diff", label: "Diff" },
    { id: "term", label: "终端" },
    { id: "arts", label: "产物" },
  ];

  return (
    <>
      <div
        className={`absolute inset-0 z-40 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 z-50 flex max-h-[62%] flex-col rounded-t-2xl border-t border-line bg-bg1 transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto my-2 h-1 w-10 rounded bg-line" />
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex-1 py-2 text-[13px] ${activeTab === t.id ? "text-amber" : "text-faint"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="overflow-auto px-4 pb-4 text-[12px] text-dim">
          <SheetContent state={state} tab={activeTab} />
        </div>
      </div>
    </>
  );
}

function SheetContent({ state, tab }: { state: StreamState; tab: PanelTab }) {
  if (tab === "diff") {
    const diff = state.diffs[state.diffs.length - 1];
    if (!diff) return <div className="py-6 text-center text-faint">暂无 Diff</div>;
    return (
      <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
        {diff.file} ({diff.additions}+ {diff.deletions}-)
      </pre>
    );
  }
  if (tab === "term") {
    if (state.terminalLines.length === 0) return <div className="py-6 text-center text-faint">暂无终端输出</div>;
    return (
      <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
        {state.terminalLines.map((t) => t.html).join("\n")}
      </pre>
    );
  }
  // arts
  if (state.artifacts.length === 0) return <div className="py-6 text-center text-faint">暂无产物</div>;
  return (
    <div className="space-y-2">
      {state.artifacts.map((a, i) => (
        <div key={i} className="rounded-lg border border-line bg-bg2 p-2.5">
          <div className="font-semibold text-violet">{a.file}</div>
          <div className="mt-0.5 text-faint">{a.size} · {a.status} · {a.kind}</div>
        </div>
      ))}
    </div>
  );
}

// ── 我的 tab（接 M7 租户后台入口）──
function MePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pb-2 pt-4 text-[12px] tracking-widest text-faint">账户</div>
      <Row label="租户" value={<span>Acme 出海 <span className="rounded-full border border-green/30 bg-green/10 px-2 py-0.5 text-[11px] text-green">Pro</span></span>} />
      <Row label="工作空间" value="tikchip-trike" />
      <Row label="本月用量" value="128 / 500 次" />
      <div className="px-4 pb-2 pt-4 text-[12px] tracking-widest text-faint">设置</div>
      <Row label="席位与成员" value="›" />
      <Row label="凭证管理" value="›" />
      <Row label="审计日志" value="›" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
      <span className="text-[14px]">{label}</span>
      <span className="text-[13px] text-dim">{value}</span>
    </div>
  );
}
