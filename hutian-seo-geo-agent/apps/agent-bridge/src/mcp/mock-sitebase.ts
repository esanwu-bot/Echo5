/**
 * Mock siteBase admin server（端到端探针用）。
 *
 * 模拟 siteBase 的 admin API 最小子集，让 Python SiteBaseClient 能 login + create article。
 * 记录所有收到的请求，探针断言"打到对的端口"。
 *
 * 实现的端点：
 *   POST /api/admin/login    → { code: 0, data: { token: "fake-token" } }
 *   POST /api/admin/articles → { code: 0, data: { id, title, ... } }
 *
 * 不实现的：其他 admin 端点返回 404（探针不调，不模拟）
 */
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";

export interface MockSiteBase {
  port: number;
  server: Server;
  /** 收到的所有请求记录（探针断言用） */
  requests: Array<{ method: string; path: string; body?: string }>;
  close(): Promise<void>;
}

/**
 * 起一个 mock siteBase，监听指定端口（port=0 让 OS 分配空闲端口）。
 * 返回 MockSiteBase，含 requests 数组供探针断言。
 */
export async function startMockSiteBase(port = 0): Promise<MockSiteBase> {
  const requests: Array<{ method: string; path: string; body?: string }> = [];

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const url = req.url ?? "";
      const method = req.method ?? "GET";

      // 记录请求（探针断言用）
      requests.push({ method, path: url, body: body || undefined });

      // CORS（Python requests 可能带）
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // POST /api/admin/login
      if (method === "POST" && url === "/api/admin/login") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          code: 0,
          data: { token: "fake-token-" + Date.now() },
          msg: "ok",
        }));
        return;
      }

      // POST /api/admin/articles
      if (method === "POST" && url === "/api/admin/articles") {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(body); } catch { /* ignore */ }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          code: 0,
          data: {
            id: Math.floor(Math.random() * 1000) + 1,
            title: parsed.title ?? "",
            summary: parsed.summary ?? "",
            content: parsed.content ?? "",
            category_id: parsed.category_id ?? 0,
            status: parsed.status ?? 1,
          },
          msg: "ok",
        }));
        return;
      }

      // 其他端点 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: 404, msg: "not found (mock siteBase)" }));
    });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        port: actualPort,
        server,
        requests,
        async close() {
          return new Promise<void>((r) => server.close(() => r()));
        },
      });
    });
  });
}
