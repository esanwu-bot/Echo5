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
import {
  registerSession,
  registerSessionRemote,
  touchSession,
  touchSessionRemote,
  listSessions,
  listSessionsRemote,
  type SessionListItem,
  type SessionSyncStatus,
} from "./sessionList";

/**
 * Workbench session hook.  ← 技术方案 §8 数据流
 *
 * mode="mock" replays the demo timeline via mockStream (no backend needed).
 * mode="sse"  connects to /api/sessions/[id]/stream (BFF → agent-bridge).
 *
 * SSE 模式下 send() 首次调用 lazy 创建 session：POST /api/sessions → 连 SSE → POST message。
 * 后续 send 复用同一 session。
 *
 * 会话历史：首轮 user prompt → 标题（前 20 字）→ 注册到 localStorage hutian_session_list_v1:<user_id>。
 *  - userId = null → unlogged 公共桶；userId = number → 按账号分桶，账号隔离。
 * 工具/消息产出时 touchSession 更新 lastActiveAt + toolCount 快照。
 * 切会话：reset 当前 → setSessionId(newId) → 连 SSE 拉新 session 的事件（agent-bridge 内存里若有历史会重放）。
 *
 * ════════════════════════════════════════════════════
 * P0 红线：workbench → agent-bridge 绝不传明文 X-Tenant-ID / X-Workspace-ID header
 *   违反 ADR 四条信任源原则：下游签名签 / 单一信任源 / 签名防篡改 / 下游不连 hutian
 *   已落地：workbench BFF（lib/bridgeToken.ts）→ tenant-api GET /portal/api/v1/internal/token
 *   （portal JWT 验签，workspace 只从 claims 解）签 HMAC token
 *   → 把带签名的 {tenant_id, workspace_id, sitebase_base_url, exp} 给 bridge 验签
 *   → bridge 只信签名 token，不信任何明文 header
 * ════════════════════════════════════════════════════
 *
 * Replaces the previous zustand store + useAgentSSE pair with a pure
 * useReducer + streamReducer, per 技术方案 §2/§8 (no zustand).
 */
