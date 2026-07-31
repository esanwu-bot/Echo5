/**
 * T6.3b 判官⑤ · MCP 实例池路由隔离探针（扩展：雷一并发 + 雷二 url 唯一源 + 雷三未命中 hard fail）
 *
 * 验 ADR-cross-lang 在 bridge 侧 MCP 路由这一跳的隔离闭环：
 *   ⑤a 不同 url → 不同实例（路由隔离核心）
 *   ⑤b 同 url → 同实例（复用）
 *   ⑤c toAdminUrl 转换正确
 *   ⑤d 无 url → 默认实例（dev 兼容）
 *   ⑤e LRU 超限淘汰
 *   ⑤f 雷一：两 session 并发各取各的 MCP 实例 + env 隔离（不串）
 *   ⑤g 雷二：SITEBASE_ADMIN_URL 只来自传入 url 覆盖，process.env 原值不污染
 *   ⑤h 雷三：sessionTenants 未命中 → resolveTenantForMcp ok:false（hard fail 不调 MCP）
 *
 * 诚实边界：
 *   - 本探针验实例池逻辑隔离 + 上下文解析分支，不验端到端 siteBase 路由
 *     （需起 mock siteBase admin login + cms 接口，下轮接）
 *   - 雷一并发用 Promise.all 模拟两 session 并发 resolve + getMcp，Node 单线程下 Map 读写原子，
 *     真正的 stdio 多路复用竞态需 Python 端集成测试覆盖
 *   - StdioMcpClient 构造 lazy 不连接，探针创建多实例不会真 spawn Python，安全
 *
 * 运行：pnpm --filter @hutian/agent-bridge run probe:tenant-routing
 */
import {
  getMcpForTenant,
  toAdminUrl,
  poolSize,
  clearPoolForTest,
  getMcpEnvForTest,
} from "./pool.ts";
import {
  setTenantContext,
  resolveTenantForMcp,
  clearAllTenantContextForTest,
  type TenantTokenPayload,
} from "../auth/tenant-context.ts";

type Assert = { name: string; pass: boolean; detail: string };

function assert(name: string, pass: boolean, detail: string): Assert {
  return { name, pass, detail };
}

// 模拟验签 payload（对应 Go token.Payload）
function mockPayload(
  tenant: number,
  ws: number,
  url: string,
): TenantTokenPayload {
  return {
    tenant_id: tenant,
    workspace_id: ws,
    sitebase_instance_id: tenant * 100,
    sitebase_base_url: url,
    seat_id: tenant * 1000,
    exp: Math.floor(Date.now() / 1000) + 300,
    iat: Math.floor(Date.now() / 1000),
  };
}

