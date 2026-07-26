import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Vite 配置 —— 桌面壳引用 web 工作台源码，不复制代码。
// alias @ → apps/web，让 @/lib/... @/components/workbench/... 直接解析到源文件。
// next-themes 用本地 shim 替换（桌面无 Next.js 运行时）。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "../web"),
      "next-themes": resolve(__dirname, "src/next-themes-shim.ts"),
      "@hutian/agent-protocol": resolve(
        __dirname,
        "../../packages/agent-protocol/src/index.ts",
      ),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  // Wails dev server 端口，与 web 的 3000 错开；wails.json 里 frontend:dev:serverUrl 同步
  server: { port: 1420, strictPort: true },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  // 静态资源 base，Wails 用相对路径（//go:embed all:dist 后 assetserver 直接挂载）
  base: "./",
});
