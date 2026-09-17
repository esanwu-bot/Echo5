"use client";

import { useMemo, useState } from "react";

/**
 * 全站爬取审计报告视图 — 对齐 design/Qwen_html_20260917_zzbun1l9l.html。
 *
 * 数据来源：crawl_site_audit 工具返回的 artifact（kind=crawl_report）。
 * 结构：{ summary, issues[], pages[], sitemap_urls[], quota_used, truncated? }
 *
 * 交互：
 *  - Issues 维度：左列表 + 右详情（fix level L1/L2/L3/manual + 影响 URL 表）
 *  - Pages 维度：全站页面表（前 10 + 展开全部）
 *  - 行点击 → 钻取抽屉（status / redirect_chain / csr_empty / render 对比 / issues）
 *  - 修复按钮 → 闸门弹窗（G1 草稿确认 / G2 影响面拍板 / manual 人工判断）
 *  - 底部操作栏：导出 CSV / 生成优化待办 / 触发 render 对比
 */

/* ── 类型 ─────────────────────────────────────────────────────── */
export interface CrawlSummary {
  start_url: string;
  domain: string;
  urls_crawled: number;
  urls_total: number;
  urls_skipped_robots: number;
  csr_empty_pages: number;
  broken_links: number;
  orphan_pages: number;
  duplicate_titles: number;
  issue_count: number;
  p0_issues: number;
}

export interface CrawlIssue {
  type: string;
  severity: "P0" | "P1" | "P2" | "P3";
  affected_urls: string[];
  detail: string;
}

export interface CrawlPage {
  url: string;
  status: number;
  final_url?: string;
  redirect_chain?: string[];
  title?: string;
  content_length?: number;
  csr_empty?: boolean;
  internal_links?: number;
  issues?: string[];
}

export interface CrawlReportData {
  summary: CrawlSummary;
  issues: CrawlIssue[];
  pages: CrawlPage[];
  sitemap_urls?: string[];
  quota_used?: number;
  truncated?: boolean;
}

interface CrawlReportProps {
  data: CrawlReportData;
  onClose?: () => void;
}

/* ── Fix level 映射（issue type → L1/L2/L3/manual + 原因） ── */
const FIX_MAP: Record<
  string,
  { level: "L1" | "L2" | "L3" | "manual"; why: string }
> = {
  noindex: {
    level: "manual",
    why: "login 页 noindex 通常为 SEO 最佳实践（登录页不该被索引），疑似预期行为，需人工确认是否误报",
  },
  csr_empty_shell: {
    level: "L3",
    why: "CSR→SSR/预渲染迁移，全站架构级变更，不可自动回滚",
  },
  canonical_mismatch: {
    level: "L1",
    why: "canonical 模板硬编码单值；规则修复=每页 canonical=自身 final_url，确定性可回滚",
  },
  missing_h1: { level: "L2", why: "LLM 按页主题生成 h1 草稿，需人工确认" },
  missing_jsonld: {
    level: "L1",
    why: "补 Organization/FAQ JSON-LD，复用 write_structured_data，字段级可回滚",
  },
  nofollow: {
    level: "manual",
    why: "login 页 nofollow 通常预期，需人工确认",
  },
  duplicate_title: {
    level: "L2",
    why: "根因是双入口重定向重复，应统一入口 301 而非改 title",
  },
  missing_alt_text: {
    level: "L2",
    why: "LLM 按图片上下文生成 alt 草稿",
  },
  missing_meta_description: {
    level: "L2",
    why: "LLM 基于页面内容生成 description 草稿",
  },
  missing_title: { level: "L2", why: "LLM 基于 H1+path 生成 title 草稿" },
  missing_canonical: { level: "L1", why: "补 canonical=自身 URL，确定性可回滚" },
  missing_og_title: { level: "L3", why: "Open Graph 标签，社交分享优化" },
  title_too_long: { level: "L2", why: "LLM 精简 title 至 70 字符内" },
  title_too_short: { level: "L3", why: "LLM 扩充 title 至 10+ 字符" },
  meta_desc_too_long: { level: "L3", why: "LLM 精简 description 至 160 字符内" },
  multiple_h1: { level: "L2", why: "合并多余 H1，保留唯一主标题" },
  canonical_mismatch_: { level: "L1", why: "canonical 应指向页面自身 URL" },
  jsonld_missing_type: { level: "L1", why: "补 @type 字段" },
  invalid_jsonld: { level: "L1", why: "修复 JSON-LD 语法错误" },
  broken_links: { level: "L1", why: "修复或移除失效链接" },
  orphan_pages: { level: "L2", why: "添加内链指向孤立页，或确认其不需要被索引" },
};

