// src/api/client.ts — axios 实例 + admin token 拦截器（P0-1 鉴权接缝前端侧）
//
// 接缝：
//   - 所有请求自动注入 X-Admin-Token 头（从 localStorage 读）
//   - dev 环境走 vite proxy（/admin/api/* → localhost:4318），无 CORS
//   - 401 → 清 token + 跳登录页
//   - 错误响应统一抛 ApiError，含 {status, error, reason}

import axios, { AxiosError } from "axios";

const TOKEN_KEY = "hutian_admin_token";

export function getAdminToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  status: number;
  error: string;
  reason?: string;
}

export const api = axios.create({
  baseURL: "/admin/api/v1",
  timeout: 15000,
});

// 请求拦截器：注入 X-Admin-Token
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers["X-Admin-Token"] = token;
  }
  return config;
});

// 响应拦截器：401 清 token + 抛结构化错误
api.interceptors.response.use(
  (resp) => resp,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      clearAdminToken();
      // 跳登录页（如果不在登录页）
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const status = err.response?.status || 0;
    const body = err.response?.data as { error?: string; reason?: string } | undefined;
    const apiErr: ApiError = {
      status,
      error: body?.error || err.message || "request failed",
      reason: body?.reason,
    };
    return Promise.reject(apiErr);
  }
);
