import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 壶天运营管理后台（admin）
// 接缝（P0-2）：admin 不直连 hutian 库，所有请求走 tenant-api 的 /admin/api/v1/* 端点
// dev proxy 把 /admin/api/* 代理到 tenant-api（4318），避开 CORS
// 鉴权（P0-1）：X-Admin-Token 头由 axios 拦截器注入（src/api/client.ts），值从 localStorage 读
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4319,
    proxy: {
      "/admin/api": {
        target: "http://localhost:4318",
        changeOrigin: true,
      },
      "/healthz": {
        target: "http://localhost:4318",
        changeOrigin: true,
      },
    },
  },
});
