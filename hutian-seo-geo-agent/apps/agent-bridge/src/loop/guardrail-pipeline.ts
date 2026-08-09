/**
 * GuardrailPipeline · harness 显式化（自建 loop §P0 #3）
 *
 * 把 T4.4 流程控制 + intent 围栏串成结构化管道：
 *   before(input) → LLM → exec(toolCall) → after(toolCall, result)
 *
 * 结构保证：
 *  - before 在 LLM 调用前注入硬约束到 system prompt
 *  - exec 在工具执行前过破坏性闸门
 *  - after 在工具执行后派生 stats / 触发复验
 *
 * 三边界不变量（红线，重构期不许破）：
 *  - before 入：Intent（已分类）+ tools
 *  - LLM 出：LLMResponse（①④边界不动）
 *  - after 出：AgentEvent[]（⑥边界不动）
 */
import type { AgentEvent, StatItem } from "@hutian/agent-protocol";
import type { Intent } from "./intent.ts";
import fs from "node:fs";
import path from "node:path";
import {
  buildBrandFirstConstraint,
  deriveStatsFromDiagnosis,
  shouldReverifyAfterWrite,
  type BrandRenameIntent,
  type ReverifyTask,
  type RunCtx,
} from "./flow-control.ts";
import { isDestructiveAuthorized, isDestructiveToolCall } from "./intent.ts";

// ───────────────────────────────────────────────────────────────
// Guardrail 类型
// ───────────────────────────────────────────────────────────────

/** before 阶段产物：注入到 system prompt 的硬约束 */
export interface BeforeGuardrailResult {
  /** 拼到 system prompt 末尾的硬约束文本 */
  systemPromptSuffix: string;
}

/** exec 阶段闸门结果：是否允许执行 toolCall */
export interface ExecGuardrailResult {
  /** true = 放行执行；false = 拦截 */
  allowed: boolean;
  /** 拦截原因（allowed=false 时填，喂回 LLM 让它知道被拦） */
  rejectReason?: string;
  /** 拦截时产出的额外 AgentEvent（tool_end ok=false / message 提示） */
  events?: AgentEvent[];
}

/** after 阶段产物：从工具结果派生的事件 + 自动复验任务 */
export interface AfterGuardrailResult {
  /** 派生的 stats 事件（B 规则：诊断评分防注入） */
  statsItems?: StatItem[];
  /** 自动复验任务（C 规则：写后必复验） */
  reverifyTask?: ReverifyTask;
}

// ───────────────────────────────────────────────────────────────
// P1-10 · cms_upload_media 路径白名单
// ───────────────────────────────────────────────────────────────

/** 读取允许上传的目录白名单（绝对路径）。
 * 优先读 env CMS_UPLOAD_ALLOWED_DIRS（逗号分隔）；未配置则默认仅允许
 * cwd 下的 uploads/ 与 public/uploads/。 */
function getUploadAllowedDirs(): string[] {
  const env = process.env.CMS_UPLOAD_ALLOWED_DIRS;
  if (env) {
    return env
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => path.resolve(d));
  }
  const cwd = process.cwd();
  return [path.join(cwd, "uploads"), path.join(cwd, "public", "uploads")];
}

