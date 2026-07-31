import { NextResponse, type NextRequest } from "next/server";
import { getBridgeToken } from "@/lib/bridgeToken";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * BFF proxy: workbench → Next Route Handler → agent-bridge
 *
 * POST /api/sessions
 *   → bridge POST /sessions (创建空 session，返回 { id })
 * 前端 SSE 模式首次 send 时 lazy 调用。
 *
 * ADR 内部 token（替代已移除的明文 X-Tenant-ID/X-Workspace-ID header）：
 *   1. BFF 从请求读 httpOnly cookie HUTIAN_TENANT_TOKEN
 *   2. 调 tenant-api GET /portal/api/v1/internal/token 验 JWT → 签 HMAC token
 *   3. BFF 把签名 token 设 X-Tenant-Token 头给 bridge，bridge 验签后信任 payload
 *   4. 单一信任源：隔离逻辑只在 Go，BFF 不连 hutian 库
 * dev 兼容：无 cookie（未登录/mock）→ 不带 token，bridge 端按"未配 key 放行"处理
 */
export async function POST(req: NextRequest) {
  const tenantToken = await getBridgeToken(req);
  const headers: Record<string, string> = {};
  if (tenantToken) headers["X-Tenant-Token"] = tenantToken;

  const resp = await fetch(`${BRIDGE_URL}/sessions`, { method: "POST", headers });
  if (!resp.ok) {
    return NextResponse.json(
      { error: `Bridge error: ${resp.status}` },
      { status: resp.status },
    );
  }
  const data = await resp.json();
  return NextResponse.json(data);
}
