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

/**
 * 工作台主页.  ← PRD §6.2 / 技术方案 §8
 *
 * 三栏布局：左栏（Sidebar）· 中栏（ChatStream + Composer）· 右栏（RightPanel）。
 * 进入页面自动播 mock 时间线（v0.1 验收：进入自动播 mock 时间线）。
 * 顶栏含模型路由（FR-W10）与主题切换（FR-W09）。
 */

const MODEL_LABELS: Record<string, string> = {
  "deepseek-v4-flash": "DeepSeek V4 Flash",
  "hy3-preview": "Hunyuan Turbo",
  "kimi-2.5": "Kimi 2.5",
};

export default function WorkbenchPage() {
  const { state, startMock, send, setPanel } = useAgentSession("mock");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 进入自动播 mock 时间线
  useEffect(() => {
    const t = setTimeout(() => startMock(), 600);
    return () => clearTimeout(t);
  }, [startMock]);

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

  return (
    <div className="relative z-10 flex h-screen flex-col">
      <TopBar
        agentRunning={state.agentRunning}
        model={model}
        onModelChange={handleModelChange}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          state={state}
          modelLabel={MODEL_LABELS[model] ?? "DeepSeek V4 Flash"}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* 中栏 */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ChatStream state={state} />
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
    </div>
  );
}
