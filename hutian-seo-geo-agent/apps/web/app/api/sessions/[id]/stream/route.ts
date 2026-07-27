import { NextRequest } from "next/server";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * SSE proxy: workbench EventSource → Next Route Handler → agent-bridge.
 *
 * M5 P1-3 生产替代 rewrites 的正式方案：Route Handler 自身直接代理 SSE，
 * 不依赖 dev-only rewrites。关键点：
 *   - Node.js runtime（Edge runtime 对上游 chunk 转发有兼容坑）
 *   - upstream fetch 带 duplex: 'half' 避免 Node 18+ 警告
 *   - 响应头显式写 text/event-stream + no-transform + keep-alive
 *   - 响应返回前先向 client 写一个 heartbeat '\n'，冲开 Next 默认 buffer
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const upstream = `${BRIDGE_URL}/sessions/${id}/events`;

  const upstreamRes = await fetch(upstream, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
    cache: "no-store",
    signal: req.signal,
    // @ts-expect-error: duplex is a Node 18+ fetch extension for streaming bodies
    duplex: "half",
  }).catch(() => null);

  if (!upstreamRes || !upstreamRes.ok || !upstreamRes.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "bridge unavailable", status: upstreamRes?.status ?? 502 })}\n\n`,
      {
        status: upstreamRes?.status ?? 502,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      },
    );
  }

  const clientReadable = new ReadableStream({
    async start(controller) {
      controller.enqueue(new TextEncoder().encode(": hello (keep-alive kicker)\n\n"));
      // @ts-expect-error: ReadableStream async iteration types
      for await (const chunk of upstreamRes.body as AsyncIterable<Uint8Array>) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
    cancel() {
      // Browser closes EventSource: let upstream abort via signal
      upstreamRes.body?.cancel?.();
    },
  });

  return new Response(clientReadable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
