/**
 * T4.4 · 流程控制硬编码 —— 自建 loop 的根本优势
 *
 * 把 skills/agents 里"求 LLM 遵守"的原则，变成 loop 里代码强制。
 * 三条 MVP 规则（自建loop.md §4）：
 *
 *  A. 品牌前置（geo-optimize §3 + 自建loop.md §4）
 *     检测 prompt 含品牌更名意图 → 注入硬约束到 system prompt
 *     要求首轮先 entity_rename(dry_run=true) 预演，不靠 LLM 自觉
 *
 *  B. 诊断评分防注入（seo-audit「不要臆测评分」）
 *     run_diagnosis 工具返回的 scores 派生成 stats 事件推前端
 *     前端 stats 卡显示工具权威数据，LLM 文本里说的数字不影响
 *
 *  C. 写后必复验（geo-optimize §5「重新提交后用 trace_citations 重新测量」）
 *     entity_rename(dry_run=false) 写入成功 → 自动 trace_citations(brand=new_name)
 *     复测新品牌在 AI 引擎中的可见度
 *
 * 留作 T4.6+ 的（自建loop.md §4 ⚠️ 标）：
 *  - dry_run 先统计再确认：loop 暂停等用户 approval 事件（需 inbox 协作流）
 *  - edit_file 后 check_schema：MVP 无 edit_file 工具
 */
import type { StatItem } from "@hutian/agent-protocol";

// ───────────────────────────────────────────────────────────────
// A. 品牌前置
// ───────────────────────────────────────────────────────────────

/** 品牌更名意图检测结果 */
export interface BrandRenameIntent {
  /** 从 prompt 推断的旧品牌名候选（可能多个） */
  oldHints: string[];
  /** 从 prompt 推断的新品牌名 */
  newHint?: string;
}

/**
 * 检测 prompt 是否含品牌更名意图。
 * 关键字：品牌 + (更名/改名/重命名/更新/换名/改为/改成/统一为)
 *
 * 注意：MVP 用关键字匹配，不调 LLM。误命中代价低（注入一条硬约束），
 * 漏命中代价高（LLM 可能跳过 dry_run 直接写入）。
 */
