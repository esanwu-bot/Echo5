import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CodeBuddyClient } from "./llm/codebuddy-client.ts";
import { GrokClient } from "./llm/grok-client.ts";
import { MockLLMClient, seoDemoScript } from "./llm/mock-client.ts";
import { StdioMcpClient } from "./mcp/client.ts";
import { getMcpForTenant } from "./mcp/pool.ts";
import { runAgentLoop } from "./loop/run-agent.ts";
import type { LLMClient, Message } from "./llm/types.ts";
import type { McpToolClient } from "./mcp/client.ts";
import type { AgentEvent } from "@hutian/agent-protocol";
import { verifyTenantToken, isTokenEnforced } from "./auth/tenant-token.ts";
import { setTenantContext, resolveTenantForMcp } from "./auth/tenant-context.ts";
// 雷四债：clearTenantContext 已在 tenant-context.ts 实现 export，当前 bridge 无 session 清理逻辑
// （同 sessionHistories，M5 持久化债）；session 清理接入时调 clearTenantContext(sessionId)

type Sub = (data: string) => void;
const sessions = new Map<string, Set<Sub>>();
/**
 * 会话级历史消息（不含 system message，与 runAgentLoop 接口约定一致）。
 * 每个 session 对应一条 user/assistant/tool 消息的有序列表：
 *   - POST /sessions 创建时空数组
 *   - POST /messages 每轮：读旧 history → 传 runAgentLoop → 回调写回最新 messages（剔除 system）
 *   - 修复「2 分钟后继续失忆」：history 不落盘但在 bridge 进程存活期间跨 turn 保留
 */
const sessionHistories = new Map<string, Message[]>();
// session 级租户上下文（sessionTenants）已抽到 src/auth/tenant-context.ts，
// 验签后 setTenantContext 写入，startAgentLoop 用 resolveTenantForMcp 取（未命中 hard fail）

function sseHead(res: ServerResponse) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
}

// ── T4.5 · Agent loop 接 SSE ──────────────────────────────────────────
// 启动时构造 LLM + MCP client；按优先级尝试，全部失败则回退 MockLLM。
//
// 优先级（LLM_PROVIDER 环境变量控制）：
//   - "grok"     : Grok → CodeBuddy → Mock（Grok 优先，需 CLIProxyAPI 活着）
//   - "codebuddy": CodeBuddy → Mock（默认，不等待 Grok）
//   - "auto"     : Grok → CodeBuddy → Mock（自动选，Grok 活着就用）
//
// 注意：Grok 只是 LLM 后端之一，loop 零改动；CLIProxyAPI 未启动时自动降级。
async function buildLLM(): Promise<LLMClient> {
  const provider = process.env.LLM_PROVIDER ?? "codebuddy";
  const errors: string[] = [];

  const tryGrok = async (timeoutMs = 3000): Promise<LLMClient | null> => {
    try {
      const client = GrokClient.fromEnv();
      const alive = await client.ping(timeoutMs);
      if (!alive) {
        errors.push("GrokClient: CLIProxyAPI ping failed (not running?)");
        return null;
      }
      return client;
    } catch (e) {
      errors.push(`GrokClient: ${(e as Error).message}`);
      return null;
    }
  };

  // Grok 优先路径
  if (provider === "grok" || provider === "auto") {
    const grok = await tryGrok(provider === "grok" ? 3000 : 1000);
    if (grok) return grok;
  }

  // CodeBuddy 路径
  try {
    return CodeBuddyClient.fromEnv();
  } catch (e) {
    errors.push(`CodeBuddyClient: ${(e as Error).message}`);
  }

  // Grok 兜底路径（仅 provider=grok 明确指定时，降级前再试一次）
  if (provider === "grok") {
    const grok = await tryGrok(3000);
    if (grok) return grok;
  }

  console.warn(`[agent-bridge] 所有 LLM 初始化失败，回退 MockLLM:\n${errors.map((x) => "  - " + x).join("\n")}`);
  return new MockLLMClient({ steps: seoDemoScript(), name: "mock-fallback" });
}

// MCP 实例池逻辑抽到 src/mcp/pool.ts（getMcpForTenant + toAdminUrl），
// 探针可独立 import 验路由隔离，不触发 server.ts 的 createServer 副作用。

