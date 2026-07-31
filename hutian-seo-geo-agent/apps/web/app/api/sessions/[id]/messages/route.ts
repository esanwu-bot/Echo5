import { NextRequest, NextResponse } from "next/server";
import { getBridgeToken } from "@/lib/bridgeToken";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * BFF proxy: workbench → Next Route Handler → agent-bridge
 *
 * POST /api/sessions/[id]/messages
 *   body: { prompt: string }
 *   → bridge POST /sessions/[id]/messages (启动 runAgentLoop，事件走 SSE)
 *
 * 前端 send(text) 在 SSE 模式调这个；事件回流经 /api/sessions/[id]/stream
 *
 * ADR 内部 token（替代已移除的明文 X-Tenant-ID/X-Workspace-ID header）：
 *   BFF 调 tenant-api 签发 HMAC token → 设 X-Tenant-Token 头给 bridge 验签
 *   单一信任源：隔离逻辑只在 Go，BFF 不连 hutian 库
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  // ADR 内部 token：每次发消息都带（token 5min 有效，BFF 缓存 4min）
  const tenantToken = await getBridgeToken(req);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (tenantToken) headers["X-Tenant-Token"] = tenantToken;

  const resp = await fetch(`${BRIDGE_URL}/sessions/${id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: body.prompt ?? body.message ?? "" }),
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
