/**
 * Artifact 包装层 — 将工具输出转为 artifact_created 事件。
 *
 * 职责（对齐 PRD artifact 数据流）：
 *   1. 白名单判定：仅 analyze_content_gap / check_schema / run_diagnosis 产 artifact
 *   2. JSON 解析：output 必须是可 JSON.parse 的字符串，失败不产 artifact（fail-closed）
 *   3. 体积控制：竞品 markdown 全文不入 data；>256KB 截断 issues/recommendations 并标 truncated
 *   4. 元数据：artifact_id (UUID) / source_tool / created_at
 *
 * 与 tool_end 的边界：
 *   tool_end = "工具调用完成" 语义；artifact_created = "产出可渲染产物" 语义。
 *   一工具调用可产 0..n 个 artifact（当前每工具最多 1 个）。
 */

import type { ArtifactEvent, ArtifactKind } from "@hutian/agent-protocol";

/** 产 artifact 的工具白名单 → 对应 artifact kind */
const ARTIFACT_WHITELIST: Record<string, ArtifactKind> = {
  analyze_content_gap: "content_gap_report",
  check_schema: "schema_patch",
  run_diagnosis: "diagnosis_report",
  crawl_site_audit: "crawl_report",
};

/** 单事件体积上限：256KB（SSE 单帧不宜过大） */
const MAX_ARTIFACT_BYTES = 256 * 1024;

/**
 * 尝试将工具输出包装为 artifact_created 事件。
 *
 * @returns ArtifactEvent 或 null（白名单外 / 解析失败 / 空数据）
 */
export function tryBuildArtifact(
  toolName: string,
  output: unknown,
): ArtifactEvent | null {
  const kind = ARTIFACT_WHITELIST[toolName];
  if (!kind) return null;

  // output 应为 JSON 字符串（MCP 工具统一返回 string）
  let parsed: unknown;
  if (typeof output === "string") {
    try {
      parsed = JSON.parse(output);
    } catch {
      // parse 失败不产 artifact，tool_end 照常显示原文
      return null;
    }
  } else if (output !== null && typeof output === "object") {
    parsed = output;
  } else {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;

  // ── 体积控制 ──────────────────────────────────────────────
  // 安全剥离竞品 markdown 全文（防御性：即使工具未来改了输出也不推全文）
  const data = stripCompetitorMarkdown(parsed as Record<string, unknown>);

  // 256KB 截断保护
  let serialized = JSON.stringify(data);
  if (serialized.length > MAX_ARTIFACT_BYTES) {
    const truncated = truncateForSize(data, MAX_ARTIFACT_BYTES);
    truncated.truncated = true;
    serialized = JSON.stringify(truncated);
  }

  const title = deriveTitle(kind, data);

  return {
    type: "artifact_created",
    artifact_id: crypto.randomUUID(),
    kind,
    title,
    data: JSON.parse(serialized),
    source_tool: toolName,
    created_at: new Date().toISOString(),
  };
}

/**
 * 剥离 competitor_analysis 中可能存在的 markdown 全文字段。
 * 当前工具输出只含 markdown_length，不含全文；此函数做防御性兜底。
 */
function stripCompetitorMarkdown(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const competitors = data.competitor_analysis;
  if (Array.isArray(competitors)) {
    data.competitor_analysis = competitors.map((c) => {
      if (!c || typeof c !== "object") return c;
      const item = { ...(c as Record<string, unknown>) };
      // 删除任何可能含正文全文的字段
      delete item.markdown;
      delete item.content;
      delete item.body;
      delete item.raw_markdown;
      return item;
    });
  }
  return data;
}

/**
 * 截断保护：当 data 序列化后 > maxBytes 时，优先截断 issues 和 recommendations。
 * 返回新对象（不改原对象）。
 */
function truncateForSize(
  data: Record<string, unknown>,
  maxBytes: number,
): Record<string, unknown> {
  const copy = { ...data };

  // 1. 先截 editorial_brief.recommendations（编辑建议数组，每条可能很长）
  const brief = copy.content_gap_brief as Record<string, unknown> | undefined;
  const editorial = brief?.editorial_brief as Record<string, unknown> | undefined;
  if (editorial && Array.isArray(editorial.recommendations)) {
    editorial.recommendations = (editorial.recommendations as string[]).slice(0, 3);
  }

  // 2. 再截 issues
  if (Array.isArray(copy.issues)) {
    copy.issues = (copy.issues as string[]).slice(0, 2);
  }

  // 3. 若仍超限，截 serp_results 的 snippet
  let serialized = JSON.stringify(copy);
  if (serialized.length > maxBytes) {
    const serp = copy.serp_results as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(serp)) {
      copy.serp_results = serp.map((r) => ({
        ...r,
        snippet: typeof r.snippet === "string" ? r.snippet.slice(0, 120) : r.snippet,
      }));
    }
  }

  // 4. 最终兜底：若仍超限，截 competitor_analysis 到前 3 条
  serialized = JSON.stringify(copy);
  if (serialized.length > maxBytes) {
    const comp = copy.competitor_analysis as Array<unknown> | undefined;
    if (Array.isArray(comp)) {
      copy.competitor_analysis = comp.slice(0, 3);
    }
  }

  return copy;
}

/** 从 data 派生 artifact 标题（卡片展示用） */
function deriveTitle(kind: ArtifactKind, data: Record<string, unknown>): string {
  switch (kind) {
    case "content_gap_report": {
      const kw = typeof data.keyword === "string" ? data.keyword : "unknown";
      const analyzed =
        typeof data.content_gap_brief === "object" && data.content_gap_brief
          ? (data.content_gap_brief as Record<string, unknown>).competitors_analyzed
          : "?";
      return `内容差距报告 · ${kw} · ${analyzed} 竞品`;
    }
    case "schema_patch":
      return "结构化数据补丁";
    case "diagnosis_report":
      return "SEO/GEO 诊断报告";
    case "crawl_report": {
      const summary =
        typeof data.summary === "object" && data.summary
          ? (data.summary as Record<string, unknown>)
          : {};
      const domain = typeof summary.domain === "string" ? summary.domain : "unknown";
      const crawled = summary.urls_crawled ?? "?";
      const csr = summary.csr_empty_pages ?? 0;
      return `全站爬取审计 · ${domain} · ${crawled} 页 · ${csr} CSR 空壳`;
    }
    default:
      return "Artifact";
  }
}
