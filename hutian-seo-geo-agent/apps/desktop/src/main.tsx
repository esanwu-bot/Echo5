import React from "react";
import { createRoot } from "react-dom/client";

// 引用 web 应用的工作台源码 —— 零复制
import WorkbenchPage from "../../web/app/(workbench)/workbench/page";
import WorkbenchIcons from "../../web/components/workbench/Icons";
// globals.css 提供主题变量 + 动画 + workbench-bg 网格底纹
import "../../web/app/globals.css";

/**
 * 桌面壳入口 —— Tauri WebView 渲染工作台。
 *
 * 工作台走 mode="mock"（useAgentSession 内置 mockStream），
 * 零后端依赖，单 exe 双击即可体验完整 UI 时间线。
 * 真实工具调用（SSE + MCP Server）留待 v1.0 sidecar 迭代。
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