export function useAgentSession(
  mode: "mock" | "sse" = "mock",
  baseURL: string = "",
  /** 当前登录用户 id（null=未登录 → 用 unlogged 桶）。切换 userId 会自动从对应桶重新刷 sessions。 */
  userId: number | null = null,
) {
  const api = (p: string) => `${baseURL}${p}`;
  const [state, dispatch] = useReducer(streamReducer, initialStreamState);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sseReady, setSseReady] = useState(false);
  /** localStorage 会话列表（驱动 Sidebar 渲染，每次 send/tool_end 后刷新） */
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  /** 远程同步状态（synced=云端 / offline=离线 / unauthed=cookie失效 / server_error=后端挂 / local=未登录本地） */
  const [syncStatus, setSyncStatus] = useState<SessionSyncStatus | "local">("local");
  /**
   * 连续读失败次数（listSessionsRemote 返回非 synced 时累加，synced 时清零）。
   * 用途：避免"第一次 toast 后用户以为恢复了其实还在失败"——
   *   workbench 监听此值，达 3 的倍数时再 toast 一次，让用户知道"还在失败"。
   */
  const [syncFails, setSyncFails] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  // pending messages waiting for SSE to be ready (queued during lazy init)
  const pendingRef = useRef<string[]>([]);
  // 首轮 user prompt 暂存（等 sessionId 回来再注册到列表，避免拿 prompt 时 id 还没 set）
  const firstPromptRef = useRef<string | null>(null);

  /** 是否走远程同步（登录态 + sse 模式） */
  const useRemote = mode === "sse" && userId != null;

  /** 从 localStorage 刷新 sessions（供 UI 用） */
  const refreshSessions = useCallback(() => {
    if (mode === "mock") return; // mock 不计入历史
    if (useRemote && userId != null) {
      // 登录态：异步拉远程，返回 {list, status} 驱动 syncStatus 徽标
      listSessionsRemote(userId).then(({ list, status }) => {
        setSessions(list);
        setSyncStatus(status);
        // 连续读失败计数：synced 清零，非 synced 累加（驱动 workbench 重复 toast）
        setSyncFails(status === "synced" ? 0 : (n) => n + 1);
      });
    } else {
      // 未登录：直接读 localStorage
      setSessions(listSessions(userId));
      setSyncStatus("local");
    }
  }, [mode, userId, useRemote]);

  // 首次挂载刷一次 sessions（从 localStorage 恢复列表）
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // tool_end / message / done 事件后同步更新 sessionList 的 toolCount + lastActiveAt
  const completedToolCount = state.tools.filter((t) => t.status === "done").length;
  useEffect(() => {
    if (mode === "mock" || !sessionId) return;
    // 首轮尚未注册过的不必 touch（register 会处理），这里只做后续刷新
    if (useRemote && userId != null) {
      touchSessionRemote(sessionId, userId, completedToolCount);
    } else {
      touchSession(sessionId, userId, completedToolCount);
    }
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedToolCount, state.messages.length, state.done]);

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
        const resp = await fetch(api(`/api/sessions/${sid}/messages`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
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
        firstPromptRef.current = text; // 暂存首轮 user prompt，等 setSessionId 后注册到列表
        try {
          const resp = await fetch(api("/api/sessions"), { method: "POST" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = (await resp.json()) as { id: string };
          const newId = data.id;
          // 先注册到 sessionList（标题从首轮 prompt 摘），按 userId 分桶
          const promptForTitle = firstPromptRef.current ?? text;
          firstPromptRef.current = null;
          if (useRemote && userId != null) {
            // 登录态：写远程 + localStorage 缓存
            registerSessionRemote(newId, userId, { titleFromFirstPrompt: promptForTitle, toolCount: 0 });
          } else {
            // 未登录：只写 localStorage
            registerSession(newId, userId, { titleFromFirstPrompt: promptForTitle, toolCount: 0 });
          }
          refreshSessions();
          setSessionId(newId);
          connect(newId);
        } catch (e) {
          console.error("[useAgentSession] create session failed:", e);
          pendingRef.current.pop(); // remove the queued message
          firstPromptRef.current = null;
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
        const resp = await fetch(api(`/api/sessions/${sessionId}/messages`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (e) {
        console.error("[useAgentSession] POST /messages failed:", e);
        dispatch({
          type: "message",
          role: "agent",
          content: `⚠️ 发送失败：${(e as Error).message}`,
        });
      }
    },
    [mode, sessionId, sseReady, connect, refreshSessions, useRemote],
  );

  /** 手动切换右栏标签（UI 派发，非 AgentEvent） */
  const setPanel = useCallback((tab: PanelTab) => {
    dispatch({ type: "set_panel", tab });
  }, []);

  /** 新建会话：断开当前 SSE、清空 sessionId、重置 reducer 状态。 */
  const reset = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    cancelRef.current?.();
    cancelRef.current = null;
    setSseReady(false);
    setSessionId(null);
    pendingRef.current = [];
    firstPromptRef.current = null;
    dispatch({ type: "reset" });
  }, []);

  /**
   * 切换到已有历史会话（点击 Sidebar 列表项）：
   *   1. reset 清空当前 UI 态 + 断开旧 SSE；
   *   2. setSessionId(targetId) + connect SSE；
   *   3. agent-bridge 内存里若有 sessionHistories，会在后续消息流转中（用户重新发 prompt 触发）或
   *      SSE 连接时（若有 catch-up 机制）把历史带回来。
   *   4. 注意：agent-bridge 是内存 Map，bridge 重启后切历史只会是空的 UI 态（标题保留，messages 空），
   *      符合 v1 localStorage 持久化的最小闭环边界。
   */
  const switchSession = useCallback(
    (targetId: string) => {
      if (mode === "mock") return;
      if (targetId === sessionId) return; // 已在目标 session，不动作避免闪
      esRef.current?.close();
      esRef.current = null;
      cancelRef.current?.();
      cancelRef.current = null;
      setSseReady(false);
      pendingRef.current = [];
      firstPromptRef.current = null;
      dispatch({ type: "reset" });
      setSessionId(targetId);
      connect(targetId);
    },
    [mode, sessionId, connect],
  );

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
    /** localStorage 里的会话列表（sidebar 用），按 lastActiveAt 倒序 */
    sessions,
    /** 远程同步状态（synced/offline/unauthed/server_error/local），UI 徽标用 */
    syncStatus,
    /** 连续读失败次数（synced 清零；非 synced 累加），驱动 workbench 重复 toast 提示 */
    syncFails,
    /** 强制刷新 sessions（register/touchSession 后已自动刷，但外部如需手动触发可用） */
    refreshSessions,
    startMock,
    connect,
    send,
    setPanel,
    reset,
    /** 切到已有历史会话（点击 sidebar 列表项） */
    switchSession,
  };
}
