import React from "react";
import { createRoot } from "react-dom/client";

// 引用 web 应用的工作台源码 —— 零复制
import WorkbenchPage from "../../web/app/(workbench)/workbench/page";
import WorkbenchIcons from "../../web/components/workbench/Icons";
// globals.css 提供主题变量 + 动画 + workbench-bg 网格底纹
import "../../web/app/globals.css";

/**
 * 桌面壳入口 —— Wails WebView 渲染工作台。
 *
 * 工作台走 mode="mock"（useAgentSession 内置 mockStream），
 * 零后端依赖，单 exe 双击即可体验完整 UI 时间线。
 * 真实工具调用（SSE + MCP Server）留待 v2 sidecar 迭代：
 *   Go os/exec 起 Node bridge + Python MCP，前端 NEXT_PUBLIC_DESKTOP=true
 *   时 SSE/POST 直连 127.0.0.1:4317（绕过 BFF）。
 */
function DesktopApp() {
  return (
    <div className="workbench-bg min-h-screen">
      <WorkbenchIcons />
      <WorkbenchPage />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesktopApp />
  </React.StrictMode>,
);
