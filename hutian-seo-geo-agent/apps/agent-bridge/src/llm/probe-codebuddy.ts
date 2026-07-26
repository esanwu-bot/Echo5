/**
 * T4.1 Gate · CodeBuddy tool_calls 探针
 *
 * 用途：在写完 CodeBuddyClient 后、跑 T4.3 真闭环前，验证 TokenHub 的
 * /v1/chat/completions 是否对 kimi-2.5 返回结构化 tool_calls。
 *
 * 绿 → CodeBuddyClient 可用，T4.3 直接接真 LLM
 * 红 → 确认换模型（deepseek-v4-flash / hy3-preview）或换后端
 *
 * 用法：
 *   1. 在 hutian-seo-geo-agent/ 下 cp .env.example .env，填入真实 CODEBUDDY_API_KEY
 *   2. cd apps/agent-bridge && npx tsx src/llm/probe-codebuddy.ts
 */
import { CodeBuddyClient } from "./codebuddy-client.ts";
import type { ToolSchema } from "./types.ts";

// 一个最小的 SEO 诊断工具，用来测 tool_calls
const probeTool: ToolSchema = {
  type: "function",
  function: {
    name: "run_diagnosis",
    description: "Run an SEO/GEO diagnosis on a URL. Returns SEO score, GEO score, and issues list.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to diagnose, e.g. https://example.com" },
      },
      required: ["url"],
    },
  },
};

async function main() {
  console.log("=== CodeBuddy tool_calls probe ===");

  let client: CodeBuddyClient;
  try {
    client = CodeBuddyClient.fromEnv();
  } catch (e) {
    console.error("!!! 无法构造 CodeBuddyClient:", (e as Error).message);
    console.error("    请检查 .env 中 CODEBUDDY_API_KEY / CODEBUDDY_API_BASE / CODEBUDDY_MODEL");
    process.exit(2);
  }

  console.log(`base_url = ${client["baseUrl" as keyof CodeBuddyClient]}`);
  console.log(`model   = ${client["model" as keyof CodeBuddyClient]}`);
  console.log("");

  console.log(">>> 发送带 tools 的最小请求...");
  const start = Date.now();
  try {
    const resp = await client.chat({
      messages: [
        {
          role: "system",
          content: "你是 SEO 诊断助手。收到 URL 后必须调用 run_diagnosis 工具，不要直接回答。",
        },
        { role: "user", content: "请诊断 https://example.com 的 SEO 情况" },
      ],
      tools: [probeTool],
    });
    const ms = Date.now() - start;

    console.log(`<<< ${ms}ms 收到响应`);
    console.log("--- LLMResponse ---");
    console.log("content      :", JSON.stringify(resp.content));
    console.log("finishReason :", resp.finishReason);
    console.log("toolCalls    :", JSON.stringify(resp.toolCalls, null, 2));
    console.log("");

    // 判定
    if (resp.toolCalls.length > 0) {
      const tc = resp.toolCalls[0];
      const hasId = typeof tc.id === "string" && tc.id.length > 0;
      const hasName = tc.name === "run_diagnosis";
      const hasArgs = typeof tc.args === "object" && tc.args !== null && "url" in tc.args;
      console.log("=== 判定 ===");
      console.log(`  toolCalls[0].id   : ${hasId ? "OK" : "MISSING"} (${JSON.stringify(tc.id)})`);
      console.log(`  toolCalls[0].name : ${hasName ? "OK" : "MISSING"} (${tc.name})`);
      console.log(`  toolCalls[0].args : ${hasArgs ? "OK" : "MISSING"} (${JSON.stringify(tc.args)})`);
      if (hasId && hasName && hasArgs) {
        console.log("\n✅ GREEN — CodeBuddyClient 返回结构化 tool_calls，T4.3 可接真 LLM");
        process.exit(0);
      } else {
        console.log("\n⚠️  PARTIAL — toolCalls 存在但字段不全，需检查");
        process.exit(1);
      }
    } else {
      console.log("=== 判定 ===");
      console.log("  toolCalls 为空 — LLM 没有调工具，可能：");
      console.log("  1) 模型不支持 tool calling（换 deepseek-v4-flash / hy3-preview 试）");
      console.log("  2) prompt 不够强（system prompt 已强约束，应排除）");
      console.log("  3) tool_choice 未生效（检查 CodeBuddyClient.chat 的 tool_choice 字段）");
      console.log("\n❌ RED — 跑不通 tool calling，T4.3 需换后端或换模型");
      process.exit(1);
    }
  } catch (e) {
    const ms = Date.now() - start;
    console.error(`<<< ${ms}ms 异常:`, (e as Error).message);
    console.error("\n❌ RED — 请求失败，检查 base_url / api_key / 网络");
    process.exit(1);
  }
}

main();
