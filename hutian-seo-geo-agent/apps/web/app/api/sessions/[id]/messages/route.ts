import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * BFF proxy: workbench → Next Route Handler → agent-bridge
 *
 * POST /api/sessions/[id]/messages
 *   body: { prompt: string }
 *   → bridge POST /sessions/[id]/messages (启动 runAgentLoop，事件走 SSE)
 *
 * 前端 send(text) 在 SSE 模式调这个；事件回流经 /api/sessions/[id]/stream
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  const resp = await fetch(`${BRIDGE_URL}/sessions/${id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
