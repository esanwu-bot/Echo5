/**
 * T4.2 出口门禁 · 派生 schema + 真 LLM 调工具
 *
 * 任务（自建loop.md T4.2 验收）：
 *  - 用 listToolSchemas() 从 hutian-seo-mcp 派生出 5 个工具的 OpenAI tools 数组
 *    （不是手写 schema！必须经 sanitizeForOpenAI 清洗）
 *  - 把派生出的 tools 喂给 CodeBuddy（deepseek-v4-flash），发"诊断 example.com"的 prompt
 *  - 期望 LLM 返回结构化 tool_calls[0].name === "run_diagnosis" 且 args.url 存在
 *
 * 绿 → T4.2 出口门禁通过，loop 骨架（T4.3）可接真 LLM
 * 红 → 派生 schema 有问题，回头查 sanitizeForOpenAI
 *
 * 用法：
 *   cd apps/agent-bridge && npm run probe:derived
 *
 * 依赖：
 *  - .env 中 CODEBUDDY_API_KEY
 *  - PATH 上有 hutian-seo-mcp 命令（pip install -e hutian-seo-plugin/mcp-server）
 */
import { StdioMcpClient, validateToolNames } from "../mcp/client.ts";
import { CodeBuddyClient } from "./codebuddy-client.ts";
import type { ToolSchema } from "./types.ts";

async function main() {
  console.log("=== T4.2 出口门禁：派生 schema + 真 LLM 调工具 ===\n");

  // ─── Step 1: 派生 schema ───────────────────────────────────────
  console.log(">>> Step 1: 从 hutian-seo-mcp 派生 ToolSchema[] ...");
  const mcp = new StdioMcpClient();
  let schemas: ToolSchema[];
  try {
    schemas = await mcp.listToolSchemas();
    console.log(`<<< 收到 ${schemas.length} 个工具`);
  } catch (e) {
    console.error(`!!! MCP 连接失败: ${(e as Error).message}`);
    console.error("    请确认 hutian-seo-mcp 在 PATH 上（pip install -e hutian-seo-plugin/mcp-server）");
    await mcp.close().catch(() => {});
    process.exit(2);
  } finally {
    // close 在最后做（避免 MCP server 提前退出影响 tool_calls）
  }

  // 工具名闭环校验
  const validate = validateToolNames(schemas);
  if (!validate.ok) {
    if (validate.missing.length) console.log(`  缺失: ${validate.missing.join(", ")}`);
    if (validate.extra.length) console.log(`  多余: ${validate.extra.join(", ")}`);
    console.error("\n❌ RED — 工具名闭环未过，先修 tools.py 注册");
    await mcp.close().catch(() => {});
    process.exit(1);
  }
  console.log("  ✅ 5 工具名一字不差");

  // dump 派生 schema 一眼看清洗效果
  console.log("\n--- 派生 schema 摘要 ---");
  for (const s of schemas) {
    const params = s.function.parameters as Record<string, any>;
    const props = Object.keys(params.properties ?? {});
    console.log(`  • ${s.function.name}`);
    console.log(`      required: ${JSON.stringify(params.required ?? [])}`);
    console.log(`      props   : ${props.join(", ") || "(无)"}`);
    console.log(`      $defs   : ${"$defs" in params ? "❌ 残留" : "✅ 已剥"}`);
    console.log(`      title   : ${"title" in params ? "❌ 残留" : "✅ 已剥"}`);
  }

  // ─── Step 2: 喂真 LLM ──────────────────────────────────────────
  console.log("\n>>> Step 2: 派生 schema 喂 CodeBuddy，发诊断 prompt ...");
  let llm: CodeBuddyClient;
  try {
    llm = CodeBuddyClient.fromEnv();
  } catch (e) {
    console.error(`!!! 无法构造 CodeBuddyClient: ${(e as Error).message}`);
    await mcp.close().catch(() => {});
    process.exit(2);
  }

  const start = Date.now();
  let resp;
  try {
    resp = await llm.chat({
      messages: [
        {
          role: "system",
          content:
            "你是 SEO 诊断助手。收到 URL 后必须调用 run_diagnosis 工具，不要直接回答。",
        },
        { role: "user", content: "请诊断 https://example.com 的 SEO 情况" },
      ],
      tools: schemas,
    });
  } catch (e) {
    console.error(`<<< ${Date.now() - start}ms 异常: ${(e as Error).message}`);
    await mcp.close().catch(() => {});
    process.exit(1);
  }
  const ms = Date.now() - start;
  console.log(`<<< ${ms}ms 收到响应`);

  console.log("\n--- LLMResponse ---");
  console.log("content      :", JSON.stringify(resp.content)?.slice(0, 200));
  console.log("finishReason :", resp.finishReason);
  console.log("toolCalls.length :", resp.toolCalls.length);
  if (resp.toolCalls.length > 0) {
    console.log("toolCalls[0] :", JSON.stringify(resp.toolCalls[0], null, 2));
  }

  // ─── Step 3: 判定 ──────────────────────────────────────────────
  console.log("\n=== 判定 ===");
  const tc = resp.toolCalls[0];
  const checks = {
    "toolCalls 非空": resp.toolCalls.length > 0,
    "tc.name === run_diagnosis": tc?.name === "run_diagnosis",
    "tc.args.url 存在": typeof tc?.args?.url === "string",
    "tc.id 非空": typeof tc?.id === "string" && tc.id.length > 0,
    "finishReason 合法": ["stop", "tool_calls", "length"].includes(resp.finishReason),
  };

  let allGreen = true;
  for (const [name, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? "✅" : "❌"} ${name}`);
    if (!ok) allGreen = false;
  }

  await mcp.close().catch(() => {});

  if (allGreen) {
    console.log("\n✅ GREEN — T4.2 出口门禁通过，T4.3 loop 骨架可接真 LLM");
    process.exit(0);
  } else {
    console.log("\n❌ RED — 派生 schema 喂 LLM 没产出有效 tool_calls，回头查 sanitizeForOpenAI");
    process.exit(1);
  }
}

main();
