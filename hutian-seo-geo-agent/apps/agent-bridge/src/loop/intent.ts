/**
 * intent 围栏 · 统一 intent 层（自建 loop §T4.4 升级）
 *
 * 范式分层（按代价分两圈，不是三选一）：
 *   圈 1 · 规则快通道（廉价、可信、用于破坏性闸门）
 *     - confirm/cancel 闸门：纯规则，LLM 不碰
 *     - URL/品牌 slot 抽取：正则
 *     - 关键词命中 kind：rename/diagnose/report/submit/chitchat
 *   圈 2 · LLM enum 结构化分类（廉价调用，不写文章）
 *     - 规则置信度 < 阈值时调 LLM，返回 enum + confidence
 *     - LLM 仍低置信 → ambiguous + 反问
 *
 * 红线（自建loop.md §intent 围栏红线）：
 *   任何破坏性动作（dry_run=false / submit_sitemap 真提交）的执行授权，
 *   只信规则判定的 confirm 词，绝不信 LLM 的 intent 分类。
 */
import type { LLMClient } from "../llm/types.ts";

// ───────────────────────────────────────────────────────────────
// 类型
// ───────────────────────────────────────────────────────────────

export type IntentKind =
  | "confirm" // 破坏性闸门：是/确认/执行/继续
  | "cancel" // 取消/中止
  | "rename" // 品牌更名
  | "diagnose" // SEO/GEO 诊断
  | "report" // AI 引用追踪
  | "submit" // sitemap 提交
  | "check_schema" // 结构化数据补齐
  | "chitchat" // 闲聊 / 问候
  | "ambiguous"; // 低置信反问

export interface IntentSlots {
  url?: string;
  host?: string;
  brand?: string;
  oldNames?: string[];
  newName?: string;
  windowDays?: number;
  expectedType?: string;
  urls?: string[];
}

export interface Intent {
  kind: IntentKind;
  /** 0-1，规则命中≥0.9；LLM 命中按返回值；ambiguous 固定 0 */
  confidence: number;
  slots: IntentSlots;
  /** 谁判定的 —— 破坏性闸门只信 "rule" */
  source: "rule" | "llm";
  /** 是否需要反问澄清 */
  needsClarify?: boolean;
  /** 反问问题（needsClarify=true 时必填） */
  clarifyQuestion?: string;
  /** 原始输入（调试用） */
  raw: string;
}

// ───────────────────────────────────────────────────────────────
// 圈 1 · 规则快通道
// ───────────────────────────────────────────────────────────────

/** 破坏性闸门确认词（只信这些，LLM 说的不算） */
const CONFIRM_PATTERNS = [
  /^\s*(确认|确定|执行|继续|同意|yes|y|ok|确认执行|确认写入|干吧|就这么办)/i,
  /^\s*(dry[_\s-]?run\s*=\s*false|dry[_\s-]?run\s*关闭)/i,
];

const CANCEL_PATTERNS = [
  /^\s*(取消|中止|停止|算了|不要了|cancel|stop|abort|no|n)(?:\s|$|[，。、！!？?])/i,
  /^\s*(取消|中止|停止|算了|不要了|cancel|stop|abort|no|n)$/i,
];

/** URL 抽取（http(s):// 或裸域名路径） */
const URL_PATTERN =
  /https?:\/\/[^\s，。、 ""']{4,}|(?:^|\s)([a-z0-9-]+\.)+(com|cn|net|org|io|dev|app|co)(\/[^\s，。、 ""']*)?/i;

/** 品牌更名关键词 */
const RENAME_KEYWORDS = /品牌.*(更名|改名|重命名|换名|改为|改成|统一为|更新为)|rename\s+(brand|entity)/i;

/** 诊断关键词 */
const DIAGNOSE_KEYWORDS = /(诊断|分析|检测|评估|seo\s*(score|评分|分数)|geo\s*(score|评分|分数)|audit)/i;

/** 引用追踪关键词 */
const REPORT_KEYWORDS = /(引用|提及|提到|可见度|出现频次|citation|mention|trace)/i;

