"use client";

import { useCallback, useEffect, useState } from "react";
import { useAgentSession } from "@/lib/useAgentSession";
import TopBar from "@/components/workbench/TopBar";
import Sidebar from "@/components/workbench/Sidebar";
import ChatStream from "@/components/workbench/ChatStream";
import RightPanel from "@/components/workbench/RightPanel";
import Composer from "@/components/workbench/Composer";
import StatusBar from "@/components/workbench/StatusBar";
import Toasts, { type Toast } from "@/components/workbench/Toasts";
import LoginCard from "@/components/workbench/LoginCard";
import { useTenantAuth } from "@/lib/portal/useTenantAuth";
import type { LoginCredentials } from "@/lib/portal/auth";
import { mergeUnloggedTo } from "@/lib/sessionList";

/**
 * 工作台主页.  ← PRD §6.2 / 技术方案 §8
 *
 * 三栏布局：左栏（Sidebar）· 中栏（ChatStream + Composer）· 右栏（RightPanel）。
 * 进入页面自动播 mock 时间线（v0.1 验收：进入自动播 mock 时间线）。
 * 顶栏含模型路由（FR-W10）与主题切换（FR-W09）。
 *
 * 登录门禁（本单新增）：
 *   - ?mode=mock 免登录（验收 demo 不卡登录）
 *   - 其他模式未登录 → 显示 LoginCard 遮罩，禁用发送/新建会话；登录后自动解锁
 *   - useTenantAuth 挂 /portal/api/v1/me 验证 cookie 有效期；401 自动回未登录
 *   - 会话历史按 user_id 分桶 localStorage key = hutian_session_list_v1:<user_id>
 *   - 未登录产生的历史（unlogged 桶）：登录成功后可选合入用户桶，这里默认合入
 */

const MODEL_LABELS: Record<string, string> = {
  "deepseek-v4-flash": "DeepSeek V4 Flash",
  "hy3-preview": "Hunyuan Turbo",
  "kimi-2.5": "Kimi 2.5",
};

export default function WorkbenchPage() {
  const {
    user,
    userId,
    isAuthed,
    loading: authLoading,
    meError,
    login: authLogin,
    logout: authLogout,
  } = useTenantAuth();

  // 真流默认不 auto-send —— 用户实测后再决定是否加开场示例（避免"自动烧钱"）
  // mock 模式照旧自动播 demo 时间线（demo 不计费、不入历史）
  // 切 mock 走 ?mode=mock query 或桌面壳全局标记 window.__HUTIAN_DESKTOP_MODE__
  const mode: "mock" | "sse" = (() => {
    if (typeof window === "undefined") return "sse";
    const desktopMode = (window as { __HUTIAN_DESKTOP_MODE__?: "mock" | "sse" })
      .__HUTIAN_DESKTOP_MODE__;
    if (desktopMode) return desktopMode;
    return new URLSearchParams(window.location.search).get("mode") === "mock"
      ? "mock"
      : "sse";
  })();

  const bypassAuth = mode === "mock"; // mock 模式免登录
  const gated = !bypassAuth && !isAuthed && !authLoading;

  // 多租户上下文：从登录态解出 tenant_id + workspace_id，传给 useAgentSession 注入 header
  const tenantContext = user && !bypassAuth
    ? { tenant_id: user.tenant_id, workspace_id: user.workspace_id }
    : null;

  const {
    state,
    sessionId,
    sessions,
    send,
    setPanel,
    startMock,
    reset,
    switchSession,
  } = useAgentSession(mode, "", userId, tenantContext);

  const [model, setModel] = useState("deepseek-v4-flash");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);

  // mock 模式进入自动播 demo；sse 模式首屏是可输入的空工作台
  useEffect(() => {
    if (mode === "mock") startMock();
  }, [mode, startMock]);

  const addToast = useCallback((text: string, accent?: Toast["accent"]) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, text, accent }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleModelChange = useCallback(
    (id: string, label: string) => {
      setModel(id);
      addToast(`模型已切换到 ${label}`, "violet");
    },
    [addToast],
  );

  /**
   * 未登录态：LoginCard 提交 → authLogin → 登录成功后把 unlogged 桶的会话合并到新用户桶
   * （避免"我没登录时试玩了一下，登录后历史没了"的困惑）。
   */
  const handleLogin = useCallback(
    async (creds: LoginCredentials) => {
      setLoginLoading(true);
      setLoginError(null);
      try {
        const u = await authLogin(creds);
        // unlogged → 新用户桶 合入（有重复 id 跳过，最多 50 条）
        const merged = mergeUnloggedTo(u.user_id);
        addToast(
          merged > 0 ? `登录成功，已迁移 ${merged} 条未登录会话` : "登录成功",
          "teal",
        );
        setShowLoginOverlay(false);
      } catch (e) {
        const msg = (e as Error).message || "登录失败";
        setLoginError(msg);
        addToast(`登录失败：${msg}`, "amber");
      } finally {
        setLoginLoading(false);
      }
    },
    [authLogin, addToast],
  );

  const handleLogout = useCallback(async () => {
    await authLogout();
    reset();
    setSearchKeyword("");
    addToast("已退出登录", "teal");
  }, [authLogout, reset, addToast]);

  // 顶栏点击登录按钮 → 显示遮罩
  const handleRequestLogin = useCallback(() => {
    if (bypassAuth) return;
    setShowLoginOverlay(true);
  }, [bypassAuth]);

  return (
    <div className="relative z-10 flex h-screen flex-col">
      <TopBar
        agentRunning={state.agentRunning}
        model={model}
        onModelChange={handleModelChange}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        user={bypassAuth ? null : user}
        authError={bypassAuth ? null : meError}
        onRequestLogin={handleRequestLogin}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          state={state}
          modelLabel={MODEL_LABELS[model] ?? "DeepSeek V4 Flash"}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={sessionId}
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          onSelectSession={(targetId) => {
            switchSession(targetId);
            addToast("已切换会话", "violet");
            setSidebarOpen(false);
          }}
          onNewSession={() => {
            reset();
            setSearchKeyword("");
            addToast("已新建会话", "violet");
            // 移动端点新建后顺手收起抽屉
            setSidebarOpen(false);
          }}
        />

        {/* 中栏 */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ChatStream state={state} sessionId={sessionId} />
          <Composer
            disabled={state.agentRunning && !state.done}
            onSend={send}
          />
        </main>

        {/* 右栏 */}
        <RightPanel state={state} onTabChange={setPanel} />
      </div>

      <StatusBar state={state} />

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {/*
        登录遮罩（两种触发）：
        1. 未登录进入页面直接显示（gated=true）——强制登录才能用
        2. 已进入但点顶栏登录按钮（showLoginOverlay=true）——弹窗式
      */}
      {(gated || showLoginOverlay) ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg1/85 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <LoginCard
              onLogin={handleLogin}
              error={loginError}
              loading={loginLoading}
            />
            {!gated ? (
              <button
                onClick={() => {
                  setShowLoginOverlay(false);
                  setLoginError(null);
                }}
                className="text-[12px] text-faint underline-offset-2 hover:text-text hover:underline"
              >
                暂不登录，继续使用（会话历史将存到未登录公共桶）
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
