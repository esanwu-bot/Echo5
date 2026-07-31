/**
 * T6.3b 判官 ⑤ 激活 · MCP 实例池路由隔离探针
 *
 * 验 ADR-cross-lang 在 bridge 侧的落地：不同 sitebase_base_url → 不同 MCP 实例（不同 Python 子进程）。
 * Python MCP 零改动（从 env 读 url），隔离由 bridge 实例池 + env 覆盖实现。
 *
 * 断言：
 *   ⑤a 不同 url → 不同实例（引用不等，证明路由隔离）
 *   ⑤b 同 url → 同实例（复用，不重复 spawn）
 *   ⑤c toAdminUrl 转换正确（public /api/v1 → admin /api/admin）
 *   ⑤d 无 url → 默认实例（dev 向后兼容）
 *   ⑤e LRU 超限淘汰（池大小不无限增长）
 *
 * 边界：本探针验实例池逻辑隔离（不同 url → 不同实例），
 *   不验端到端 siteBase 路由（需起 mock siteBase admin login + cms 接口，下轮接）。
 *   StdioMcpClient 构造时 lazy 不连接，探针创建多实例不会真 spawn Python，安全。
 *
 * 运行：pnpm --filter @hutian/agent-bridge run probe:tenant-routing
 */
import { getMcpForTenant, toAdminUrl, poolSize, clearPoolForTest } from "./pool.ts";

type Assert = { name: string; pass: boolean; detail: string };

function assert(name: string, pass: boolean, detail: string): Assert {
  return { name, pass, detail };
}

async function main() {
  const asserts: Assert[] = [];

  await clearPoolForTest();

  // ── ⑤c toAdminUrl 转换正确 ──
  const cases: Array<[string, string, string]> = [
    ["http://localhost:8001/api/v1", "http://localhost:8001/api/admin", "public /api/v1 → admin /api/admin"],
    ["http://localhost:8002/api/admin", "http://localhost:8002/api/admin", "已是 admin 路径原样"],
    ["http://localhost:8003", "http://localhost:8003/api/admin", "无后缀拼 /api/admin"],
    ["http://localhost:8004/", "http://localhost:8004/api/admin", "尾斜杠去后拼"],
  ];
  for (const [input, expected, label] of cases) {
    const got = toAdminUrl(input);
    asserts.push(assert(`⑤c ${label}`, got === expected, `input=${input} got=${got} expect=${expected}`));
  }

  // ── ⑤a 不同 url → 不同实例（路由隔离核心断言）──
  const urlA = "http://localhost:8001/api/v1";
  const urlB = "http://localhost:8002/api/v1";
  const mcpA = getMcpForTenant(urlA);
  const mcpB = getMcpForTenant(urlB);
  asserts.push(assert(
    "⑤a 不同 sitebase_base_url → 不同 MCP 实例（引用不等）",
    mcpA !== mcpB,
    `mcpA===mcpB? ${mcpA === mcpB} | poolSize=${poolSize()}`,
  ));

  // ── ⑤b 同 url → 同实例（复用）──
  const mcpA2 = getMcpForTenant(urlA);
  asserts.push(assert(
    "⑤b 同 sitebase_base_url → 同 MCP 实例（复用不重复 spawn）",
    mcpA === mcpA2,
    `mcpA===mcpA2? ${mcpA === mcpA2} | poolSize=${poolSize()}`,
  ));

  // ── ⑤d 无 url → 默认实例（dev 向后兼容）──
  const mcpDefault1 = getMcpForTenant(null);
  const mcpDefault2 = getMcpForTenant(undefined);
  asserts.push(assert(
    "⑤d 无 url（null/undefined）→ 默认实例且相同",
    mcpDefault1 === mcpDefault2,
    `default1===default2? ${mcpDefault1 === mcpDefault2} | poolSize=${poolSize()}`,
  ));
  // 默认实例应与 A/B 不同
  asserts.push(assert(
    "⑤d 默认实例 ≠ 租户实例（默认走 env 原值，不与租户实例混）",
    mcpDefault1 !== mcpA && mcpDefault1 !== mcpB,
    `default!==A && default!==B? ${mcpDefault1 !== mcpA && mcpDefault1 !== mcpB}`,
  ));

  // ── ⑤e LRU 超限淘汰（池大小 ≤ MCP_POOL_MAX）──
  // 当前池已有 3 个（A、B、default），再造 6 个不同 url 的实例，总 9 个 > 8，应淘汰到 8
  for (let i = 3; i <= 8; i++) {
    getMcpForTenant(`http://localhost:${9000 + i}/api/v1`);
  }
  const sizeAfterOverflow = poolSize();
  asserts.push(assert(
    "⑤e LRU 超限淘汰（poolSize ≤ MCP_POOL_MAX=8）",
    sizeAfterOverflow <= 8,
    `poolSize after overflow=${sizeAfterOverflow} (expect ≤ 8)`,
  ));

  await clearPoolForTest();

  // ── 汇总 ──
  let passed = 0, failed = 0;
  for (const a of asserts) {
    const status = a.pass ? "PASS" : "FAIL";
    if (a.pass) passed++; else failed++;
    console.log(`  [${status}] ${a.name}`);
    console.log(`         ${a.detail}`);
  }
  console.log(`\nprobe:tenant-routing: ${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