export function detectBrandRenameIntent(prompt: string): BrandRenameIntent | null {
  if (!prompt || typeof prompt !== "string") return null;

  // 触发词：必须含"品牌"或显式 entity_rename 关键字
  const hasBrandKeyword = /品牌|brand/i.test(prompt);
  const hasRenameVerb = /(更名|改名|重命名|换名|改为|改成|统一为|更新为|rename)/i.test(prompt);
  if (!hasBrandKeyword || !hasRenameVerb) return null;

  // 推断新品牌名：从 → X / 改为 X / 改成 X / 统一为 X / 更新为 X
  let newHint: string | undefined;
  const patterns = [
    /(?:改为|改成|统一为|更新为|rename\s*to)\s*[「『"]([^」』"]+)[」』"]/,
    /(?:改为|改成|统一为|更新为|rename\s*to)\s*[「『"]?([^\s,，。.]{2,20})[」』"]?/,
    /从\s*[「『"]?([^」』"\s,，。]{2,20})[」』"]?\s*(?:到|至|→|->)\s*[「『"]?([^」』"\s,，。]{2,20})[」』"]?/,
  ];
  for (const p of patterns) {
    const m = prompt.match(p);
    if (m) {
      // 第 3 个 pattern 有两组：旧 → 新
      newHint = m[2] ?? m[1];
      break;
    }
  }

  // 推断旧品牌名候选：从「X」/ 从 X / 含 brand 关键字的引号串
  const oldHints: string[] = [];
  const fromMatch = prompt.match(/从\s*[「『"]([^」』"]+)[」』"]/);
  if (fromMatch) oldHints.push(fromMatch[1]);
  // 兜底：所有引号串都当候选（loop 里 entity_rename 会自己过滤）
  const quoted = prompt.match(/[「『"]([^」』"]{2,20})[」』"]/g);
  if (quoted) {
    for (const q of quoted) {
      const inner = q.replace(/^[「『"]|[」』"]$/g, "");
      if (inner && inner !== newHint && !oldHints.includes(inner)) {
        oldHints.push(inner);
      }
    }
  }

  return { oldHints, newHint };
}

/**
 * 构造注入到 system prompt 后的硬约束文本。
 * LLM 看到这条约束后，首轮会优先调 entity_rename(dry_run=true)。
 */
export function buildBrandFirstConstraint(intent: BrandRenameIntent): string {
  const oldPart = intent.oldHints.length > 0 ? `（旧名候选：${intent.oldHints.join(" / ")}）` : "";
  const newPart = intent.newHint ? `（新名：${intent.newHint}）` : "";
  return [
    "",
    "【硬约束 · 品牌前置】",
    `检测到品牌更名意图${oldPart}${newPart}。`,
    "首轮必须先调 entity_rename(dry_run=true) 预演，确认匹配文件数与影响范围后，",
    "再决定是否调 entity_rename(dry_run=false) 写入。严禁跳过预演直接写入。",
  ].join("\n");
}

// ───────────────────────────────────────────────────────────────
// B. 诊断评分防注入
// ───────────────────────────────────────────────────────────────

/** run_diagnosis 工具的输出结构（subset，够派生 stats） */
export interface DiagnosisOutput {
  url?: string;
  scores?: {
    traditional_seo?: number;
    generative_geo?: number;
  };
  conclusions?: {
    entity_clarity?: boolean;
    semantic_links?: boolean;
    structured_data_missing?: boolean;
  };
  issues?: string[];
}

/**
 * 从 run_diagnosis 输出派生 stats 事件 items。
 * 前端 stats 卡显示这些工具权威数据，LLM 文本里说的数字不影响。
 *
 * 返回 null 表示输出无法派生（不产 stats 事件）。
 */
export function deriveStatsFromDiagnosis(output: unknown): StatItem[] | null {
  if (!output || typeof output !== "object") return null;
  const o = output as DiagnosisOutput;
  if (!o.scores) return null;

  const items: StatItem[] = [];
  if (typeof o.scores.traditional_seo === "number") {
    items.push({
      label: "传统 SEO",
      value: o.scores.traditional_seo,
      suffix: "/100",
      accent: "amber",
      sub: "工具实测",
    });
  }
  if (typeof o.scores.generative_geo === "number") {
    items.push({
      label: "生成式 GEO",
      value: o.scores.generative_geo,
      suffix: "/100",
      accent: "violet",
      sub: "工具实测",
    });
  }
  // 实体清晰度作为第三个 stat（0/1）
  if (o.conclusions && typeof o.conclusions.entity_clarity === "boolean") {
    items.push({
      label: "实体清晰度",
      value: o.conclusions.entity_clarity ? 1 : 0,
      suffix: "",
      accent: "teal",
      sub: o.conclusions.entity_clarity ? "已达标" : "未达标",
    });
  }
  return items.length > 0 ? items : null;
}

// ───────────────────────────────────────────────────────────────
// C. 写后必复验
// ───────────────────────────────────────────────────────────────

/** 自动复验任务描述 */
export interface ReverifyTask {
  name: string;
  args: Record<string, unknown>;
  /** 复验原因（前端 tool_start.args 显示用） */
  reason: string;
}

/**
 * 写操作完成后，决定是否要自动插入复验工具调用。
 *
 * 规则：entity_rename(dry_run=false) 写入成功 → trace_citations(brand=new_name)
 *       复测新品牌在 AI 引擎中的可见度。
 *
 * 返回 null 表示不需要复验。
 */
export function shouldReverifyAfterWrite(
  toolName: string,
  args: Record<string, unknown>,
  result: { ok: boolean; output: unknown },
): ReverifyTask | null {
  if (toolName !== "entity_rename" || !result.ok) return null;

  // 必须是 dry_run=false（实际写入），dry_run=true 不复验
  if (args.dry_run !== false) return null;

  // 从 args 拿 new_name
  const newName = typeof args.new_name === "string" ? args.new_name : null;
  if (!newName) return null;

  // 从 entity_rename 输出确认写入确实发生了
  const output = result.output as { written?: boolean; dry_run?: boolean } | null;
  if (!output || output.written !== true) return null;

  return {
    name: "trace_citations",
    args: { brand: newName, window_days: 30 },
    reason: `auto-reverify: 新品牌「${newName}」AI 引用基线（写后复验）`,
  };
}
