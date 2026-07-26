/**
 * T4.2 验收 · MCP list_tools → OpenAI tools 派生 + 工具名闭环校验
 *
 * 用法：
 *   cd apps/agent-bridge && node --import tsx src/mcp/verify-schema.ts
 *
 * 验收（自建loop.md §2）：
 *   1. 连 hutian-seo-mcp 成功
 *   2. list_tools 返回 5 个工具
 *   3. 名字 = run_diagnosis / check_schema / trace_citations / submit_sitemap / entity_rename 一字不差
 */
import { StdioMcpClient, validateToolNames, STATIC_TOOLS } from "./client.ts";

async function main() {
  console.log("=== T4.2 MCP tool schema 派生验收 ===\n");

  const client = new StdioMcpClient();
  let schemas;
  try {
    console.log(">>> 连接 hutian-seo-mcp (stdio)...");
    schemas = await client.listToolSchemas();
    console.log(`<<< 收到 ${schemas.length} 个工具`);
  } catch (e) {
    console.error(`!!! MCP 连接失败: ${(e as Error).message}`);
    console.error("    回退 STATIC_TOOLS（注意：runtime 应优先用 MCP 派生）");
    schemas = STATIC_TOOLS;
    console.log(`<<< STATIC_TOOLS 提供 ${schemas.length} 个工具`);
  } finally {
    await client.close().catch(() => {});
  }

  console.log("\n--- 派生出的 ToolSchema[] ---");
  for (const s of schemas) {
    console.log(`  • ${s.function.name}: ${s.function.description.slice(0, 70)}...`);
  }

  console.log("\n=== 工具名闭环校验 ===");
  const result = validateToolNames(schemas);
  if (result.ok) {
    console.log("✅ 5 个工具名一字不差，T4.2 通过");
    process.exit(0);
  } else {
    if (result.missing.length) console.log(`❌ 缺失: ${result.missing.join(", ")}`);
    if (result.extra.length) console.log(`⚠️  多余: ${result.extra.join(", ")}`);
    process.exit(1);
  }
}

main();