/**
 * Demo event sequence mirroring apps/web/lib/demo-events.ts. Each entry carries a
 * `delay` (ms) applied before it is broadcast to the session's SSE subscribers.
 */
const demoEvents: { delay: number; event: Record<string, unknown> }[] = [
  { delay: 300, event: { type: "meta", totalTools: 5 } },
  { delay: 200, event: { type: "thinking", on: true } },
  { delay: 1200, event: { type: "thinking", on: false } },
  {
    delay: 300,
    event: {
      type: "message",
      role: "agent",
      content:
        '收到。品牌更名是本次会话的<strong>前置约束</strong>，我会先固化实体，再做可见度诊断与结构化补齐。执行计划如下：',
    },
  },
  {
    delay: 400,
    event: {
      type: "plan",
      items: [
        "全站品牌实体更新 → 壶天（schema / OG / sitemap）",
        "运行 SEO / GEO 综合诊断",
        "追踪 AI 引用来源与情感倾向",
        "补齐 Product 结构化数据（JSON-LD）",
        "提交语义站点地图并验证收录",
      ],
    },
  },
  { delay: 700, event: { type: "plan_update", done: 0, current: 0 } },
  { delay: 200, event: { type: "tool_start", id: "t1", name: "entity_rename", args: 'from="天启芯 / Tikchip" → to="壶天"' } },
  {
    delay: 1800,
    event: {
      type: "tool_end",
      id: "t1",
      ok: true,
      durationMs: 1800,
      output: {
        checks: [
          { ok: true, text: "命中 37 个文件 · 替换 428 处（schema / OG / sitemap / 页脚）" },
          { ok: true, text: "实体主键已切换 → wikidata:壶天 (Hutian)" },
          { ok: true, text: "旧品牌名 301 重定向规则已写入 redirects.conf" },
        ],
      },
    },
  },
  { delay: 300, event: { type: "plan_update", done: 1, current: 1 } },
  { delay: 200, event: { type: "tool_start", id: "t2", name: "run_diagnosis", args: "target=hutian.com/products/tc-diode-001" } },
  {
    delay: 1600,
    event: {
      type: "tool_end",
      id: "t2",
      ok: true,
      durationMs: 1600,
      output: {
        meters: [
          { label: "传统 SEO", value: 64, color: "amber" },
          { label: "生成式 GEO", value: 92, color: "teal" },
        ],
        checks: [
          { ok: true, text: "实体清晰度 — 通过" },
          { ok: true, text: "语义链接 — 通过" },
          { ok: false, text: "结构化数据缺失 — Product 缺少 gtin / price / sameAs" },
        ],
      },
    },
  },
  { delay: 300, event: { type: "plan_update", done: 2, current: 2 } },
  { delay: 200, event: { type: "tool_start", id: "t3", name: "trace_citations", args: "window=30d · engines=all" } },
  {
    delay: 1700,
    event: {
      type: "tool_end",
      id: "t3",
      ok: true,
      durationMs: 1700,
      output: {
        citations: [
          { engine: "DeepSeek-V3", share: 42, tag: "ds", note: "主要来源" },
          { engine: "GPT-4o", share: 28, tag: "gpt", note: "次要权威" },
          { engine: "Kimi", share: 15, tag: "kimi", note: "提及" },
          { engine: "其他", share: 15, tag: "oth", note: "长尾" },
        ],
        total: 2410,
        sentiment: "正面 87%",
        growth: "+12.5%",
      },
    },
  },
  { delay: 300, event: { type: "plan_update", done: 3, current: 3 } },
  { delay: 200, event: { type: "thinking", on: true } },
  { delay: 1000, event: { type: "thinking", on: false } },
  {
    delay: 300,
    event: {
      type: "message",
      role: "agent",
      content:
        '诊断结论：GEO 表现强劲（<span class="text-amber font-bold">92%</span>），但 <code>Product</code> 结构化数据缺 <code>gtin / price / sameAs</code>，会拉低生成式引擎的<strong>事实采纳率</strong>。现在写入修补 —— 注意右侧面板。',
    },
  },
  { delay: 600, event: { type: "tool_start", id: "t4", name: "edit_file", args: "schema/product.jsonld" } },
  {
    delay: 400,
    event: {
      type: "diff",
      data: {
        file: "schema/product.jsonld",
        additions: 9,
        deletions: 2,
        lines: [
          { no: 1, text: "{", kind: "ctx" },
          { no: 2, text: '  "@context": "https://schema.org",', kind: "ctx" },
          { no: 3, text: '  "@type": "Product",', kind: "ctx" },
          { no: 4, text: '  "name": "半导体二极管",', kind: "ctx" },
          { no: 5, text: '  "brand": "Tikchip",', kind: "del" },
          { no: 5, text: '  "brand": "壶天",', kind: "add" },
          { no: 6, text: '  "description": "高性能半导体器件，适用于工业控制与物联网。",', kind: "ctx" },
          { no: 7, text: '  "sku": "TC-DIODE-001",', kind: "ctx" },
          { no: 8, text: '  "gtin": "6970000000017",', kind: "add" },
          { no: 9, text: '  "sameAs": ["https://www.wikidata.org/wiki/Q128888"],', kind: "add" },
          { no: 10, text: '  "offers": {', kind: "ctx" },
          { no: 11, text: '    "@type": "Offer",', kind: "ctx" },
          { no: 12, text: '    "availability": "https://schema.org/InStock"', kind: "del" },
          { no: 12, text: '    "availability": "https://schema.org/InStock",', kind: "add" },
          { no: 13, text: '    "price": "12.80",', kind: "add" },
          { no: 14, text: '    "priceCurrency": "CNY"', kind: "add" },
          { no: 15, text: "  },", kind: "ctx" },
          { no: 16, text: '  "subjectOf": {', kind: "add" },
          { no: 17, text: '    "@type": "TechArticle",', kind: "add" },
          { no: 18, text: '    "name": "工业控制选型指南"', kind: "add" },
          { no: 19, text: "  }", kind: "add" },
          { no: 20, text: "}", kind: "ctx" },
        ],
      },
    },
  },
  {
    delay: 1100,
    event: {
      type: "tool_end",
      id: "t4",
      ok: true,
      durationMs: 1500,
      output: {
        checks: [
          { ok: true, text: "schema/product.jsonld  +9 / −2 — 右侧 Diff 面板已高亮" },
          { ok: true, text: "brand 字段统一为「壶天」，补充 gtin / price / sameAs / subjectOf" },
          { ok: true, text: "JSON-LD 语法校验通过 · 富媒体结果资格 ✓" },
        ],
      },
    },
  },
  { delay: 300, event: { type: "plan_update", done: 4, current: 4 } },
  { delay: 200, event: { type: "tool_start", id: "t5", name: "submit_sitemap", args: "semantic=true · targets=google,bing" } },
  { delay: 400, event: { type: "terminal", line: '<span class="text-teal">➜</span> hutian deploy --sitemap semantic.xml --targets google,bing' } },
  { delay: 600, event: { type: "terminal", line: '<span class="text-amber">↑</span> 1,284 URLs · IndexNow <span class="text-green">200 OK</span> <span class="text-faint">· 312ms</span>' } },
  {
    delay: 900,
    event: {
      type: "tool_end",
      id: "t5",
      ok: true,
      durationMs: 1500,
      output: {
        checks: [
          { ok: true, text: "解析 1,284 个 URL（含 96 个实体锚点）" },
          { ok: true, text: "IndexNow 提交 → Google / Bing · 200 OK · 312ms" },
          { ok: true, text: "抓取队列已预热，预计 40 分钟内完成再索引" },
        ],
      },
    },
  },
  { delay: 300, event: { type: "plan_update", done: 5, current: 5 } },
  { delay: 200, event: { type: "thinking", on: true } },
  { delay: 1000, event: { type: "thinking", on: false } },
  {
    delay: 300,
    event: {
      type: "stats",
      items: [
        { label: "搜索流量", value: 89, prefix: "+", suffix: "%", accent: "amber", sub: "▲ 30 天环比" },
        { label: "GEO 饱和度", value: 92, suffix: "%", accent: "teal" },
        { label: "AI 引用量", value: 2410, accent: "violet", sub: "DeepSeek 占 42%" },
        { label: "引用增速", value: 12.5, dec: 1, prefix: "+", suffix: "%", accent: "green", sub: "▲ 周环比" },
      ],
    },
  },
  {
    delay: 300,
    event: {
      type: "message",
      role: "agent",
      content:
        '全部完成 ✅ 本次会话共执行 <strong>5 个工具调用</strong>。建议下一步：<br/>1. 为「壶天」注册 Wikidata 品牌实体条目，强化 sameAs 证据链<br/>2. 产品页追加 FAQPage 结构化数据，抢占生成式引用位<br/>3. 每周一 09:00 自动生成 GEO 引用周报并推送',
    },
  },
  { delay: 200, event: { type: "done" } },
];

