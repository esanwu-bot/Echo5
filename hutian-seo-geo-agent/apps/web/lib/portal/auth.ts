/**
 * 租户自服务后台（portal）与 workbench 共享的登录态模块（M5 升级）。
 *
 * M5 传输层变更（Hard Constraints NFR-TS01）：
 * - 不再把明文 access_token 塞 localStorage（XSS 直接读）；改走后端 httpOnly Cookie
 *   HUTIAN_TENANT_TOKEN，SameSite=Strict + Secure（生产 https 环境）。
 * - 前端唯一需要自己存的是 {tenant_id, workspace_id, user_id, email, display_name}
 *   这类公开元数据（给 UI 用）；任何敏感凭证不再落到 JS 可见存储。
 * - 登录/登出 + 所有请求 credentials: include 带 cookie。
 * - 写请求（POST/PATCH/PUT/DELETE）强制带两个头：
 *   ① X-Hutian-Tenant: 1                  自定义头，CSRF 二次兜底
 *   ② X-Hutian-Nonce: <HUTIAN_TENANT_NONCE cookie 值>  一次性随机串，防重放 CSRF
 * - 读请求（GET/HEAD/OPTIONS）只带 cookie 即可，SameSite=Strict 已抗 CSRF。
 * - 后端每次成功响应 Set-Cookie 刷新 nonce；前端每次发请求前从 cookie 读新 nonce。
 */

const USER_KEY = "HUTIAN_TENANT_USER";
const NONCE_COOKIE = "HUTIAN_TENANT_NONCE";

export interface TenantUser {
  user_id: number;
  seat_id: number;
  tenant_id: number;
  workspace_id: number;
  email: string;
  display_name: string;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenant_slug: string;
  workspace_slug: string;
}

export function getTenantApiBase(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_TENANT_API_URL
  ) {
    return process.env.NEXT_PUBLIC_TENANT_API_URL;
  }
  return "http://localhost:4318";
}

function docCookieRead(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");
  for (const p of parts) {
    let s = p.trimStart();
    if (s.startsWith(prefix)) return s.substring(prefix.length);
  }
  return null;
}

export function saveUser(user: TenantUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadUser(): TenantUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TenantUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

// 兼容：旧 HUTIAN_TENANT_TOKEN 里的明文 access_token 清掉（M5 迁移第一阶段）
function migrateClearLegacyTokenKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("HUTIAN_TENANT_TOKEN");
}

export async function login(
  credentials: LoginCredentials,
): Promise<TenantUser> {
  const res = await fetch(`${getTenantApiBase()}/portal/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  const json = (await res.json()) as {
    data?: TenantUser & { access_token?: string };
    error?: string;
    reason?: string;
  };
  if (!res.ok || !json.data) {
    throw new Error(json.error || json.reason || `login failed: ${res.status}`);
  }
  const user: TenantUser = {
    user_id: json.data.user_id,
    seat_id: json.data.seat_id,
    tenant_id: json.data.tenant_id,
    workspace_id: json.data.workspace_id,
    email: json.data.email,
    display_name: json.data.display_name,
    token_type: json.data.token_type || "Cookie",
    expires_in: json.data.expires_in || 86400,
  };
  saveUser(user);
  migrateClearLegacyTokenKey();
  return user;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${getTenantApiBase()}/portal/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: buildWriteHeaders(),
    });
  } catch {
    // 网络不影响本地清用户
  }
  clearUser();
  migrateClearLegacyTokenKey();
}

function buildWriteHeaders(): Record<string, string> {
  const heads: Record<string, string> = {
    "X-Hutian-Tenant": "1",
    "Content-Type": "application/json",
  };
  const nonce = docCookieRead(NONCE_COOKIE);
  if (nonce) heads["X-Hutian-Nonce"] = nonce;
  return heads;
}

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (WRITE_METHODS.has(method)) {
    const w = buildWriteHeaders();
    for (const [k, v] of Object.entries(w)) {
      if (!headers.has(k)) headers.set(k, v);
    }
  }
  if (!headers.has("Content-Type") && init.body && typeof init.body !== "object") {
    headers.set("Content-Type", "application/json");
  }
  const resp = await fetch(`${getTenantApiBase()}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  // M5 NFR-TS02：401 统一触发一次清用户，提示上层跳登录
  // 404 不触发登出——可能是 workspace 越权 UX，上层按普通错误提示
  if (resp.status === 401) {
    clearUser();
  }

  // 非简单写请求：响应里如果刷新了 X-Hutian-Nonce 头，浏览器已通过 Set-Cookie 写回，
  // 下次 buildWriteHeaders() 直接读 document.cookie
  return resp;
}
