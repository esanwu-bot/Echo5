/**
 * γ 门禁 · 命门第 7 条
 *
 * 用爬虫视角（curl，不执行 JS）抓渲染器初始 HTML，断言：
 *   (a) <head> 含 <title> / <meta name="description"> / <meta property="og:title|og:description">
 *   (b) <body> 含合法 application/ld+json（@type=Article 或 Product）
 *
 * 这两条绿，γ 才算真绕开 CSR。
 * 浏览器看着对不算数，爬虫不看 JS。
 *
 * 用法：
 *   1. 先在另一个终端启动 dev：pnpm --filter @hutian/web dev
 *   2. 跑门禁：pnpm --filter @hutian/web probe:sites-ssr
 */

import { spawn } from "node:child_process";

const WEB_URL = process.env.WEB_URL || "http://localhost:3000";

interface Assertion {
  name: string;
  pass: boolean;
  detail?: string;
}

function curl(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      "-s",
      "-w",
      "\n__HTTP_STATUS__:%{http_code}",
      "--max-time",
      "10",
      url,
    ];
    const proc = spawn("curl.exe", args, { shell: false });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0 && !out) {
        reject(new Error(`curl exit ${code}: ${err}`));
        return;
      }
      const m = out.match(/__HTTP_STATUS__:(\d+)/);
      const status = m ? Number(m[1]) : 0;
      const body = out.replace(/\n__HTTP_STATUS__:\d+$/, "");
      resolve({ status, body });
    });
  });
}

function extractTag(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m ? m[1] : null;
}

function extractJsonLdScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

async function probePage(
  url: string,
  expectedType: "Article" | "Product"
): Promise<Assertion[]> {
  const asserts: Assertion[] = [];
  const res = await curl(url);
  if (res.status !== 200) {
    asserts.push({
      name: `[${url}] HTTP 200`,
      pass: false,
      detail: `got ${res.status}`,
    });
    return asserts;
  }
  asserts.push({ name: `[${url}] HTTP 200`, pass: true });

  const html = res.body;

  // (a) head 断言
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/i);
  asserts.push({
    name: `[${url}] <title> 非空`,
    pass: !!title && title.trim().length > 0,
    detail: title ? `title="${title.trim()}"` : "missing",
  });

  const desc = extractTag(
    html,
    /<meta[^>]+name="description"[^>]+content="([^"]+)"/i
  );
  asserts.push({
    name: `[${url}] <meta name="description"> 非空`,
    pass: !!desc && desc.trim().length > 0,
    detail: desc ? `desc="${desc.trim().slice(0, 60)}..."` : "missing",
  });

  const ogTitle = extractTag(
    html,
    /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i
  );
  asserts.push({
    name: `[${url}] <meta property="og:title"> 非空`,
    pass: !!ogTitle && ogTitle.trim().length > 0,
    detail: ogTitle || "missing",
  });

  const ogDesc = extractTag(
    html,
    /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i
  );
  asserts.push({
    name: `[${url}] <meta property="og:description"> 非空`,
    pass: !!ogDesc && ogDesc.trim().length > 0,
    detail: ogDesc ? `og:desc="${ogDesc.trim().slice(0, 60)}..."` : "missing",
  });

  const canonical = extractTag(
    html,
    /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i
  );
  // γ 尾巴（红线 12）：canonical 必须含 /site/ 前缀，否则两套 URL 空间会打架
  asserts.push({
    name: `[${url}] <link rel="canonical"> 含 /site/ 前缀`,
    pass: !!canonical && /\/site\//.test(canonical),
    detail: canonical || "missing",
  });

  // (b) body JSON-LD 断言
  const ldScripts = extractJsonLdScripts(html);
  asserts.push({
    name: `[${url}] 至少 1 个 <script type="application/ld+json">`,
    pass: ldScripts.length > 0,
    detail: `found ${ldScripts.length} scripts`,
  });

  if (ldScripts.length > 0) {
    let foundExpectedType = false;
    let jsonParseOk = true;
    let lastErr = "";
    for (const s of ldScripts) {
      try {
        const obj = JSON.parse(s);
        if (obj["@type"] === expectedType) foundExpectedType = true;
      } catch (e) {
        jsonParseOk = false;
        lastErr = (e as Error).message;
      }
    }
    asserts.push({
      name: `[${url}] JSON-LD 全部合法 JSON`,
      pass: jsonParseOk,
      detail: jsonParseOk ? "all parsed" : `parse error: ${lastErr}`,
    });
    asserts.push({
      name: `[${url}] JSON-LD 含 @type=${expectedType}`,
      pass: foundExpectedType,
      detail: foundExpectedType ? "matched" : "not found",
    });
  }

  return asserts;
}

async function main() {
  console.log("─".repeat(60));
  console.log("γ 门禁 · 命门第 7 条 · 爬虫视角初始 HTML 断言");
  console.log(`target: ${WEB_URL}`);
  console.log("─".repeat(60));

  // 探活
  try {
    const probe = await curl(WEB_URL);
    if (probe.status === 0) {
      console.error(
        `\n❌ 无法连接 ${WEB_URL}。请先在另一个终端跑：pnpm --filter @hutian/web dev`
      );
      process.exit(2);
    }
  } catch (e) {
    console.error(
      `\n❌ 无法连接 ${WEB_URL}。请先在另一个终端跑：pnpm --filter @hutian/web dev\n  错误：${(e as Error).message}`
    );
    process.exit(2);
  }

  const allAsserts: Assertion[] = [];

  // 文章页
  console.log("\n[1/2] 抓 /site/articles/1 ...");
  allAsserts.push(...(await probePage(`${WEB_URL}/site/articles/1`, "Article")));

  // 商品页
  console.log("[2/2] 抓 /site/products/1 ...");
  allAsserts.push(...(await probePage(`${WEB_URL}/site/products/1`, "Product")));

  // 汇总
  console.log("\n" + "─".repeat(60));
  console.log("断言汇总");
  console.log("─".repeat(60));
  for (const a of allAsserts) {
    const mark = a.pass ? "✓" : "✗";
    console.log(`${mark} ${a.name}${a.detail ? `  (${a.detail})` : ""}`);
  }
  const passed = allAsserts.filter((a) => a.pass).length;
  const total = allAsserts.length;
  console.log("─".repeat(60));
  console.log(`结果：${passed}/${total} 通过`);

  if (passed === total) {
    console.log("\n🟢 γ-MVP 物理保证成立：head + JSON-LD 在初始 HTML 里。");
    process.exit(0);
  } else {
    console.log("\n🔴 γ-MVP 物理保证未成立：有断言失败。");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
