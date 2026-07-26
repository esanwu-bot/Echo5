import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * BFF proxy: workbench → Next Route Handler → agent-bridge
 *
 * POST /api/sessions
 *   → bridge POST /sessions (创建空 session，返回 { id })
 * 前端 SSE 模式首次 send 时 lazy 调用。
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
