/**
 * T6.3b 判官⑤ 端到端 · MCP 实例池路由真打到不同 siteBase 探针
 *
 * 这是 review 要的"最后一跳"验证：起两个 mock siteBase admin server，
 * bridge 实例池 spawn 两个 Python MCP 子进程（env 不同），
 * 各调 cms_create_page，断言打到不同端口（工具真落到对的 siteBase）。
 *
 * 流程：
 *   1. 起两个 mock siteBase（端口 A、B）
 *   2. getMcpForTenant(urlA) → mcpA（spawn Python，env SITEBASE_ADMIN_URL=adminUrlA）
 *   3. getMcpForTenant(urlB) → mcpB（spawn Python，env SITEBASE_ADMIN_URL=adminUrlB）
 *   4. mcpA.callTool("cms_create_page", {...}) → Python 调 siteBase A
 *   5. mcpB.callTool("cms_create_page", {...}) → Python 调 siteBase B
 *   6. 断言：mockA 收到 POST /api/admin/articles、mockB 收到、且不串（A 不打到 B）
 *
 * 诚实边界：
 *   - 本探针验"实例池 → Python 子进程 → env → siteBase 路由"端到端
 *   - 不验 HMAC 验签链（由 Go 探针 ①②③④ 覆盖）
 *   - mock siteBase 只实现 login + articles，不模拟完整 admin API
 *   - Python 子进程 spawn 有开销（~1-2s），探针超时设 30s
 *
 * 运行：pnpm --filter @hutian/agent-bridge run probe:e2e-routing
 */
import { getMcpForTenant, clearPoolForTest } from "./pool.ts";
import { startMockSiteBase, type MockSiteBase } from "./mock-sitebase.ts";

type Assert = { name: string; pass: boolean; detail: string };

function assert(name: string, pass: boolean, detail: string): Assert {
  return { name, pass, detail };
}

async function main() {
  const asserts: Assert[] = [];

  // ── 1. 起两个 mock siteBase ──
  let mockA: MockSiteBase | null = null;
  let mockB: MockSiteBase | null = null;
  try {
    mockA = await startMockSiteBase(0);
    mockB = await startMockSiteBase(0);
  } catch (e) {
    console.error("[fatal] 起 mock siteBase 失败:", e);
    process.exit(1);
  }
  console.log(`[setup] mock siteBase A on :${mockA.port}, B on :${mockB.port}`);

  const urlA = `http://localhost:${mockA.port}/api/v1`;
  const urlB = `http://localhost:${mockB.port}/api/v1`;

  try {
    // ── 2. 取两个 MCP 实例（spawn Python 子进程，env 不同）──
    await clearPoolForTest();
    const mcpA = getMcpForTenant(urlA);
    const mcpB = getMcpForTenant(urlB);
    asserts.push(assert(
      "e2e-① 两个 MCP 实例不同（前置：实例池隔离）",
      mcpA !== mcpB,
      `mcpA===mcpB? ${mcpA === mcpB}`,
    ));

    // ── 3. 各调 cms_create_page ──
    // Python SiteBaseClient 会先 login（探活）再 POST /articles
    const callArgs = {
      title: "测试文章-A租户",
      summary: "端到端路由验证",
      content: "这是 A 租户的文章内容",
    };
    const callArgsB = {
      title: "测试文章-B租户",
      summary: "端到端路由验证",
      content: "这是 B 租户的文章内容",
    };

    let resA: { ok: boolean; output: unknown; error?: string } | null = null;
    let resB: { ok: boolean; output: unknown; error?: string } | null = null;
    try {
      resA = await mcpA.callTool("cms_create_page", callArgs);
    } catch (e) {
      resA = { ok: false, output: null, error: (e as Error).message };
    }
    try {
      resB = await mcpB.callTool("cms_create_page", callArgsB);
    } catch (e) {
      resB = { ok: false, output: null, error: (e as Error).message };
    }

    // ── 4. 断言工具调用成功（Python → mock siteBase 通）──
    asserts.push(assert(
      "e2e-② mcpA callTool cms_create_page 成功",
      resA.ok,
      `ok=${resA.ok} error=${resA.error ?? "none"} output=${JSON.stringify(resA.output).slice(0, 120)}`,
    ));
    asserts.push(assert(
      "e2e-② mcpB callTool cms_create_page 成功",
      resB.ok,
      `ok=${resB.ok} error=${resB.error ?? "none"} output=${JSON.stringify(resB.output).slice(0, 120)}`,
    ));

    // ── 5. 断言打到对的端口（核心路由隔离断言）──
    const mockARequests = mockA.requests.filter(
      (r) => r.method === "POST" && r.path === "/api/admin/articles",
    );
    const mockBRequests = mockB.requests.filter(
      (r) => r.method === "POST" && r.path === "/api/admin/articles",
    );

    asserts.push(assert(
      "e2e-③ mockA 收到 POST /api/admin/articles（A 租户打到 siteBase A）",
      mockARequests.length >= 1,
      `mockA articles 请求数=${mockARequests.length} | 全部请求=${mockA.requests.map((r) => r.method + " " + r.path).join(", ")}`,
    ));
    asserts.push(assert(
      "e2e-③ mockB 收到 POST /api/admin/articles（B 租户打到 siteBase B）",
      mockBRequests.length >= 1,
      `mockB articles 请求数=${mockBRequests.length} | 全部请求=${mockB.requests.map((r) => r.method + " " + r.path).join(", ")}`,
    ));

    // ── 6. 断言不串（A 不打到 B，B 不打到 A）──
    // mockA 只该收到 A 的请求，mockB 只该收到 B 的
    // 用 title 区分（A 的 title 含"A租户"，B 的含"B租户"）
    const mockAGotB = mockARequests.some((r) => r.body?.includes("B租户"));
    const mockBGotA = mockBRequests.some((r) => r.body?.includes("A租户"));
    asserts.push(assert(
      "e2e-④ 不串数据：mockA 没收到 B 租户的文章、mockB 没收到 A 租户的",
      !mockAGotB && !mockBGotA,
      `mockA 收到 B? ${mockAGotB} | mockB 收到 A? ${mockBGotA}`,
    ));

    // ── 7. login 也路由对（探活 login 也该打到各自端口）──
    const mockALogin = mockA.requests.filter(
      (r) => r.method === "POST" && r.path === "/api/admin/login",
    );
    const mockBLogin = mockB.requests.filter(
      (r) => r.method === "POST" && r.path === "/api/admin/login",
    );
    asserts.push(assert(
      "e2e-⑤ login 也路由对（mockA 和 mockB 各收到自己的 login 请求）",
      mockALogin.length >= 1 && mockBLogin.length >= 1,
      `mockA login=${mockALogin.length} mockB login=${mockBLogin.length}`,
    ));
  } finally {
    // ── 清理 ──
    await clearPoolForTest();
    await mockA?.close();
    await mockB?.close();
  }

  // ── 汇总 ──
  let passed = 0, failed = 0;
  for (const a of asserts) {
    const status = a.pass ? "PASS" : "FAIL";
    if (a.pass) passed++; else failed++;
    console.log(`  [${status}] ${a.name}`);
    console.log(`         ${a.detail}`);
  }
  console.log(`\nprobe:e2e-routing: ${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
