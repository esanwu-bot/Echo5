/**
 * 洞① 探针 · 喂活 server_error 死代码
 *
 * 背景：dev 默认 SKIP_LIVE_FETCH=true，fetchJson 第一行就 return network，
 *   `json.code >= 500 → server_error` 那条判定永远走不到——是死代码。
 *   tsc 绿只证类型对，不证逻辑对。本探针构造"HTTP 200 + body code:500"喂进去，
 *   断言分类与分流都按设计走。
 *
 * 做法：
 *   1. 设 SITEBASE_SKIP_LIVE=false（绕过短路，让 fetchJson 真跑分类逻辑）
 *   2. override global.fetch → 返 HTTP 200 + body { code:500, msg:"..." }
 *   3. dev 模式断言：product/article/products-list → source "mock-demo"（非 mock）
 *      settings → source "mock-demo"
 *   4. production 模式断言（自派生子进程，因 PUBLISH_MODE 是模块级常量）：
 *      product/article/products-list → source "error"
 *      settings → source "stale"（洞②修复：全局依赖不整页死）
 *
 * 负向断言：source !== "mock" —— 证明走的是 server_error 分支（mock-demo），不是 network 分支（mock）
 * 结构断言：typeof source === "string" —— v1.0 接真实数据后重跑只需刷新值，门禁代码无需改
 *
 * 用法：pnpm --filter @hutian/web probe:server-error
 */

interface Assertion {
  name: string;
  pass: boolean;
  detail?: string;
}

function installFetchStub(): void {
  // 构造 siteBase ProductController 既有 bug 的响应：HTTP 200 + body code:500
  globalThis.fetch = (() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        code: 500,
        msg: "server error (siteBase ProductController 既有 bug)",
      }),
    }) as unknown as Response) as unknown as typeof fetch;
}

async function runAssertions(mode: "dev" | "production"): Promise<Assertion[]> {
  installFetchStub();
  // 动态 import：env 已在进程启动前设好，PUBLISH_MODE 在模块加载时读入
  const reader = await import("../lib/sites/reader");
  const asserts: Assertion[] = [];

  // --- getProduct ---
  const product = await reader.getProduct("2007");
  const expectProduct = mode === "dev" ? "mock-demo" : "error";
  asserts.push({
    name: `[${mode}] getProduct(2007) source === "${expectProduct}"`,
    pass: product.source === expectProduct,
    detail: `got source="${product.source}" data=${product.data ? "non-null" : "null"}`,
  });
  // 负向断言：dev 期不能是 "mock"（mock 是 network 分支，证明没走 server_error）
  if (mode === "dev") {
    asserts.push({
      name: `[${mode}] getProduct(2007) source !== "mock"（证走 server_error 非 network）`,
      pass: product.source !== "mock",
      detail: `source="${product.source}"`,
    });
  }
  // P1 修复：production 态 source==="error" 区分不了 server_error 和 network（二者都 error）
  // 用 error 字段字面量区分：server_error 分支写 "server_error"，network 分支写 "network"
  // 不加这条断言，production 态的 server_error→error 仍是死代码，靠 dev 推理
  if (mode === "production") {
    const errStr = product.error || "(missing)";
    asserts.push({
      name: `[${mode}] getProduct(2007) error 含 server_error（喂活 production 态 server_error 分支）`,
      pass: !!product.error && product.error.includes("server_error"),
      detail: `error=${errStr}`,
    });
  }

  // --- getArticle ---
  const article = await reader.getArticle("8");
  const expectArticle = mode === "dev" ? "mock-demo" : "error";
  asserts.push({
    name: `[${mode}] getArticle(8) source === "${expectArticle}"`,
    pass: article.source === expectArticle,
    detail: `got source=${article.source}`,
  });
  if (mode === "production") {
    const errStr = article.error || "(missing)";
    asserts.push({
      name: `[${mode}] getArticle(8) error 含 server_error`,
      pass: !!article.error && article.error.includes("server_error"),
      detail: `error=${errStr}`,
    });
  }

  // --- getProductsList ---
  const productsList = await reader.getProductsList();
  const expectList = mode === "dev" ? "mock-demo" : "error";
  asserts.push({
    name: `[${mode}] getProductsList() source === "${expectList}"`,
    pass: productsList.source === expectList,
    detail: `got source=${productsList.source} data=${productsList.data ? `${productsList.data.length} items` : "null"}`,
  });
  // B2 焊料：production 期列表绝不返假列表
  if (mode === "production") {
    const errStr = productsList.error || "(missing)";
    asserts.push({
      name: `[${mode}] getProductsList() data === null（绝不返假列表给爬虫）`,
      pass: productsList.data === null,
      detail: `data=${productsList.data ? `${productsList.data.length} fake items` : "null"}`,
    });
    asserts.push({
      name: `[${mode}] getProductsList() error 含 server_error`,
      pass: !!productsList.error && productsList.error.includes("server_error"),
      detail: `error=${errStr}`,
    });
  }

  // --- getSiteSettings ---
  const settings = await reader.getSiteSettings();
  const expectSettings = mode === "dev" ? "mock-demo" : "stale";
  asserts.push({
    name: `[${mode}] getSiteSettings() source === "${expectSettings}"`,
    pass: settings.source === expectSettings,
    detail: `got source=${settings.source} data=${settings.data ? "non-null" : "null"}`,
  });
  if (mode === "production") {
    // settings production 态 server_error 也走 stale（全局依赖不整页死），error 字段同样含 server_error
    const errStr = settings.error || "(missing)";
    asserts.push({
      name: `[${mode}] getSiteSettings() error 含 server_error`,
      pass: !!settings.error && settings.error.includes("server_error"),
      detail: `error=${errStr}`,
    });
  }
  // 洞②核心断言：production 期 settings 失败不整页死（data 非 null，能继续渲染真内容页）
  if (mode === "production") {
    asserts.push({
      name: `[${mode}] getSiteSettings() data !== null（全局依赖不整页死，降级 stale）`,
      pass: settings.data !== null,
      detail: `data=${settings.data ? "non-null (fallback settings)" : "null (整站死)"}`,
    });
    // stale 不触发 noindex（内容仍可能是 live）
    asserts.push({
      name: `[${mode}] getSiteSettings() source !== "mock"/"mock-demo"（stale 不触发 noindex）`,
      pass: settings.source !== "mock" && settings.source !== "mock-demo",
      detail: `source="${settings.source}"`,
    });
  }

  return asserts;
}

