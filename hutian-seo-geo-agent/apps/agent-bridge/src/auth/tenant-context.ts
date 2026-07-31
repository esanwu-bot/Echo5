/**
 * session 级租户上下文存储（验签后 payload 的落地点）。
 *
 * ADR-cross-lang 雷三落地：sessionTenants 按 sessionId 分桶，MCP 路由只从此取 url。
 *   - undefined（未命中）：hard fail，不调 MCP——防"未验证 session 走默认实例串数据"
 *   - null（dev 放行，验签 disabled）：走默认实例（dev 未配 key 兼容）
 *   - payload：走 payload.sitebase_base_url 对应实例
 *
 * 雷一（并发串数据）：sessionTenants 按 sessionId 分桶，不同 session 的 payload 互不覆盖，
 *   MCP 实例池按 url 隔离子进程，两租户并发调用各走各的进程+env，不串。
 *
 * 雷四（生命周期）：session 结束应调 clearTenantContext 清理，防内存泄漏 + 过期上下文残留。
 *   bridge 重启 sessionTenants 蒸发（同 sessionHistories），M5 持久化债，记着——
 *   重启后在途工具调用拿不到上下文，应 hard fail（接雷三），不能拿到上次的残留。
 */
import type { TenantTokenPayload } from "./tenant-token.ts";

export type { TenantTokenPayload };

const sessionTenants = new Map<string, TenantTokenPayload | null>();

/** 验签后写入 session 的租户上下文（payload=验签通过；null=dev 放行） */
export function setTenantContext(
  sessionId: string,
  payload: TenantTokenPayload | null,
): void {
  sessionTenants.set(sessionId, payload);
}

export type ResolvedTenant =
  | { ok: true; sitebaseUrl: string | null; payload: TenantTokenPayload | null }
  | { ok: false; reason: string };

/**
 * 解析 session 的租户上下文用于 MCP 路由。
 *
 * @returns
 *   - ok:false → sessionTenants 未命中（undefined），hard fail 不调 MCP
 *   - ok:true, url:null → dev 放行（验签 disabled），走默认实例
 *   - ok:true, url:string → 走 payload.sitebase_base_url 对应实例
 */
export function resolveTenantForMcp(sessionId: string): ResolvedTenant {
  const payload = sessionTenants.get(sessionId);
  if (payload === undefined) {
    return {
      ok: false,
      reason: `no tenant context for session ${sessionId} (sessionTenants miss — 未验签或已清理)`,
    };
  }
  return {
    ok: true,
    sitebaseUrl: payload?.sitebase_base_url ?? null,
    payload,
  };
}

/** session 结束时清（防内存泄漏 + 过期上下文残留被复用） */
export function clearTenantContext(sessionId: string): void {
  sessionTenants.delete(sessionId);
}

/** 探针用：清空所有上下文 */
export function clearAllTenantContextForTest(): void {
  sessionTenants.clear();
}