/** sitemap 提交关键词 */
const SUBMIT_KEYWORDS = /(sitemap|站点地图|提交|收录|submit|indexnow)/i;

/** check_schema 关键词 */
const SCHEMA_KEYWORDS = /(结构化数据|json-?ld|schema|microdata|product\s*type)/i;

/** 闲聊关键词 */
const CHITCHAT_KEYWORDS = /^(你好|您好|hi|hello|hey|谢谢|感谢|bye|再见|你是谁|你能做什么)/i;

/**
 * 规则快通道分类器 —— 廉价、可信、用于破坏性闸门。
 *
 * @returns Intent with source="rule"；未命中返回 null（交给 LLM 圈）
 */
export function classifyIntentByRule(input: string): Intent | null {
  const raw = input ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const slots = extractSlots(raw);

  // 1. confirm/cancel 闸门（最高优先级，纯规则）
  for (const p of CONFIRM_PATTERNS) {
    if (p.test(trimmed)) {
      return {
        kind: "confirm",
        confidence: 0.95,
        slots,
        source: "rule",
        raw,
      };
    }
  }
  for (const p of CANCEL_PATTERNS) {
    if (p.test(trimmed)) {
      return {
        kind: "cancel",
        confidence: 0.95,
        slots,
        source: "rule",
        raw,
      };
    }
  }

  // 2. 业务意图关键词匹配
  if (RENAME_KEYWORDS.test(raw)) {
    return { kind: "rename", confidence: 0.9, slots, source: "rule", raw };
  }
  if (SUBMIT_KEYWORDS.test(raw) && /提交|submit|indexnow/i.test(raw)) {
    return { kind: "submit", confidence: 0.85, slots, source: "rule", raw };
  }
  if (REPORT_KEYWORDS.test(raw)) {
    return { kind: "report", confidence: 0.8, slots, source: "rule", raw };
  }
  if (DIAGNOSE_KEYWORDS.test(raw)) {
    return { kind: "diagnose", confidence: 0.85, slots, source: "rule", raw };
  }
  if (SCHEMA_KEYWORDS.test(raw)) {
    return { kind: "check_schema", confidence: 0.8, slots, source: "rule", raw };
  }

  // 3. 闲聊（短句 + 问候词）
  if (trimmed.length < 30 && CHITCHAT_KEYWORDS.test(trimmed)) {
    return { kind: "chitchat", confidence: 0.85, slots, source: "rule", raw };
  }

  return null;
}

