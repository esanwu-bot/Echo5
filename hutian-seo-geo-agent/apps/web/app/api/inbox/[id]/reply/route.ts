import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/inbox/[id]/reply ← v0.2 inbox 协作流占位路由
 *
 * 用户批复/回复 → 此路由 → （v0.3 接 agent-bridge 真实编排）
 *
 * v0.2 行为：
 *   - 仅记录批复意图到日志，返回 202 Accepted
 *   - 真实的 Agent 回执由前端 setTimeout 模拟（见 inbox/page.tsx）
 *   - 数据契约对齐 agent-protocol：POST body 即 approval 事件 payload
 *
 * v0.3 升级路径：
 *   - 此路由转发到 agent-bridge，bridge 触发自建 loop 执行
 *   - 同时启动 SSE 流，把 approval_ack 事件推回前端
 *   - 前端移除 setTimeout，改用 EventSource 订阅
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  // v0.2 占位：仅记录，不执行
  console.log(`[inbox/reply] mailId=${id} action=${body?.action} label=${body?.label}`);

  return NextResponse.json({
    ok: true,
    mailId: id,
    received: true,
    note: "v0.2 mock — real Agent orchestration arrives in v0.3 via SSE",
  });
}
