import React from "react";
import { createRoot } from "react-dom/client";
import { StatusBar, Style } from "@capacitor/status-bar";

// 移动壳默认 mock 模式（零后端依赖，开箱即用演示）。
// 真接 SSE 时改为 "sse" + 注入 baseURL 指向远程 BFF 或本地 sidecar。
(window as { __HUTIAN_DESKTOP_MODE__?: "mock" | "sse" }).__HUTIAN_DESKTOP_MODE__ =
  "mock";

// 引用 web 工作台源码 —— 零复制（与桌面 Wails 同脉）
import "../../web/app/globals.css";
import WorkbenchIcons from "../../web/components/workbench/Icons";
import MobileApp from "./App";

// Capacitor 状态栏适配（原生层，web 环境无副作用）
if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#0a0e14" }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MobileApp />
  </React.StrictMode>,
);