const DEFAULT_FIX = { level: "L2" as const, why: "需人工评估修复方案" };

function getFix(type: string) {
  return FIX_MAP[type] ?? DEFAULT_FIX;
}

/* ── 颜色常量（对齐设计稿 dark + lime 主题） ── */
const C = {
  bg: "#0b0f0d",
  bg2: "#101613",
  bg3: "#151d19",
  lime: "#c8f55a",
  teal: "#5eead4",
  red: "#f0705f",
  amber: "#e6c15a",
  text: "#edefe6",
  dim: "#98a29a",
  line: "#24302a",
};

const sevColor: Record<string, string> = {
  P0: C.red,
  P1: C.amber,
  P2: C.teal,
  P3: C.dim,
};

const fixColor: Record<string, string> = {
  L1: C.lime,
  L2: C.amber,
  L3: C.red,
  manual: C.dim,
};

/* ── 组件 ─────────────────────────────────────────────────────── */
export default function CrawlReport({ data, onClose }: CrawlReportProps) {
  const { summary, issues, pages } = data;
  const [tab, setTab] = useState<"iss" | "pgs">("iss");
  const [selIssue, setSelIssue] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [drawerUrl, setDrawerUrl] = useState<string | null>(null);
  const [modal, setModal] = useState<"g1" | "g2" | "man" | null>(null);
  const [modalBody, setModalBody] = useState("");
  const [toast, setToast] = useState("");

  const sevCounts = useMemo(() => {
    const c = { P0: 0, P1: 0, P2: 0, P3: 0 };
    issues.forEach((i) => c[i.severity]++);
    return c;
  }, [issues]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };

  const handleFix = (type: string) => {
    const f = getFix(type);
    if (f.level === "L1") {
      showToast(`L1 自动执行 ${type} → G0 事后复验待命`);
    } else if (f.level === "L2") {
      setModalBody(`《${type}》LLM 草稿已生成，Approve 后执行并复验；Reject 丢弃。`);
      setModal("g1");
    } else if (f.level === "L3") {
      setModalBody(`《${type}》影响 ${summary.csr_empty_pages} 页 + 全站渲染架构；预期 CSR→SSR 后空壳清零。`);
      setModal("g2");
    } else {
      setModalBody(`《${type}》：${f.why}`);
      setModal("man");
    }
  };

  const exportCsv = () => {
    const lines: string[] = [];
    lines.push(["severity", "type", "count", "detail", "fix_level"].join(","));
    issues.forEach((i) => {
      lines.push(
        [i.severity, i.type, i.affected_urls.length, `"${i.detail.replace(/"/g, '""')}"`, getFix(i.type).level].join(","),
      );
    });
    const csv = "\ufeff" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crawl-audit-${summary.domain}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV 已导出");
  };

  const drawerPage = pages.find((p) => p.url === drawerUrl);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
      {/* 顶栏 */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: "rgba(16,22,19,.92)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>
          <span style={{ width: 25, height: 25, borderRadius: 7, background: C.lime, color: "#0b0f0d", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>E5</span>
          Echo5 <span style={{ color: C.dim, fontSize: 9.5, letterSpacing: 2 }}>CRAWL SITE AUDIT</span>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: C.teal }}>{summary.domain}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <Pill color={C.amber}>抽样 · max_urls={summary.urls_total}</Pill>
          {onClose && (
            <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, width: 28, height: 28, borderRadius: 8, cursor: "pointer" }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "22px 20px 90px" }}>
        {/* meta strip */}
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.bg2, padding: "13px 16px", fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.9, color: C.dim, marginBottom: 14 }}>
          <b style={{ color: C.text, fontWeight: 500 }}>start_url</b> <span style={{ color: C.teal }}>{summary.start_url}</span> · <b style={{ color: C.text }}>render_mode</b> static（playwright 按需 render 待接）<br />
          <b style={{ color: C.text }}>urls_crawled</b> {summary.urls_crawled} / <b style={{ color: C.text }}>urls_total</b> {summary.urls_total} · <b style={{ color: C.text }}>skipped_robots</b> {summary.urls_skipped_robots} · <b style={{ color: C.text }}>quota_used</b> {data.quota_used ?? "—"} · <b style={{ color: C.text }}>sitemaps</b> {(data.sitemap_urls ?? []).length} 子 sitemap 已发现<br />
          <b style={{ color: C.text }}>数据源</b> crawl_site_audit（真爬取）· <b style={{ color: C.text }}>字段语义</b> content_length=raw HTML 字节；csr 判定基于正文文本&lt;500 字符
        </div>

        {data.truncated && (
          <div style={{ border: "1px solid rgba(230,193,90,.4)", background: "rgba(230,193,90,.08)", borderRadius: 10, padding: "9px 14px", fontSize: 12, color: C.amber, marginBottom: 18, display: "flex", gap: 9, alignItems: "center" }}>
            ⚠ 本报告为抽样爬取（max_urls={summary.urls_total}）。sitemap 含 {(data.sitemap_urls ?? []).length} 个子 sitemap（products/series 等可能上千 URL），全站结论需扩大 max_urls 复跑。
          </div>
        )}

        {/* KPI 卡片 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 11, marginBottom: 16 }}>
          <Kpi label="爬取成功页" value={summary.urls_crawled} />
          <Kpi label="CSR 空壳页" value={summary.csr_empty_pages} tone="warn" />
          <Kpi label="BROKEN LINKS" value={summary.broken_links} tone="good" />
          <Kpi label="ORPHAN PAGES" value={summary.orphan_pages} tone="good" />
          <Kpi label="DUPLICATE TITLES" value={summary.duplicate_titles} tone="warn" />
          <Kpi label="P0 ISSUES" value={summary.p0_issues} tone="bad" />
        </div>

        {/* severity bar */}
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 6, border: `1px solid ${C.line}` }}>
          {(["P0", "P1", "P2", "P3"] as const).map((s) => {
            const total = issues.length || 1;
            const w = (sevCounts[s] / total) * 100;
            return <i key={s} style={{ display: "block", height: "100%", width: `${w}%`, background: sevColor[s] }} />;
          })}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 10.5, color: C.dim, marginBottom: 24, display: "flex", gap: 16 }}>
          {(["P0", "P1", "P2", "P3"] as const).map((s) => (
            <span key={s} style={{ color: sevColor[s] }}>■ {s} ×{sevCounts[s]}</span>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <TabBtn on={tab === "iss"} onClick={() => setTab("iss")}>Issues 维度（{issues.length}）</TabBtn>
          <TabBtn on={tab === "pgs"} onClick={() => setTab("pgs")}>Pages 全站（{pages.length}）</TabBtn>
        </div>

        {/* Issues 维度 */}
        {tab === "iss" && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.bg2, overflow: "hidden", alignSelf: "start" }}>
              {issues.map((iss, i) => (
                <div
                  key={iss.type}
                  onClick={() => setSelIssue(i)}
                  style={{
                    padding: "11px 14px",
                    cursor: "pointer",
                    borderLeft: `3px solid ${i === selIssue ? C.lime : "transparent"}`,
                    borderBottom: `1px solid ${C.line}`,
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                    background: i === selIssue ? C.bg3 : "transparent",
                  }}
                >
                  <Pill color={sevColor[iss.severity]}>{iss.severity}</Pill>
                  <span style={{ fontFamily: "monospace", fontSize: 11.5, flex: 1 }}>{iss.type}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: C.dim }}>×{iss.affected_urls.length}</span>
                </div>
              ))}
            </div>

            {issues[selIssue] && (
              <IssueDetail issue={issues[selIssue]} onFix={handleFix} onOpenPage={setDrawerUrl} domain={summary.domain} />
            )}
          </div>
        )}

        {/* Pages 维度 */}
        {tab === "pgs" && (
          <div>
            <PagesTable
              pages={showAll ? pages : pages.slice(0, 10)}
              onRowClick={setDrawerUrl}
            />
            {!showAll && pages.length > 10 && (
              <button
                onClick={() => setShowAll(true)}
                style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, fontSize: 11.5, padding: "7px 16px", borderRadius: 8, cursor: "pointer", marginTop: 10 }}
              >
                展开全部 {pages.length} 行
              </button>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "linear-gradient(0deg,#0b0f0d 75%,transparent)", padding: "14px 20px", display: "flex", gap: 10, justifyContent: "center", zIndex: 60 }}>
        <Btn gold onClick={exportCsv}>⬇ 导出 CSV</Btn>
        <Btn onClick={() => showToast("已生成优化待办 → 融合 workbench 优化页")}>生成优化待办 →</Btn>
        <Btn onClick={() => showToast(`v2：对 ${summary.csr_empty_pages} 个 csr_empty 页触发 playwright render 对比`)}>
          触发 render 对比（{summary.csr_empty_pages} 页）→
        </Btn>
      </div>

      {/* 钻取抽屉 */}
      {drawerPage && (
        <>
          <div
            onClick={() => setDrawerUrl(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(5,9,7,.6)", zIndex: 80 }}
          />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(560px,94vw)", background: C.bg, borderLeft: `1px solid ${C.line}`, zIndex: 90, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.line}`, background: C.bg2, display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ fontFamily: "monospace", fontSize: 13, wordBreak: "break-all", flex: 1, margin: 0 }}>{drawerPage.url}</h3>
              <button onClick={() => setDrawerUrl(null)} style={{ background: "none", border: `1px solid ${C.line}`, color: C.dim, width: 28, height: 28, borderRadius: 8, cursor: "pointer", flex: "0 0 auto" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
              <PageDetail page={drawerPage} issues={issues} />
            </div>
          </div>
        </>
      )}

      {/* 闸门弹窗 */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 200, background: "rgba(5,9,7,.7)" }} onClick={() => setModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg2, border: "1px solid rgba(200,245,90,.35)", borderRadius: 16, width: "90%", maxWidth: 430, padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, marginBottom: 9 }}>
              {modal === "g1" ? "Agent 草稿待确认（G1）" : modal === "g2" ? "影响面拍板（G2）" : "需人工判断（manual）"}
            </h3>
            <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6, marginBottom: 7 }}>{modalBody}</p>
            {modal === "g2" && (
              <p style={{ color: C.amber, fontSize: 12.5 }}>⚠ 全站架构级变更：不可自动回滚，建议先抽样 10 页人工抽检。</p>
            )}
            {modal === "man" && (
              <p style={{ fontSize: 12.5, color: C.dim }}>该 issue 可能是预期行为或需业务决策，Agent 不自动修改，仅记录判断结果。</p>
            )}
            <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
              {modal === "g1" ? (
                <>
                  <Btn onClick={() => { setModal(null); showToast("Reject → 草稿不落地"); }}>Reject</Btn>
                  <Btn gold onClick={() => { setModal(null); showToast("Approve → 执行 + G0 事后复验"); }}>Approve</Btn>
                </>
              ) : modal === "g2" ? (
                <>
                  <Btn onClick={() => { setModal(null); showToast("未拍板"); }}>取消</Btn>
                  <Btn gold onClick={() => { setModal(null); showToast("已拍板 → 进执行队列"); }}>确认拍板</Btn>
                </>
              ) : (
                <Btn gold onClick={() => { setModal(null); showToast("已记录人工判断"); }}>标记为预期/已知</Btn>
              )}
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", background: C.bg3, border: `1px solid ${C.lime}`, color: C.lime, padding: "9px 20px", borderRadius: 10, fontSize: 12.5, zIndex: 300 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── 子组件 ───────────────────────────────────────────────────── */
function Kpi({ label, value, tone }: { label: string; value: number; tone?: "warn" | "good" | "bad" }) {
  const color = tone === "bad" ? C.red : tone === "warn" ? C.amber : tone === "good" ? C.lime : C.text;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.bg2, padding: "13px 15px" }}>
      <div style={{ fontSize: 9.5, letterSpacing: 1.5, color: C.dim }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 600, marginTop: 3, color }}>{value}</div>
    </div>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 20px",
        borderRadius: "10px 10px 0 0",
        border: `1px solid ${on ? C.lime : C.line}`,
        borderBottom: "none",
        background: on ? "#070b09" : C.bg2,
        color: on ? C.lime : C.dim,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 9.5, padding: "2px 9px", borderRadius: 9, fontWeight: 600, whiteSpace: "nowrap", background: `${color}26`, color }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, gold }: { children: React.ReactNode; onClick: () => void; gold?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 18px",
        borderRadius: 9,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        border: `1px solid ${gold ? C.lime : C.line}`,
        background: gold ? C.lime : C.bg3,
        color: gold ? "#0b0f0d" : C.text,
        transition: ".2s",
      }}
    >
      {children}
    </button>
  );
}

