"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { AgentEvent } from "@hutian/agent-protocol";
import {
  initialStreamState,
  streamReducer,
  type StreamState,
  type PanelTab,
} from "./streamReducer";
import { mockStream } from "./mockStream";

/**
 * Workbench session hook.  ← 技术方案 §8 数据流
 *
 * mode="mock" replays the demo timeline via mockStream (no backend needed).
 * mode="sse"  connects to /api/sessions/[id]/stream (BFF → agent-bridge).
 *
 * SSE 模式下 send() 首次调用 lazy 创建 session：POST /api/sessions → 连 SSE → POST message。
 * 后续 send 复用同一 session。
 *
 * Replaces the previous zustand store + useAgentSSE pair with a pure
 * useReducer + streamReducer, per 技术方案 §2/§8 (no zustand).
 */
export function useAgentSession(
  mode: "mock" | "sse" = "mock",
  baseURL: string = "",
) {
  const api = (p: string) => `${baseURL}${p}`;
  const [state, dispatch] = useReducer(streamReducer, initialStreamState);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sseReady, setSseReady] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  // pending messages waiting for SSE to be ready (queued during lazy init)
  const pendingRef = useRef<string[]>([]);

  /** Start the mock timeline replay. No-op in SSE mode. */
  const startMock = useCallback(() => {
    if (mode !== "mock") return;
    cancelRef.current?.();
    cancelRef.current = mockStream((e) => dispatch(e));
  }, [mode]);

  /** Connect to a live SSE session (BFF proxies to agent-bridge). */
  const connect = useCallback((sid: string) => {
    if (mode !== "sse") return;
    esRef.current?.close();
    setSseReady(false);
    const es = new EventSource(api(`/api/sessions/${sid}/stream`));
    es.onopen = () => setSseReady(true);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent;
        dispatch(event);
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
      setSseReady(false);
    };
    esRef.current = es;
  }, [mode]);

  /** Flush pending messages once SSE is ready. */
  const flushPending = useCallback(async (sid: string) => {
    while (pendingRef.current.length > 0) {
      const text = pendingRef.current.shift()!;
      try {
        await fetch(api(`/api/sessions/${sid}/messages`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
      } catch (e) {
        console.error("[useAgentSession] POST /messages failed:", e);
      }
    }
  }, []);

  // When SSE becomes ready, flush any pending messages.
  useEffect(() => {
    if (sseReady && sessionId) {
      void flushPending(sessionId);
    }
  }, [sseReady, sessionId, flushPending]);

  /**
   * Send a user message.
   * - mock mode: local echo only
   * - sse mode: lazy create session on first call, then POST to bridge.
   *   User message is NOT locally dispatched — bridge pushes it back via SSE
   *   (single source of truth).
   */
  const send = useCallback(
    async (text: string) => {
      if (mode === "mock") {
        dispatch({ type: "message", role: "user", content: text });
        return;
      }

      // SSE mode
      if (!sessionId) {
        // Lazy create session
        pendingRef.current.push(text);
        try {
          const resp = await fetch(api("/api/sessions"), { method: "POST" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = (await resp.json()) as { id: string };
          setSessionId(data.id);
          connect(data.id);
        } catch (e) {
          console.error("[useAgentSession] create session failed:", e);
          pendingRef.current.pop(); // remove the queued message
          dispatch({
            type: "message",
            role: "agent",
            content: `⚠️ 无法连接到 Agent 服务：${(e as Error).message}`,
          });
          dispatch({ type: "done" });
        }
        return;
      }

      // Session exists — if SSE not ready yet, queue; otherwise POST immediately.
      if (!sseReady) {
        pendingRef.current.push(text);
        return;
      }

      try {
        await fetch(api(`/api/sessions/${sessionId}/messages`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
      } catch (e) {
        console.error("[useAgentSession] POST /messages failed:", e);
        dispatch({
          type: "message",
          role: "agent",
          content: `⚠️ 发送失败：${(e as Error).message}`,
        });
      }
    },
    [mode, sessionId, sseReady, connect],
  );

  /** 手动切换右栏标签（UI 派发，非 AgentEvent） */
  const setPanel = useCallback((tab: PanelTab) => {
    dispatch({ type: "set_panel", tab });
  }, []);

  useEffect(() => {
    return () => {
      esRef.current?.close();
      cancelRef.current?.();
    };
  }, []);

  return {
    state: state as StreamState,
    sessionId,
    sseReady,
    startMock,
    connect,
    send,
    setPanel,
  };
}