/** Tracks active demo timers per session so repeated triggers don't stack. */
const demoTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

function broadcast(id: string, event: Record<string, unknown>) {
  const subs = sessions.get(id);
  if (!subs) return;
  const data = JSON.stringify(event);
  for (const sub of subs) sub(data);
}

function startDemo(id: string) {
  // Cancel any in-flight demo for this session.
  const existing = demoTimers.get(id);
  if (existing) for (const t of existing) clearTimeout(t);
  if (!sessions.has(id)) sessions.set(id, new Set());

  const timers: ReturnType<typeof setTimeout>[] = [];
  let acc = 0;
  for (const { delay, event } of demoEvents) {
    acc += delay;
    timers.push(setTimeout(() => broadcast(id, event), acc));
  }
  demoTimers.set(id, timers);
  // Clean up the timer list once the sequence finishes.
  timers.push(
    setTimeout(() => {
      demoTimers.delete(id);
    }, acc + 50),
  );
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && url === "/sessions") {
    // 验签 X-Tenant-Token（生产强制；dev 未配 key 放行）
    const tokenHead = req.headers["x-tenant-token"] as string | undefined;
    const verified = verifyTenantToken(tokenHead);
    if (isTokenEnforced() && !verified.ok) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "tenant token verification failed", reason: verified.reason }));
    }
    const id = crypto.randomUUID();
    sessions.set(id, new Set());
    sessionHistories.set(id, []);
    setTenantContext(id, verified.ok ? verified.payload : null);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ id }));
  }

  const eventsMatch = url.match(/^\/sessions\/([^/]+)\/events$/);
  if (req.method === "GET" && eventsMatch) {
    const id = eventsMatch[1];
    // P1-6 修复：SSE 订阅必须验签，防旁听他人会话
    const tokenHead = req.headers["x-tenant-token"] as string | undefined;
    const verified = verifyTenantToken(tokenHead);
    if (isTokenEnforced() && !verified.ok) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "tenant token verification failed", reason: verified.reason }));
    }
    // P1-7 修复：校验会话归属——已存在的 session 若绑定了不同 tenant，拒绝订阅
    if (verified.ok && sessions.has(id)) {
      const existing = resolveTenantForMcp(id);
      if (existing.ok && existing.payload && existing.payload.tenant_id !== verified.payload!.tenant_id) {
        res.writeHead(403, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "session belongs to a different tenant" }));
      }
    }
    if (!sessions.has(id)) sessions.set(id, new Set());
    if (!sessionHistories.has(id)) sessionHistories.set(id, []);
    const subs = sessions.get(id)!;
    sseHead(res);
    const sub: Sub = (data) => res.write(`data: ${data}\n\n`);
    subs.add(sub);
    const ping = setInterval(() => res.write(`: ping\n\n`), 15000);
    req.on("close", () => {
      subs.delete(sub);
      clearInterval(ping);
    });
    return;
  }

  const demoMatch = url.match(/^\/sessions\/([^/]+)\/demo$/);
  if (req.method === "POST" && demoMatch) {
    const id = demoMatch[1];
    if (!sessions.has(id)) sessions.set(id, new Set());
    if (!sessionHistories.has(id)) sessionHistories.set(id, []);
    startDemo(id);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, id, events: demoEvents.length }));
  }

  // T4.5 · POST /sessions/:id/messages —— 启动 runAgentLoop，事件推 SSE
  const msgMatch = url.match(/^\/sessions\/([^/]+)\/messages$/);
  if (req.method === "POST" && msgMatch) {
    const id = msgMatch[1];
    // 验签 X-Tenant-Token（生产强制；dev 未配 key 放行）
    const tokenHead = req.headers["x-tenant-token"] as string | undefined;
    const verified = verifyTenantToken(tokenHead);
    if (isTokenEnforced() && !verified.ok) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "tenant token verification failed", reason: verified.reason }));
    }
    if (!sessions.has(id)) sessions.set(id, new Set());
    if (!sessionHistories.has(id)) sessionHistories.set(id, []);
    // P1-7 修复：校验会话归属——已有 session 绑定了不同 tenant 时拒绝，防跨租户历史污染
    if (verified.ok && sessions.has(id)) {
      const existing = resolveTenantForMcp(id);
      if (existing.ok && existing.payload && existing.payload.tenant_id !== verified.payload!.tenant_id) {
        res.writeHead(403, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "session belongs to a different tenant" }));
      }
    }
    // 更新 session 的租户上下文（token 可能已刷新，以最新为准）
    if (verified.ok) setTenantContext(id, verified.payload);
    const body = await readBody(req);
    let prompt = "";
    try {
      const parsed = JSON.parse(body) as { prompt?: string; message?: string };
      prompt = parsed.prompt ?? parsed.message ?? "";
    } catch {
      prompt = body;
    }
    if (!prompt) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "prompt is required" }));
    }
    // 异步启动 loop，立即返回（事件走 SSE）
    startAgentLoop(id, prompt).catch((e) => {
      console.error(`[agent-bridge] loop error for session ${id}:`, e);
      broadcast(id, { type: "message", role: "agent", content: `⚠️ 内部错误：${(e as Error).message}` });
      broadcast(id, { type: "done" } satisfies AgentEvent);
    });
    res.writeHead(202, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, id, mode: "agent-loop" }));
  }

  res.writeHead(404);
  res.end("not found");
}

