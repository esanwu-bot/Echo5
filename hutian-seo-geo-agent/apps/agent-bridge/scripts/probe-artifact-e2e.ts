/**
 * E2E 探针：mock LLM 强制调用 analyze_content_gap，跑完整 runAgentLoop，
 * 断言 SSE 事件流中出现 artifact_created 且结构正确。
 *
 * 依赖：.env 中 SERPER_API_KEY（真跑 Serper）+ hutian-seo-mcp 在 PATH。
 */
import { StdioMcpClient } from "../src/mcp/client.ts";
import { runAgentLoop } from "../src/loop/run-agent.ts";
import type { LLMClient, LLMResponse, Message, ChatOptions } from "../src/llm/types.ts";

class MockLLM implements LLMClient {
  readonly name = "mock-gap";
  private callCount = 0;

  async chat(_opts: ChatOptions): Promise<LLMResponse> {
    this.callCount++;
    if (this.callCount === 1) {
      // 第一轮：调 analyze_content_gap
      return {
        content: null,
        toolCalls: [
          {
            id: "call_gap_1",
            name: "analyze_content_gap",
            args: { keyword: "electric tricycle", num_results: 3 },
          },
        ],
        finishReason: "tool_calls",
      };
    }
    // 第二轮：收工
    return {
      content: "差距分析完成，完整报告见 Artifacts。",
      toolCalls: [],
      finishReason: "stop",
    };
  }
}

async function main() {
  console.log("=== E2E 探针：artifact_created 事件流验证 ===\n");

  const llm = new MockLLM();
  const mcp = new StdioMcpClient({ env: { ...process.env, SERPER_API_KEY: process.env.SERPER_API_KEY } });
  console.log(">>> LLM = mock-gap (强制 analyze_content_gap)");
  console.log(">>> MCP = hutian-seo-mcp (stdio, 真跑 Serper)\n");

  const events: Array<{ type: string } & Record<string, unknown>> = [];
  const sessionId = "probe-artifact-e2e";

  try {
    for await (const ev of runAgentLoop(
      { prompt: "分析 electric tricycle 竞争差距", sessionId: "probe-artifact-e2e" } as never,
      { llm, mcp },
    )) {
      events.push(ev as never);
    }
  } catch (e) {
    console.error(`!!! loop 异常: ${(e as Error).message}`);
    process.exit(1);
  }

  // ── 断言 ──
  const artifactEvents = events.filter((e) => e.type === "artifact_created");
  console.log(`>>> 事件总数: ${events.length}`);
  console.log(`>>> artifact_created 数: ${artifactEvents.length}`);

  if (artifactEvents.length === 0) {
    console.error("❌ FAIL: 未捕获到 artifact_created 事件");
    console.error("事件序列:", events.map((e) => e.type).join(" → "));
    process.exit(1);
  }

  const art = artifactEvents[0] as any;
  console.assert(art.kind === "content_gap_report", `kind=${art.kind}`);
  console.assert(typeof art.artifact_id === "string", "artifact_id 存在");
  console.assert(art.source_tool === "analyze_content_gap", "source_tool 正确");
  console.assert(typeof art.created_at === "string", "created_at 存在");

  const data = art.data as any;
  console.log("\n>>> data keys:", Object.keys(data));
  console.log(">>> data sample:", JSON.stringify(data).slice(0, 300));
  console.assert(Array.isArray(data.serp_results) && data.serp_results.length > 0, "serp_results 非空");
  console.assert(Array.isArray(data.competitor_analysis), "competitor_analysis 存在");

  // 不含竞品 markdown 全文
  const dataStr = JSON.stringify(data);
  console.assert(!/"markdown":"[^"]{100,}/.test(dataStr), "不含 markdown 全文");
  console.assert(!dataStr.includes("<html") && !dataStr.includes("<body"), "不含 HTML 正文");

  console.log(`\n✅ artifact_created 验证通过`);
  console.log(`   artifact_id: ${art.artifact_id}`);
  console.log(`   kind: ${art.kind}`);
  console.log(`   title: ${art.title}`);
  console.log(`   serp_results: ${data.serp_results.length} 条`);
  console.log(`   competitors: ${data.competitor_analysis.length} 个`);
  console.log(`   truncated: ${data.truncated ?? false}`);
  console.log(`\n事件序列: ${events.map((e) => e.type).join(" → ")}`);
}

main();