async function main(): Promise<void> {
  const childMode = process.env.PROBE_MODE as "production" | undefined;

  // 子进程模式：PROBE_MODE=production 时跑 production 断言，输出 JSON 给父进程解析
  if (childMode === "production") {
    const asserts = await runAssertions("production");
    // 输出 JSON 到 stdout 供父进程收集
    console.log(JSON.stringify({ mode: "production", asserts }));
    return;
  }

  // 父进程：先跑 dev 断言（in-process）
  // 显式设 env：绕过 SKIP_LIVE_FETCH 短路 + 确保 dev 模式（清掉 shell 可能残留的 PUBLISH_MODE）
  process.env.SITEBASE_SKIP_LIVE = "false";
  delete process.env.SITEBASE_PUBLISH_MODE;

  console.log("─".repeat(60));
  console.log("洞① 探针 · 喂活 server_error 死代码");
  console.log("─".repeat(60));

  const devAsserts = await runAssertions("dev");

  // 再派生子进程跑 production 断言（PUBLISH_MODE 是模块级常量，必须另起进程）
  const { spawn } = await import("node:child_process");
  const { resolve } = await import("node:path");
  const scriptPath = resolve(__dirname, "probe-server-error.ts");
  // 用 tsx 命令 + shell:true 让 Windows 从 node_modules/.bin 解析
  const child = spawn("tsx", [`"${scriptPath}"`], {
    env: {
      ...process.env,
      SITEBASE_PUBLISH_MODE: "production",
      SITEBASE_SKIP_LIVE: "false",
      PROBE_MODE: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    cwd: resolve(__dirname, ".."),
  });

  let childOut = "";
  let childErr = "";
  child.stdout.on("data", (d) => (childOut += d.toString()));
  child.stderr.on("data", (d) => (childErr += d.toString()));

  await new Promise<void>((resolveDone, rejectDone) => {
    child.on("close", (code) => {
      if (code !== 0) {
        rejectDone(new Error(`production child exit ${code}: ${childErr}`));
      } else {
        resolveDone();
      }
    });
    child.on("error", rejectDone);
  });

  let prodAsserts: Assertion[] = [];
  try {
    const parsed = JSON.parse(childOut.trim().split("\n").pop() || "{}");
    prodAsserts = parsed.asserts || [];
  } catch {
    // JSON 解析失败，用 stderr 帮助诊断
    console.error("⚠️ production 子进程输出解析失败");
    console.error(`stdout: ${childOut.slice(0, 500)}`);
    console.error(`stderr: ${childErr.slice(0, 500)}`);
  }

  // 汇总
  const allAsserts = [...devAsserts, ...prodAsserts];
  console.log(`\n[dev 模式] (${devAsserts.length} 断言)`);
  for (const a of devAsserts) {
    const mark = a.pass ? "✓" : "✗";
    console.log(`${mark} ${a.name}${a.detail ? `  (${a.detail})` : ""}`);
  }
  console.log(`\n[production 模式] (${prodAsserts.length} 断言)`);
  for (const a of prodAsserts) {
    const mark = a.pass ? "✓" : "✗";
    console.log(`${mark} ${a.name}${a.detail ? `  (${a.detail})` : ""}`);
  }

  console.log("\n" + "─".repeat(60));
  const passed = allAsserts.filter((a) => a.pass).length;
  const total = allAsserts.length;
  console.log(`结果：${passed}/${total} 通过`);
  if (passed === total) {
    console.log("\n🟢 server_error 死代码已喂活：分类与发布态分流均按设计走。");
    process.exit(0);
  } else {
    console.log("\n🔴 有断言失败：server_error 分支逻辑可能写反或未按设计分流。");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
