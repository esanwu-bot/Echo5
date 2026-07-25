import { NextRequest } from "next/server";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://localhost:4317";

/**
 * SSE proxy: workbench EventSource → Next Route Handler → agent-bridge
 * This avoids CORS issues and keeps the bridge internal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const upstream = `${BRIDGE_URL}/sessions/${id}/events`;

  const response = await fetch(upstream, {
    headers: { Accept: "text/event-stream" },
    signal: req.signal,
  });

  if (!response.ok || !response.body) {
    return new Response("Bridge unavailable", { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