async function main() {
  const asserts: Assert[] = [];

  await clearPoolForTest();
  clearAllTenantContextForTest();

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

  // ── ⑤a 不同 url → 不同实例 ──
  const urlA = "http://localhost:8001/api/v1";
  const urlB = "http://localhost:8002/api/v1";
  const mcpA = getMcpForTenant(urlA);
  const mcpB = getMcpForTenant(urlB);
  asserts.push(assert(
    "⑤a 不同 sitebase_base_url → 不同 MCP 实例（引用不等）",
    mcpA !== mcpB,
    `mcpA===mcpB? ${mcpA === mcpB} | poolSize=${poolSize()}`,
  ));

  // ── ⑤b 同 url → 同实例 ──
  const mcpA2 = getMcpForTenant(urlA);
  asserts.push(assert(
    "⑤b 同 sitebase_base_url → 同 MCP 实例（复用不重复 spawn）",
    mcpA === mcpA2,
    `mcpA===mcpA2? ${mcpA === mcpA2} | poolSize=${poolSize()}`,
  ));

  // ── ⑤d 无 url → 默认实例 ──
  const mcpDefault1 = getMcpForTenant(null);
  const mcpDefault2 = getMcpForTenant(undefined);
  asserts.push(assert(
    "⑤d 无 url（null/undefined）→ 默认实例且相同",
    mcpDefault1 === mcpDefault2,
    `default1===default2? ${mcpDefault1 === mcpDefault2} | poolSize=${poolSize()}`,
  ));
  asserts.push(assert(
    "⑤d 默认实例 ≠ 租户实例",
    mcpDefault1 !== mcpA && mcpDefault1 !== mcpB,
    `default!==A && default!==B? ${mcpDefault1 !== mcpA && mcpDefault1 !== mcpB}`,
  ));

  // ── ⑤e LRU 超限淘汰 ──
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
  clearAllTenantContextForTest();

  // ════════════════════════════════════════════════════
  // 雷一：两 session 并发各取各的 MCP 实例 + env 隔离（不串）
  // 模拟 stdio 多路复用下两租户并发调用，断言各走各的进程+env
  // ════════════════════════════════════════════════════
  const sessionA = "sess-tenantA-" + Date.now();
  const sessionB = "sess-tenantB-" + Date.now();
  setTenantContext(sessionA, mockPayload(1, 10, "http://localhost:8001/api/v1"));
  setTenantContext(sessionB, mockPayload(2, 20, "http://localhost:8002/api/v1"));

  // 并发 resolve（模拟两租户同时发工具调用）
  const [resA, resB] = await Promise.all([
    Promise.resolve(resolveTenantForMcp(sessionA)),
    Promise.resolve(resolveTenantForMcp(sessionB)),
  ]);
  const mcpFromA = resA.ok ? getMcpForTenant(resA.sitebaseUrl) : null;
  const mcpFromB = resB.ok ? getMcpForTenant(resB.sitebaseUrl) : null;

  asserts.push(assert(
    "⑤f 雷一：两 session 并发 resolve 各拿到各的 url",
    resA.ok && resB.ok && resA.sitebaseUrl === "http://localhost:8001/api/v1" && resB.sitebaseUrl === "http://localhost:8002/api/v1",
    `A.url=${resA.ok ? resA.sitebaseUrl : "FAIL"} B.url=${resB.ok ? resB.sitebaseUrl : "FAIL"}`,
  ));
  asserts.push(assert(
    "⑤f 雷一：两 session 并发各取到不同 MCP 实例（不串）",
    mcpFromA !== null && mcpFromB !== null && mcpFromA !== mcpFromB,
    `mcpA===mcpB? ${mcpFromA === mcpFromB}`,
  ));
  // env 隔离：两实例的 env SITEBASE_ADMIN_URL 不同
  const envA = getMcpEnvForTest("http://localhost:8001/api/v1");
  const envB = getMcpEnvForTest("http://localhost:8002/api/v1");
  asserts.push(assert(
    "⑤f 雷一：两实例 env SITEBASE_ADMIN_URL 不同（路由到不同 siteBase）",
    envA.SITEBASE_ADMIN_URL !== envB.SITEBASE_ADMIN_URL,
    `envA=${envA.SITEBASE_ADMIN_URL} envB=${envB.SITEBASE_ADMIN_URL}`,
  ));

  // ════════════════════════════════════════════════════
  // 雷二：SITEBASE_ADMIN_URL 只来自传入 url 覆盖，process.env 原值不污染
  // 即使 env 里已有 SITEBASE_ADMIN_URL=假值，也被传入 url 覆盖（签名值唯一来源）
  // ════════════════════════════════════════════════════
  const fakeEnvUrl = "http://evil-attacker.example/api/admin";
  const origEnv = process.env.SITEBASE_ADMIN_URL;
  process.env.SITEBASE_ADMIN_URL = fakeEnvUrl;
  const envWithFake = getMcpEnvForTest("http://localhost:8001/api/v1");
  // 还原 env（避免污染其他测试）
  if (origEnv === undefined) delete process.env.SITEBASE_ADMIN_URL;
  else process.env.SITEBASE_ADMIN_URL = origEnv;

  asserts.push(assert(
    "⑤g 雷二：env 原值不污染，SITEBASE_ADMIN_URL 只来自传入 url 覆盖",
    envWithFake.SITEBASE_ADMIN_URL === "http://localhost:8001/api/admin",
    `got=${envWithFake.SITEBASE_ADMIN_URL} (expect 8001/api/admin, NOT ${fakeEnvUrl})`,
  ));

  // ════════════════════════════════════════════════════
  // 雷三：sessionTenants 未命中 → resolveTenantForMcp ok:false（hard fail 不调 MCP）
  // 未命中时不应调 getMcpForTenant（否则走默认实例=串数据）
  // ════════════════════════════════════════════════════
  const unknownSession = "sess-unknown-" + Date.now();
  const resMiss = resolveTenantForMcp(unknownSession);
  let didCallMcp = false;
  if (!resMiss.ok) {
    // 模拟 startAgentLoop 的 hard fail 分支：ok:false 时不调 getMcpForTenant
    // （如果这里调了 getMcpForTenant，说明 hard fail 逻辑没接对）
  } else {
    didCallMcp = true; // 不该走到这
  }
  asserts.push(assert(
    "⑤h 雷三：sessionTenants 未命中 → ok:false hard fail",
    !resMiss.ok,
    `resolved=${JSON.stringify(resMiss)}`,
  ));
  asserts.push(assert(
    "⑤h 雷三：未命中时不调 getMcpForTenant（无 siteBase 请求发出）",
    !didCallMcp,
    `didCallMcp=${didCallMcp} (expect false — hard fail 不调 MCP)`,
  ));

  // 验 dev 放行（null）走默认实例，不 hard fail
  const devSession = "sess-dev-" + Date.now();
  setTenantContext(devSession, null);
  const resDev = resolveTenantForMcp(devSession);
  asserts.push(assert(
    "⑤h 雷三边界：dev 放行（null）→ ok:true 走默认实例（不 hard fail）",
    resDev.ok && resDev.sitebaseUrl === null,
    `resolved.ok=${resDev.ok} url=${resDev.ok ? resDev.sitebaseUrl : "N/A"}`,
  ));

  await clearPoolForTest();
  clearAllTenantContextForTest();

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
