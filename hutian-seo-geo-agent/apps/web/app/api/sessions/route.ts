import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * BFF proxy: workbench → Next Route Handler → agent-bridge
 *
 * POST /api/sessions
 *   → bridge POST /sessions (创建空 session，返回 { id })
 * 前端 SSE 模式首次 send 时 lazy 调用。
 *
 * 多租户透传（P0 接缝）：前端注入的 X-Tenant-ID / X-Workspace-ID header 透传给 agent-bridge。
 * agent-bridge 当前不消费（显式化），下一轮接 ADR 内部 token 时读取做 siteBase 路由。
 */
const TENANT_HEADERS = ["X-Tenant-ID", "X-Workspace-ID"];

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {};
  for (const h of TENANT_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }
  const resp = await fetch(`${BRIDGE_URL}/sessions`, {
    method: "POST",
    headers,
  });
  if (!resp.ok) {
    return NextResponse.json(
      { error: `Bridge error: ${resp.status}` },
      { status: resp.status },
    );
  }
  const data = await resp.json();
  return NextResponse.json(data);
}