function IssueDetail({ issue, onFix, onOpenPage, domain }: { issue: CrawlIssue; onFix: (type: string) => void; onOpenPage: (url: string) => void; domain: string }) {
  const f = getFix(issue.type);
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.bg2, padding: "18px 20px", alignSelf: "start" }}>
      <h3 style={{ fontFamily: "monospace", fontSize: 15, marginBottom: 8, display: "flex", gap: 9, alignItems: "center", marginTop: 0 }}>
        <Pill color={sevColor[issue.severity]}>{issue.severity}</Pill>
        {issue.type}
      </h3>
      <div style={{ fontSize: 12.5, color: C.dim, marginBottom: 14, lineHeight: 1.6 }}>{issue.detail}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "10px 13px", marginBottom: 14, fontSize: 12, color: C.dim }}>
        <Pill color={fixColor[f.level]}>{f.level}</Pill>
        <span style={{ flex: 1 }}>{f.why}</span>
        <button
          onClick={() => onFix(issue.type)}
          style={{ padding: "6px 14px", fontSize: 11.5, borderRadius: 9, fontWeight: 600, cursor: "pointer", border: `1px solid ${C.line}`, background: C.bg3, color: C.text }}
        >
          {f.level === "L1" ? "自动执行" : f.level === "L2" ? "生成草稿" : f.level === "L3" ? "影响面拍板" : "人工判断"}
        </button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
        <thead>
          <tr>
            <th style={{ background: C.bg3, textAlign: "left", padding: "8px 11px", fontSize: 10.5, color: C.dim, borderBottom: `1px solid ${C.line}` }}>#</th>
            <th style={{ background: C.bg3, textAlign: "left", padding: "8px 11px", fontSize: 10.5, color: C.dim, borderBottom: `1px solid ${C.line}` }}>affected url</th>
          </tr>
        </thead>
        <tbody>
          {issue.affected_urls.map((u, i) => (
            <tr key={i}>
              <td style={{ padding: "8px 11px", borderBottom: `1px solid ${C.line}` }}>{i + 1}</td>
              <td style={{ padding: "8px 11px", borderBottom: `1px solid ${C.line}` }}>
                <a
                  onClick={() => onOpenPage(u)}
                  style={{ color: C.teal, textDecoration: "none", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", cursor: "pointer" }}
                >
                  {u.replace(`https://${domain}`, "") || u}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PagesTable({ pages, onRowClick }: { pages: CrawlPage[]; onRowClick: (url: string) => void }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
      <thead>
        <tr>
          <th style={th}>URL</th>
          <th style={th}>状态</th>
          <th style={th}>Title</th>
          <th style={th}>HTML 字节</th>
          <th style={th}>CSR</th>
          <th style={th}>内链</th>
          <th style={th}>Issues</th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p) => (
          <tr
            key={p.url}
            onClick={() => onRowClick(p.url)}
            style={{
              cursor: "pointer",
              background: p.csr_empty ? "rgba(230,193,90,.05)" : p.status >= 300 ? "rgba(94,234,212,.05)" : "transparent",
            }}
          >
            <td style={td}><span style={{ color: C.teal, fontFamily: "monospace", fontSize: 11 }}>{p.url.replace(/^https?:\/\//, "")}</span></td>
            <td style={{ ...td, fontFamily: "monospace" }}>{p.status}</td>
            <td style={td}>{(p.title ?? "—").slice(0, 26)}{(p.title ?? "").length > 26 ? "…" : ""}</td>
            <td style={{ ...td, fontFamily: "monospace" }}>{p.content_length ?? "—"}</td>
            <td style={td}>
              {p.csr_empty === undefined ? "—" : p.csr_empty ? <Pill color={C.amber}>空壳</Pill> : <Pill color={C.lime}>有正文</Pill>}
            </td>
            <td style={{ ...td, fontFamily: "monospace" }}>{p.internal_links ?? "—"}</td>
            <td style={td}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {(p.issues ?? []).map((i) => (
                  <span key={i} style={{ fontFamily: "monospace", fontSize: 9.5, border: `1px solid ${C.line}`, borderRadius: 6, padding: "1px 7px", color: C.dim }}>{i}</span>
                ))}
                {(!p.issues || p.issues.length === 0) && "—"}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = { background: C.bg3, textAlign: "left", padding: "8px 11px", fontSize: 10.5, color: C.dim, borderBottom: `1px solid ${C.line}` };
const td: React.CSSProperties = { padding: "8px 11px", borderBottom: `1px solid ${C.line}`, verticalAlign: "top" };

function PageDetail({ page, issues }: { page: CrawlPage; issues: CrawlIssue[] }) {
  return (
    <div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, background: C.bg2, padding: "12px 14px", marginBottom: 12, fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.9, color: C.dim }}>
        <b style={{ color: C.text, fontWeight: 500 }}>status</b> {page.status} · <b style={{ color: C.text }}>final_url</b> {page.final_url ?? page.url}<br />
        <b style={{ color: C.text }}>redirect_chain</b> {(page.redirect_chain ?? [page.url]).join(" → ")}<br />
        <b style={{ color: C.text }}>title</b> {page.title ?? "—"}<br />
        <b style={{ color: C.text }}>content_length(raw HTML)</b> {page.content_length ?? "—"} 字节 · <b style={{ color: C.text }}>internal_links</b> {page.internal_links ?? "—"}
      </div>
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, background: C.bg2, padding: "12px 14px", marginBottom: 12, fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.9, color: C.dim }}>
        <b style={{ color: C.text }}>csr_empty</b> {page.csr_empty === undefined ? "—（重定向页不判定）" : page.csr_empty ? "true（正文文本 <500）" : "false"}
      </div>
      {page.csr_empty && (
        <div style={{ border: "1px dashed rgba(230,193,90,.4)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 12, color: C.amber }}>
          ▨ render 对比（v2 待接）：对该页触发 playwright render，对比 <b>rendered_text_length</b> vs 正文文本长度（注意：不能用 content_length，raw HTML 含 inline JS/CSS 会误导）。
          <div style={{ height: 8, background: C.bg3, borderRadius: 4, overflow: "hidden", margin: "8px 0" }}>
            <i style={{ display: "block", height: "100%", width: "0%", background: "repeating-linear-gradient(45deg,#e6c15a,#e6c15a 6px,transparent 6px,transparent 12px)" }} />
          </div>
          待 rendered_text_length 字段
        </div>
      )}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, background: C.bg2, padding: "12px 14px", fontFamily: "monospace", fontSize: 11.5, lineHeight: 1.9, color: C.dim }}>
        <b style={{ color: C.text }}>issues（{(page.issues ?? []).length}）</b><br />
        {(page.issues ?? []).map((i) => {
          const is = issues.find((x) => x.type === i);
          const f = getFix(i);
          return (
            <span key={i}>
              · {i} {is && <Pill color={sevColor[is.severity]}>{is.severity}</Pill>} <Pill color={fixColor[f.level]}>{f.level}</Pill>
              <br />
            </span>
          );
        })}
        {(!page.issues || page.issues.length === 0) && "· 无"}
      </div>
    </div>
  );
}
