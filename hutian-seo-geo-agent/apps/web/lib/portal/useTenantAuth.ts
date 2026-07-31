"use client";

import { useCallback, useEffect, useState } from "react";
import {
  login as portalLogin,
  logout as portalLogout,
  loadUser,
  clearUser,
  fetchWithAuth,
  type TenantUser,
  type LoginCredentials,
} from "@/lib/portal/auth";

/**
 * workbench + portal 共享的登录态 hook。
 * 真相源：localStorage.HUTIAN_TENANT_USER（公开元数据，不含明文 token）
 *   - 明文 token 在 httpOnly cookie HUTIAN_TENANT_TOKEN，前端拿不到
 *   - 所有带权限请求都走 fetchWithAuth credentials:include 带 cookie
 *
 * 只读派生：
 *   - userId = user?.user_id ?? null（sessionList 分桶用，null = unlogged）
 *   - isAuthed = user != null
 *
 * me 接口（/portal/api/v1/me）会在挂载时拉一次，确认 cookie 仍有效；
 * 若 401 则清本地 user 回未登录态（cookie 过期/服务端 logout 后）。
 */
export function useTenantAuth() {
  const [user, setUser] = useState<TenantUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  // 1. 挂载：先从 localStorage 快速恢复 UI，然后异步 fetch me 校验 cookie 是否仍有效
  useEffect(() => {
    const local = loadUser();
    setUser(local);
    if (!local) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const resp = await fetchWithAuth("/portal/api/v1/me", { method: "GET" });
        if (!alive) return;
        if (resp.ok) {
          // MeResponse 的 JSON tag 是 "id" 不是 "user_id"（见 tenant-api portal.go MeResponse）
          const json = (await resp.json()) as {
            data?: {
              id: number;
              email: string;
              display_name: string;
              status: string;
              tenant_id: number;
              workspace_id: number;
              seat_id: number;
              role: string;
            };
          };
          if (json.data) {
            // /me 返回的是 {id, ...}，前端 TenantUser 统一用 {user_id, ...} 做字段名
            const updated: TenantUser = {
              user_id: json.data.id,
              seat_id: json.data.seat_id,
              tenant_id: json.data.tenant_id,
              workspace_id: json.data.workspace_id,
              email: json.data.email,
              display_name: json.data.display_name,
              token_type: "Cookie",
              expires_in: local.expires_in,
            };
            localStorage.setItem("HUTIAN_TENANT_USER", JSON.stringify(updated));
            setUser(updated);
            setMeError(null);
          } else {
            setMeError("服务端未返回用户数据");
          }
        } else if (resp.status === 401) {
          // cookie 失效 → 清本地，回到未登录
          clearUser();
          setUser(null);
          setMeError("登录已过期，请重新登录");
        } else {
          setMeError(`校验失败：HTTP ${resp.status}`);
        }
      } catch (e) {
        if (!alive) return;
        // 网络错，不信任 cookie 但不清 user（避免偶发网络导致强退），只记错误
        setMeError(`无法连接到租户服务：${(e as Error).message}`);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 登录：按 portal 后端 /portal/api/v1/auth/login。
   * 成功 → backend Set-Cookie HUTIAN_TENANT_TOKEN + nonce，前端存公开元数据。
   */
  const login = useCallback(async (creds: LoginCredentials): Promise<TenantUser> => {
    const u = await portalLogin(creds);
    setUser(u);
    setMeError(null);
    return u;
  }, []);

  /**
   * 登出：POST /portal/api/v1/auth/logout（后端清 cookie Max-Age=-1）+ 本地清 user。
   * 网络失败也会清本地（让 UI 回未登录）。
   */
  const logout = useCallback(async (): Promise<void> => {
    await portalLogout();
    setUser(null);
    setMeError(null);
  }, []);

  return {
    user,
    userId: user?.user_id ?? null,
    isAuthed: user != null,
    loading,
    meError,
    login,
    logout,
  };
}