/** slot 抽取：URL / 品牌 / oldNames / newName / host / windowDays */
export function extractSlots(input: string): IntentSlots {
  const slots: IntentSlots = {};

  // URL
  const urlMatch = input.match(URL_PATTERN);
  if (urlMatch) {
    const u = urlMatch[0].trim();
    slots.url = u.startsWith("http") ? u : `https://${u.replace(/^\/+/, "")}`;
    try {
      const host = new URL(slots.url).host;
      slots.host = host;
    } catch {
      // 裸域名：直接当 host
      slots.host = u.replace(/^https?:\/\//, "").split("/")[0];
    }
  }

  // 品牌更名：从「X」→「Y」/ 改为 Y / 从 X 到 Y
  // 注意：长词（改为/改成/换为）必须放短词（改/换）前面，否则"改"会吞掉"为"
  const renameFromTo = input.match(
    /从\s*[「『"]?([^」』"\s,，。]{2,20})[」』"]?\s*(?:到|至|→|->|改为|改成|换为|更名|改|换)\s*[「『"]?([^」』"\s,，。]{2,20})[」』"]?/,
  );
  if (renameFromTo) {
    slots.oldNames = [renameFromTo[1]];
    slots.newName = renameFromTo[2];
    slots.brand = renameFromTo[2];
  } else {
    // 兜底：从「改为 X」「改成 X」抽 newName
    const changeTo = input.match(
      /(?:改为|改成|统一为|更新为|rename\s*to)\s*[「『"]([^」』"]{2,20})[」』"]/,
    );
    if (changeTo) {
      slots.newName = changeTo[1];
      slots.brand = changeTo[1];
    }
    // 旧名候选：所有引号串
    const quoted = input.match(/[「『"]([^」』"]{2,20})[」』"]/g);
    if (quoted && !slots.oldNames) {
      const candidates = quoted
        .map((q) => q.replace(/^[「『"]|[」』"]$/g, ""))
        .filter((s) => s !== slots.newName);
      if (candidates.length > 0) slots.oldNames = candidates;
    }
  }

  // windowDays：30 天 / 90 天 / 7d / 30days（不用 \b，中文边界不可靠）
  const windowMatch = input.match(/(\d+)\s*(?:天|days?|d)(?=\s|的|之|[，。、！!？?]|$)/i);
  if (windowMatch) {
    const n = parseInt(windowMatch[1], 10);
    if (n >= 1 && n <= 365) slots.windowDays = n;
  }

  // expectedType：Product / Article / Organization
  const typeMatch = input.match(
    /\b(Product|Article|Organization|BreadcrumbList|FAQPage|HowTo)\b/i,
  );
  if (typeMatch) slots.expectedType = typeMatch[1];

  return slots;
}

// ───────────────────────────────────────────────────────────────
// 圈 2 · LLM enum 结构化分类
// ───────────────────────────────────────────────────────────────

const INTENT_ENUM = [
  "rename",
  "diagnose",
  "report",
  "submit",
  "check_schema",
  "chitchat",
  "ambiguous",
] as const;

const INTENT_CLASSIFY_PROMPT = `你是壶天 SEO/GEO Agent 的意图分类器。把用户输入分类成以下之一：
- rename: 品牌更名 / 实体重命名
- diagnose: SEO/GEO 诊断 / 站点分析
- report: AI 引用追踪 / 可见度统计
- submit: sitemap 提交 / 收录推送
- check_schema: 结构化数据补齐 / JSON-LD
- chitchat: 闲聊 / 问候 / 无业务意图
- ambiguous: 模糊 / 信息不足 / 多意图冲突

只返回 JSON：{"kind":"<enum>","confidence":0.0-1.0,"slots":{"url":"","brand":"","oldNames":[],"newName":"","host":"","windowDays":30,"expectedType":""}}
缺的 slot 留空或省略。confidence 低于 0.6 时 kind 必须为 "ambiguous"。不要写文章。`;

/**
 * LLM enum 分类器 —— 规则未命中或低置信时调用。
 * 廉价：enum 几值 + structured output，不让 LLM 写散文。
 */
export async function classifyIntentByLLM(
  input: string,
  llm: LLMClient,
  signal?: AbortSignal,
): Promise<Intent> {
  let parsed: { kind?: string; confidence?: number; slots?: IntentSlots };
  try {
    const res = await llm.chat({
      messages: [
        { role: "system", content: INTENT_CLASSIFY_PROMPT },
        { role: "user", content: input },
      ],
      signal,
    });
    parsed = parseIntentJson(res.content ?? "");
  } catch (e) {
    // LLM 失败 → ambiguous，不阻塞 loop
    return {
      kind: "ambiguous",
      confidence: 0,
      slots: extractSlots(input),
      source: "llm",
      needsClarify: true,
      clarifyQuestion: "我没听懂，能再说详细点吗？比如要诊断哪个站点、还是给品牌改名？",
      raw: input,
    };
  }

  const kind = INTENT_ENUM.includes(parsed.kind as (typeof INTENT_ENUM)[number])
    ? (parsed.kind as IntentKind)
    : "ambiguous";
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
  const slots = { ...extractSlots(input), ...(parsed.slots ?? {}) };

  // LLM 自评低置信 → ambiguous
  if (kind === "ambiguous" || confidence < 0.6) {
    return {
      kind: "ambiguous",
      confidence,
      slots,
      source: "llm",
      needsClarify: true,
      clarifyQuestion: buildClarifyQuestion(input, slots),
      raw: input,
    };
  }

  return { kind, confidence, slots, source: "llm", raw: input };
}

/** 解析 LLM 返回的 JSON（容错：剥 markdown fence、找第一个 {） */
function parseIntentJson(text: string): {
  kind?: string;
  confidence?: number;
  slots?: IntentSlots;
} {
  if (!text) return {};
  let s = text.trim();
  // 剥 ```json ... ``` fence
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // 找第一个 { 到最后一个 }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < 0) return {};
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return {};
  }
}

function buildClarifyQuestion(input: string, slots: IntentSlots): string {
  if (!slots.url && !slots.brand) {
    return "你想做什么？比如「诊断 example.com 的 SEO」「把品牌从 X 改为 Y」「提交 sitemap」";
  }
  if (slots.url && !slots.brand && !/诊断|分析|seo|geo/i.test(input)) {
    return `针对 ${slots.url}，你想诊断 SEO、追踪 AI 引用、还是补 JSON-LD？`;
  }
  return "能补充一下细节吗？比如目标 URL、品牌名、时间窗口";
}

// ───────────────────────────────────────────────────────────────
// 统一入口 · 规则 + LLM 双轨 OR
// ───────────────────────────────────────────────────────────────

export interface ClassifyOptions {
  llm?: LLMClient;
  signal?: AbortSignal;
  /** 规则置信度阈值，>= 此值不调 LLM（默认 0.8） */
  ruleConfidenceThreshold?: number;
}

/**
 * 统一 intent 分类入口。
 *
 * 流程：
 *   1. 规则快通道先跑
 *   2. 命中且 confidence ≥ 阈值 → 直接返回（不调 LLM，省钱）
 *   3. 否则调 LLM enum 分类
 *   4. LLM 也低置信 → ambiguous + 反问
 *
 * 红线：返回的 Intent.source 标明判定方，
 *      破坏性闸门（isDestructiveAuthorized）只信 source="rule" && kind="confirm"
 */
export async function classifyIntent(
  input: string,
  opts: ClassifyOptions = {},
): Promise<Intent> {
  const rule = classifyIntentByRule(input);
  const threshold = opts.ruleConfidenceThreshold ?? 0.8;

  // 规则高置信 → 直接返回
  if (rule && rule.confidence >= threshold) {
    return rule;
  }

  // 规则未命中或低置信，且无 LLM → 降级 ambiguous
  if (!opts.llm) {
    return {
      kind: "ambiguous",
      confidence: 0,
      slots: rule?.slots ?? extractSlots(input),
      source: "rule",
      needsClarify: true,
      clarifyQuestion: buildClarifyQuestion(input, rule?.slots ?? {}),
      raw: input,
    };
  }

  // 调 LLM 圈
  const llmIntent = await classifyIntentByLLM(input, opts.llm, opts.signal);

  // 双轨 OR：规则命中但置信度不够时，规则与 LLM 结果一致 → 提升置信度
  if (rule && rule.kind === llmIntent.kind && llmIntent.source === "llm") {
    return { ...llmIntent, confidence: Math.min(1, llmIntent.confidence + 0.1) };
  }

  return llmIntent;
}

// ───────────────────────────────────────────────────────────────
// 破坏性闸门 · 只信规则
// ───────────────────────────────────────────────────────────────

/**
 * 破坏性动作授权检查。
 *
 * 红线（自建loop.md §intent 围栏红线）：
 *   只信规则判定的 confirm 词，绝不信 LLM 的 intent 分类。
 *
 * @param intent 当前轮的 intent
 * @returns true = 允许执行破坏性动作；false = 必须先问用户确认
 */
export function isDestructiveAuthorized(intent: Intent): boolean {
  return intent.source === "rule" && intent.kind === "confirm";
}

/** 判断工具调用是否破坏性（需要闸门） */
export function isDestructiveToolCall(
  toolName: string,
  args: Record<string, unknown>,
): boolean {
  if (toolName === "entity_rename" && args.dry_run === false) return true;
  if (toolName === "submit_sitemap") return true;
  return false;
}