/** 校验 cms_upload_media 的 file_path 是否在白名单目录下，防止任意文件读取。 */
export function validateCmsUploadPath(
  filePath: unknown,
): { ok: boolean; reason?: string } {
  if (typeof filePath !== "string" || filePath.length === 0) {
    return { ok: false, reason: "file_path 为空或非字符串" };
  }
  if (filePath.includes("\0")) {
    return { ok: false, reason: "file_path 包含非法空字符" };
  }
  const allowedDirs = getUploadAllowedDirs();
  if (allowedDirs.length === 0) {
    return { ok: false, reason: "未配置 CMS_UPLOAD_ALLOWED_DIRS，上传被禁用" };
  }
  let realPath: string;
  try {
    realPath = fs.realpathSync(path.resolve(filePath));
  } catch {
    // 文件尚不存在时 realpath 会抛，退而使用绝对路径并继续检查目录前缀
    realPath = path.resolve(filePath);
  }
  const normalizedAllowed = allowedDirs.map((dir) => {
    try {
      return fs.realpathSync(dir);
    } catch {
      return path.resolve(dir);
    }
  });
  const inside = normalizedAllowed.some((dir) => {
    const relative = path.relative(dir, realPath);
    return !relative.startsWith("..") && !path.isAbsolute(relative);
  });
  if (!inside) {
    return {
      ok: false,
      reason: `file_path 不在允许上传目录内: ${allowedDirs.join(", ")}`,
    };
  }
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────
// Guardrail 实现
// ───────────────────────────────────────────────────────────────

/**
 * Before guardrail：按 intent.kind 注入硬约束。
 * 对应 flow-control 的 A 规则（品牌前置）+ diagnose/submit 提示。
 */
export function beforeGuardrail(intent: Intent): BeforeGuardrailResult {
  switch (intent.kind) {
    case "rename": {
      const brandIntent: BrandRenameIntent = {
        oldHints: intent.slots.oldNames ?? [],
        newHint: intent.slots.newName,
      };
      return { systemPromptSuffix: buildBrandFirstConstraint(brandIntent) };
    }
    case "diagnose": {
      if (!intent.slots.url) return { systemPromptSuffix: "" };
      return {
        systemPromptSuffix: [
          "",
          "【硬约束 · 诊断】",
          `用户已指定目标 URL：${intent.slots.url}`,
          "诊断必须调 run_diagnosis 工具，不要凭文本臆测评分。",
          "所有数字（SEO/GEO 分数、实体清晰度）必须来自工具返回。",
        ].join("\n"),
      };
    }
    case "submit": {
      return {
        systemPromptSuffix: [
          "",
          "【硬约束 · sitemap 提交】",
          "submit_sitemap 是破坏性操作（向搜索引擎推送）。",
          "调工具前必须先用一句话告诉用户即将提交的 host 与 URL 数量，",
          "然后由 loop 的 confirm 闸门守 —— 未收到规则判定的 confirm 词前，禁止执行 submit_sitemap。",
        ].join("\n"),
      };
    }
    case "cms": {
      return {
        systemPromptSuffix: [
          "",
          "【硬约束 · 建站】",
          "用户意图是建站（创建页面/商品/上传媒体/发布）。",
          "根据用户描述调用合适的建站工具：cms_create_page / cms_configure_product / cms_upload_media / cms_publish。",
          "创建页面用 cms_create_page（title/summary/content 必填），创建商品用 cms_configure_product（name/product_code 必填）。",
          "建完页面或商品后，loop 会自动触发 check_schema 复验渲染器输出的 JSON-LD 是否合法，无需手动再调 check_schema。",
          "siteBase backend 未启动时工具会返回 mock 数据（source=mock），loop 仍可继续跑复验链路。",
        ].join("\n"),
      };
    }
    default:
      return { systemPromptSuffix: "" };
  }
}

/**
 * Exec guardrail：破坏性闸门。
 * 红线：只信规则判定的 confirm，绝不信 LLM 的 intent 分类。
 */
export function execGuardrail(
  toolName: string,
  args: Record<string, unknown>,
  intent: Intent,
  toolCallId: string,
): ExecGuardrailResult {
  // P1-10：cms_upload_media 必须先过路径白名单（独立于用户确认）
  if (toolName === "cms_upload_media") {
    const pathCheck = validateCmsUploadPath(args.file_path);
    if (!pathCheck.ok) {
      const events: AgentEvent[] = [
        {
          type: "tool_end",
          id: toolCallId,
          ok: false,
          durationMs: 0,
          output: {
            error: "cms_upload_media_path_blocked",
            note: pathCheck.reason,
            pending: { name: toolName, args },
          },
        },
      ];
      return {
        allowed: false,
        rejectReason: `cms_upload_media_path_blocked: ${pathCheck.reason}`,
        events,
      };
    }
  }

  if (!isDestructiveToolCall(toolName, args)) {
    return { allowed: true };
  }
  if (isDestructiveAuthorized(intent)) {
    return { allowed: true };
  }
  // 拦截
  const events: AgentEvent[] = [
    {
      type: "tool_end",
      id: toolCallId,
      ok: false,
      durationMs: 0,
      output: {
        error: "destructive_gate_blocked",
        note: "破坏性操作需用户规则确认（回复「确认」/「取消」）",
        pending: { name: toolName, args },
      },
    },
  ];
  return {
    allowed: false,
    rejectReason: "destructive_gate_blocked: 需用户回复规则判定的 confirm 词",
    events,
  };
}

/**
 * After guardrail：从工具结果派生事件 + 触发复验。
 * 对应 flow-control 的 B 规则（评分防注入）+ C 规则（写后必复验）。
 *
 * 接受 ctx 用于：
 *  - 派生 stats 后更新 ctx.lastUrl（run_diagnosis）
 *  - shouldReverifyAfterWrite 从 ctx 取 url/brand
 */
export function afterGuardrail(
  toolName: string,
  args: Record<string, unknown>,
  result: { ok: boolean; output: unknown },
  ctx: RunCtx,
): AfterGuardrailResult {
  const out: AfterGuardrailResult = {};

  // B 规则：run_diagnosis 输出派生 stats，同时把 url 灌到 ctx
  if (toolName === "run_diagnosis" && result.ok) {
    if (typeof args.url === "string") ctx.lastUrl = args.url;
    const stats = deriveStatsFromDiagnosis(result.output);
    if (stats && stats.length > 0) out.statsItems = stats;
  }

  // trace_citations 时把 brand 灌到 ctx（submit_sitemap 复验用）
  if (toolName === "trace_citations" && typeof args.brand === "string") {
    ctx.brand = args.brand;
    if (typeof args.window_days === "number") ctx.windowDays = args.window_days;
  }

  // C 规则：写后必复验（两条链路，靠 ctx 取参数）
  if (result.ok) {
    const task = shouldReverifyAfterWrite(toolName, args, result, ctx);
    if (task) out.reverifyTask = task;
  }

  return out;
}

// ───────────────────────────────────────────────────────────────
// Pipeline · 结构化装配
// ───────────────────────────────────────────────────────────────

/**
 * GuardrailPipeline —— 把 before/exec/after 串成可单测的纯对象。
 *
 * 用法（run-agent.ts 每轮）：
 *   const before = pipeline.before(intent);
 *   // 拼 systemPromptSuffix 到 system prompt → 调 LLM
 *   for (const call of res.toolCalls) {
 *     const gate = pipeline.exec(call.name, call.args, intent, call.id);
 *     if (!gate.allowed) { yield* gate.events; continue; }
 *     const result = await mcp.callTool(call.name, call.args);
 *     const after = pipeline.after(call.name, call.args, result);
 *     if (after.statsItems) yield { type: "stats", items: after.statsItems };
 *     if (after.reverifyTask) { /* 执行复验 *\/ }
 *   }
 *
 * 结构保证：
 *  - before 必在 LLM 前调
 *  - exec 必在工具执行前调
 *  - after 必在工具执行后调
 *  - 三阶段无状态共享，纯函数（除 after 可能产复验任务副作用）
 */
export const GuardrailPipeline = {
  before: beforeGuardrail,
  exec: execGuardrail,
  after: afterGuardrail,
} as const;

export type GuardrailPipelineType = typeof GuardrailPipeline;
