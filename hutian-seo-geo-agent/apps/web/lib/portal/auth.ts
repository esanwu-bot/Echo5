/**
 * 租户自服务后台（portal）与 workbench 共享的登录态模块。
 *
 * 设计要点（T7.5 会话打通）：
 * - portal 与 workbench 同在 apps/web 一个 Next.js app 内，天然共享 localStorage/cookie。
 * - token 存在单 key：HUTIAN_TENANT_TOKEN，两边都从同 key 读写，避免各登各的。
 * - API 基础地址通过 env NEXT_PUBLIC_TENANT_API_URL 配置，dev 默认 localhost:4318。
 * - 提供 login / logout / fetchWithAuth 三个原子操作；UI 层通过 AuthProvider 消费。
 */

const TOKEN_KEY = "HUTIAN_TENANT_TOKEN";

export interface TenantToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: number;
  seat_id: number;
  tenant_id: number;
  workspace_id: number;
  email: string;
  display_name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenant_slug: string;
  workspace_slug: string;
}

export function getTenantApiBase(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_TENANT_API_URL) {
    return process.env.NEXT_PUBLIC_TENANT_API_URL;
  }
  return "http://localhost:4318";
}

export function saveToken(token: TenantToken): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function loadToken(): TenantToken | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TenantToken;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(credentials: LoginCredentials): Promise<TenantToken> {
  const res = await fetch(`${getTenantApiBase()}/portal/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const json = (await res.json()) as { data?: TenantToken; error?: string };
  if (!res.ok || !json.data) {
    throw new Error(json.error || `login failed: ${res.status}`);
  }
  saveToken(json.data);
  return json.data;
}

export function logout(): void {
  clearToken();
}

export async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = loadToken();
  if (!token) {
    throw new Error("unauthenticated");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `${token.token_type} ${token.access_token}`);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");
  return fetch(`${getTenantApiBase()}${path}`, {
    ...init,
    headers,
  });
}
