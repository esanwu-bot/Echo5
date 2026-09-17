export type PlanStatus = "pending" | "now" | "ok";
export interface PlanItem { text: string; status: PlanStatus }
export interface StatItem { label: string; value: number; prefix?: string; suffix?: string; dec?: number; accent: "amber"|"teal"|"violet"|"green"; sub?: string }
export interface DiffData { file: string; additions: number; deletions: number; lines: { no: number; text: string; kind: "ctx"|"add"|"del" }[] }
export interface ArtifactData { file: string; size: string; status: string; kind: "mod"|"add" }

/* ════════════════════════════════════════════════════════════════
 * 内容差距报告 — analyze_content_gap 工具输出的结构化类型。
 * ⚠️ competitor_analysis 不含竞品 markdown 全文（只含元信息 + 长度），
 *    SSE 体积控制依赖此约定，bridge 侧不再二次剥离。
 * ════════════════════════════════════════════════════════════════ */

/** SERP 单条结果 */
export interface SerpResultItem {
  position: number | null;
  title: string;
  link: string;
  snippet?: string;
}

/** 竞品抓取状态（不含正文全文） */
export interface CompetitorAnalysisItem {
  position: number | null;
  title: string;
  url: string;
  snippet?: string;
  fetched_ok: boolean;
  fetch_failed: boolean;
  fetch_blocked_403: boolean;
  error: string | null;
  markdown_length: number;
}

/** 差距矩阵 */
export interface GapMatrix {
  common_topics: Array<{ keyword: string; coverage: number }>;
  top_questions: Array<{ question: string; mentions: number }>;
  heading_themes: Array<{ theme: string; mentions: number }>;
}

/** 编辑简报 */
export interface EditorialBrief {
  summary: string;
  recommendations: string[];
}

/** 内容差距简报主体 */
export interface ContentGapBrief {
  competitors_analyzed: number;
  competitors_failed: number;
  gap_matrix: GapMatrix;
  missing_topics_for_my_page: string[];
  editorial_brief: EditorialBrief;
}

/** analyze_content_gap 完整返回（不含竞品 markdown 全文） */
export interface GapReportData {
  keyword: string;
  engine: string;
  gl: string;
  hl?: string;
  my_url: string | null;
  my_url_in_serp: boolean;
  my_url_fetch_error: string | null;
  serp_results: SerpResultItem[];
  competitor_analysis: CompetitorAnalysisItem[];
  content_gap_brief: ContentGapBrief;
  issues: string[];
  duration_ms: number;
  /** bridge 侧体积保护：超过 256KB 时置 true，issues/recommendations 已截断 */
  truncated?: boolean;
}

/* ════════════════════════════════════════════════════════════════
 * Artifact 事件 — 工具产出的可渲染产物。
 * 独立于 tool_end（调用完成语义），一工具调用可产 0..n 个 artifact。
 * ════════════════════════════════════════════════════════════════ */

export type ArtifactKind =
  | "content_gap_report"
  | "schema_patch"
  | "diagnosis_report"
  | "crawl_report";

export interface ArtifactEvent {
  type: "artifact_created";
  artifact_id: string;
  kind: ArtifactKind;
  title: string;
  data: unknown;
  source_tool: string;
  created_at: string;
}

/**
 * 证据卡数据 — 用于 inbox 邮件线程内嵌的"证据卡"渲染。
 * 与 prototype/email_kanban.html 的 evi 对象一一对应，由 Agent 在
 * approval_request 事件中携带，前端按 type 分发到对应卡片组件。
 */
export type EvidenceCard =
  | { type: "scores"; title: string; seo: number; geo: number; conclusions: Array<{ kind: "ok"|"warn"; text: string }> }
  | { type: "diff"; title: string; lines: Array<{ kind: "ctx"|"add"|"del"; no: number; text: string }> }
  | { type: "bars"; title: string; bars: Array<{ name: string; value: number; className: string }>; extras: Array<[string, string]> }
  | { type: "term"; title: string; lines: Array<{ cls: "ok"|"up"|"p"; prefix: string; text: string }> }
  | { type: "rename"; title: string; matches: number; files: number; excluded: number }
  | { type: "attach"; title?: string; file: string; size: string };

/** 快捷批复选项 — Agent 在 approval_request 中提议，用户点按即 dispatch approval */
export interface QuickAction { kind: "ok"|"no"|"ask"; label: string; action: string }

/** 邮件线程中的一封信（一封邮件 = 一个 thread = 多封信的来回） */
export interface EmailLetter {
  id: string;
  who: "agent"|"me";
  when: string;
  badge: string;
  textHtml: string;
  evidence?: EvidenceCard[];
  quick?: QuickAction[];
}

/** 邮件元数据（列表项） */
export interface EmailMeta {
  id: string;
  from: "agent"|"me";
  fromName: string;
  time: string;
  unread: boolean;
  category: "approve"|"diag"|"report"|"done";
  subject: string;
  snippet: string;
}

export type AgentEvent =
  | { type: "meta"; totalTools: number }
  | { type: "thinking"; on: boolean }
  | { type: "message"; role: "user"|"agent"; content: string }
  | { type: "plan"; items: string[] }
  | { type: "plan_update"; done: number; current: number }
  | { type: "tool_start"; id: string; name: string; args: string }
  | { type: "tool_end"; id: string; ok: boolean; durationMs: number; output: unknown }
  | { type: "diff"; data: DiffData }
  | { type: "terminal"; line: string }
  | { type: "artifact"; data: ArtifactData }
  | { type: "artifact_created"; artifact_id: string; kind: ArtifactKind; title: string; data: unknown; source_tool: string; created_at: string }
  | { type: "stats"; items: StatItem[] }
  // v0.2: inbox 协作流 — Agent 请求批复、用户批复、批复回执
  | { type: "approval_request"; mailId: string; thread: EmailLetter[]; meta: EmailMeta }
  | { type: "approval"; mailId: string; action: string; label: string; replyText?: string }
  | { type: "approval_ack"; mailId: string; ok: boolean; ackText: string; evidence?: EvidenceCard[] }
  | { type: "done" };
