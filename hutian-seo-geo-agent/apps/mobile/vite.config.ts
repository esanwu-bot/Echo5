import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Vite 配置 —— 移动壳引用 web 工作台源码，零复制（与桌面 Wails 同脉）。
// alias @ → apps/web，让 @/lib/... @/components/workbench/... 直接解析到源文件。
// next-themes 用本地 shim 替换（移动端无 Next.js 运行时）。
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
  server: { port: 1421, strictPort: true },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  // Capacitor WebView 用相对路径加载本地 dist
  base: "./",
});