/** T4.5 · 启动 agent loop，把 AgentEvent 推到 session 的 SSE 订阅者 */
async function startAgentLoop(sessionId: string, prompt: string) {
  const llm = await buildLLM();
  // ADR 路由隔离 + 雷三：从 sessionTenants 解析租户上下文
  //   - undefined（未命中）→ hard fail，不调 MCP（防"未验证 session 走默认实例串数据"）
  //   - null（dev 放行）→ 走默认实例
  //   - payload → 走 payload.sitebase_base_url 对应实例
  const resolved = resolveTenantForMcp(sessionId);
  if (!resolved.ok) {
    console.error(`[agent-bridge] session ${sessionId} hard fail: ${resolved.reason}`);
    broadcast(sessionId, {
      type: "message",
      role: "agent",
      content: `⚠️ 租户上下文缺失，拒绝执行：${resolved.reason}`,
    });
    broadcast(sessionId, { type: "done" });
    return;
  }
  const mcp = getMcpForTenant(resolved.sitebaseUrl);
  const prevHistory = sessionHistories.get(sessionId) ?? [];
  const sitebaseLog = resolved.sitebaseUrl ?? "default(dev)";
  console.log(
    `[agent-bridge] session ${sessionId} start loop (llm=${llm.name}) | prevHistory.len=${prevHistory.length} | sitebase=${sitebaseLog}`,
  );

  // 先推一条 user message（前端 chat 栏显示用户输入）
  broadcast(sessionId, { type: "message", role: "user", content: prompt });

  for await (const ev of runAgentLoop(
    {
      prompt,
      history: prevHistory,
      // loop 每次 messages 变动时写回 —— 存 NON-SYSTEM 消息（messages[0] 永远是 system，过滤掉）
      onMessagesUpdated: (msgs) => {
        const nonSystem = msgs.filter((m) => m.role !== "system");
        sessionHistories.set(sessionId, nonSystem);
      },
    },
    { llm, mcp },
  )) {
    broadcast(sessionId, ev);
  }
}

const port = Number(process.env.PORT ?? 4317);
createServer(route).listen(port, () => console.log(`[agent-bridge] :${port}`));
