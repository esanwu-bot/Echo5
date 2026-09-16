/**
 * SenseNova tool_calls 探针
 *
 * 用途：验证商汤 SenseNova 的 /v1/chat/completions 是否对指定模型返回结构化 tool_calls。
 *
 * 绿 → SenseNovaClient 可用，可设 LLM_PROVIDER=sensenova 接真 LLM
 * 红 → 确认换模型或检查 API Key / 网络
 *
 * 用法：
 *   1. 在 hutian-seo-geo-agent/ 下 cp .env.example .env，填入真实 SENSENOVA_API_KEY
 *   2. cd apps/agent-bridge && npx tsx src/llm/probe-sensenova.ts
 */
import { SenseNovaClient } from "./sensenova-client.ts";
import type { ToolSchema } from "./types.ts";

// 一个最小的内容差距分析工具，用来测 tool_calls
const probeTool: ToolSchema = {
  type: "function",
  function: {
    name: "analyze_content_gap",
    description: "SERP content gap analysis. Scrapes Google SERP for a keyword, fetches top competitor pages, returns a content gap matrix and editorial brief.",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Target search keyword" },
        my_url: { type: "string", description: "Your page URL (optional)", default: "" },
        engine: { type: "string", description: "Search engine", default: "google" },
        gl: { type: "string", description: "Country/region code", default: "us" },
        num_results: { type: "integer", description: "Number of top results (1-10)", default: 5 },
      },
      required: ["keyword"],
    },
  },
};

async function main() {
  console.log("=== SenseNova tool_calls probe ===\n");

  let client: SenseNovaClient;
  try {
    client = SenseNovaClient.fromEnv();
  } catch (e) {
    console.error("!!! 无法构造 SenseNovaClient:", (e as Error).message);
    console.error("    请检查 .env 中 SENSENOVA_API_KEY / SENSENOVA_API_BASE / SENSENOVA_MODEL");
    process.exit(2);
  }

  console.log(`base_url = ${(client as unknown as { baseUrl: string }).baseUrl}`);
  console.log(`model   = ${client.model}`);
  console.log("");

  console.log(">>> 发送带 tools 的最小请求...");
  const start = Date.now();
  try {
    const resp = await client.chat({
      messages: [
        {
          role: "system",
          content: "你是 SEO 内容差距分析助手。收到关键词后必须调用 analyze_content_gap 工具，不要直接回答。",
        },
        { role: "user", content: "帮我分析关键词 \"electric tricycle\" 的内容差距" },
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

    if (resp.toolCalls.length > 0) {
      const tc = resp.toolCalls[0];
      const hasId = typeof tc.id === "string" && tc.id.length > 0;
      const hasName = tc.name === "analyze_content_gap";
      const hasArgs = typeof tc.args === "object" && tc.args !== null && "keyword" in tc.args;
      console.log("=== 判定 ===");
      console.log(`  toolCalls[0].id   : ${hasId ? "OK" : "MISSING"} (${JSON.stringify(tc.id)})`);
      console.log(`  toolCalls[0].name : ${hasName ? "OK" : "MISSING"} (${tc.name})`);
      console.log(`  toolCalls[0].args : ${hasArgs ? "OK" : "MISSING"} (${JSON.stringify(tc.args)})`);
      if (hasId && hasName && hasArgs) {
        console.log("\n✅ GREEN — SenseNovaClient 返回结构化 tool_calls，可设 LLM_PROVIDER=sensenova");
        process.exit(0);
      } else {
        console.log("\n⚠️  PARTIAL — toolCalls 存在但字段不全，需检查");
        process.exit(1);
      }
    } else {
      console.log("=== 判定 ===");
      console.log("  toolCalls 为空 — LLM 没有调工具，可能：");
      console.log("  1) 模型不支持 tool calling（换模型试）");
      console.log("  2) prompt 不够强（system prompt 已强约束，应排除）");
      console.log("  3) tool_choice 未生效（检查 SenseNovaClient.chat 的 tool_choice 字段）");
      console.log("\n❌ RED — 跑不通 tool calling，需换模型或检查配置");
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
