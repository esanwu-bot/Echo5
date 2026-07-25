"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
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
 * Replaces the previous zustand store + useAgentSSE pair with a pure
 * useReducer + streamReducer, per 技术方案 §2/§8 (no zustand).
 */
export function useAgentSession(mode: "mock" | "sse" = "mock") {
  const [state, dispatch] = useReducer(streamReducer, initialStreamState);
  const esRef = useRef<EventSource | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  /** Start the mock timeline replay. No-op in SSE mode. */
  const startMock = useCallback(() => {
    if (mode !== "mock") return;
    cancelRef.current?.();
    cancelRef.current = mockStream((e) => dispatch(e));
  }, [mode]);

  /** Connect to a live SSE session (BFF proxies to agent-bridge). */
  const connect = useCallback((sessionId: string) => {
    if (mode !== "sse") return;
    esRef.current?.close();
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
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
    };
    esRef.current = es;
  }, [mode]);

  /** Send a user message. In mock mode this is a local echo only. */
  const send = useCallback(
    (text: string) => {
      dispatch({
        type: "message",
        role: "user",
        content: text,
      });
      // SSE mode: a real bridge POST would go here in v1.0.
    },
    [],
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

  return { state: state as StreamState, startMock, connect, send, setPanel };
}
