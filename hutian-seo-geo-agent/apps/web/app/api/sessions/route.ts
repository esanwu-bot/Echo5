import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * BFF proxy: workbench → Next Route Handler → agent-bridge
 *
 * POST /api/sessions
 *   → bridge POST /sessions (创建空 session，返回 { id })
 * 前端 SSE 模式首次 send 时 lazy 调用。
 *
 * ════════════════════════════════════════════════════
 * P0 红线：此处绝不能透传明文 X-Tenant-ID / X-Workspace-ID header
 *   违反 ADR：下游签名签 / 单一信任源 / 签名防篡改 / 下游不连 hutian
 *
 * 下一轮接 ADR 内部 token：
 *   1. BFF 取用户 httpOnly JWT cookie
 *   2. 调 tenant-api /api/v1/internal/token 验 JWT → 签 HMAC X-Tenant-Token
 *   3. BFF 把签名 token 给 bridge，bridge 只信签名、不信任何明文头
 * ════════════════════════════════════════════════════
 */
export async function POST() {
  const resp = await fetch(`${BRIDGE_URL}/sessions`, { method: "POST" });
  if (!resp.ok) {
    return NextResponse.json(
      { error: `Bridge error: ${resp.status}` },
      { status: resp.status },
    );
  }
  const data = await resp.json();
  return NextResponse.json(data);
}
