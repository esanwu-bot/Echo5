/**
 * Grok 命门探针 1/2：派生 schema + 结构化 tool_calls
 *
 * 等价 probe-derived-schema.ts，只是把 LLM 换成 GrokClient。
 * 断言：grok 看到 5 个 MCP 工具后，对"诊断 example.com"返回
 *        tool_calls(name=run_diagnosis, args 对象, args.url, id, finishReason=tool_calls)。
 *
 * 用法：
 *   1. 启动 grok CLIProxyAPI（默认 http://localhost:52415/v1）
 *   2. cd apps/agent-bridge && npm run probe:grok-derived
 *
 * 探针红 → Grok 不能作为默认 LLM，保持 LLM_PROVIDER=codebuddy。
 */
import { GrokClient } from "./grok-client.ts";
import { StdioMcpClient } from "../mcp/client.ts";

async function main() {
  console.log("=== Grok 派生 schema 探针 ===\n");

  const llm = GrokClient.fromEnv();
  console.log(`[probe] model=${llm.model} baseUrl=${process.env.GROK_PROXY_BASE ?? "http://localhost:52415/v1"}`);

  // 1. ping CLIProxyAPI
  const alive = await llm.ping(3000);
  console.log(`[probe] CLIProxyAPI alive=${alive}`);
  if (!alive) {
    console.error("!!! CLIProxyAPI 未响应。请确认 grok 本地代理已启动。");
    process.exit(2);
  }

  // 2. 派生五工具 schema
  const mcp = new StdioMcpClient();
  const tools = await mcp.listToolSchemas();
  console.log(`[probe] derived ${tools.length} tools: ${tools.map((t) => t.function.name).join(", ")}\n`);

  // 3. 调 grok
  const prompt = "请诊断 https://example.com 的 SEO 情况";
  console.log(`[probe] prompt: ${prompt}\n`);
  const res = await llm.chat({
    messages: [
      { role: "system", content: "你是一个 SEO/GEO 诊断助手，只能调用提供的工具。" },
      { role: "user", content: prompt },
    ],
    tools,
  });
  await mcp.close().catch(() => {});

  console.log("[probe] response:");
  console.log(`  content: ${res.content?.slice(0, 80) ?? "(null)"}`);
  console.log(`  finishReason: ${res.finishReason}`);
  console.log(`  toolCalls.length: ${res.toolCalls.length}`);
  res.toolCalls.forEach((tc, i) => {
    console.log(`  toolCalls[${i}]: id=${tc.id} name=${tc.name} args=${JSON.stringify(tc.args)}`);
  });

  // 4. 断言
  const tc = res.toolCalls[0];
  const checks = [
    { name: "finishReason=tool_calls", ok: res.finishReason === "tool_calls" },
    { name: "toolCalls.length > 0", ok: res.toolCalls.length > 0 },
    { name: "首个 tool name=run_diagnosis", ok: tc?.name === "run_diagnosis" },
    { name: "args 是对象", ok: tc?.args && typeof tc.args === "object" },
    { name: "args.url 存在", ok: typeof tc?.args?.url === "string" && (tc.args.url as string).includes("example.com") },
    { name: "tool_call_id 非空", ok: !!tc?.id },
  ];

  console.log("\n=== 断言 ===");
  let allOk = true;
  for (const c of checks) {
    console.log(`  ${c.ok ? "✅" : "❌"} ${c.name}`);
    if (!c.ok) allOk = false;
  }

  if (allOk) {
    console.log("\n✅ GREEN — Grok 支持派生 schema 结构化 tool_calls");
    process.exit(0);
  } else {
    console.log("\n❌ RED — Grok 不能作为默认 LLM");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("!!! 探针异常:", e);
  process.exit(1);
});
