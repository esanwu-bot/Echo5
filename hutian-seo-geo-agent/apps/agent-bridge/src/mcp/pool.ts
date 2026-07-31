/**
 * MCP 实例池 · 按 sitebase_base_url 隔离路由（ADR-cross-lang-tenant-context）
 *
 * 背景：bridge 单例 sharedMcp 时代，所有租户共享一个 Python MCP 子进程，
 *   Python 端从 env SITEBASE_ADMIN_URL 读 url（全局单例）→ 所有 cms_* 调用打到同一 siteBase = 假隔离。
 *
 * 方案：bridge 按 session 验签 payload 的 sitebase_base_url 维护独立 MCP 子进程，
 *   spawn 时 env 覆盖 SITEBASE_ADMIN_URL，Python 端零改动（从 env 读，已支持）。
 *   不同 url → 不同进程 → 不同 env → 路由到不同 siteBase 实例。
 *
 * 边界：
 *   - LRU 超限淘汰最早插入的实例（close stdio）；idle 回收未做（dev 进程短命）
 *   - 进程退出清理靠 stdio 子进程随父退出，未显式 close（标注）
 *   - public→admin url 转换假设同 host 仅 path 不同；siteBase 拆域时需改 toAdminUrl
 */

import { StdioMcpClient } from "./client.ts";
import type { McpToolClient } from "./client.ts";

const mcpPool = new Map<string, McpToolClient>();
const MCP_POOL_MAX = 8;
const DEFAULT_POOL_KEY = "__default__";

/** 把当前进程 env 复制给 Python 子进程（继承 SITEBASE_* / CODEBUDDY_API_KEY 等） */
function buildChildEnv(adminUrlOverride?: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  // 覆盖 SITEBASE_ADMIN_URL：让 Python 端路由到正确 siteBase 实例
  if (adminUrlOverride) env.SITEBASE_ADMIN_URL = adminUrlOverride;
  return env;
}

/**
 * public api url → admin api url 转换。
 * sitebase_instances.BaseURL 存 public 路径（/api/v1），Python SITEBASE_ADMIN_URL 期望 admin 路径（/api/admin）。
 * 边界：假设 public 和 admin 同 host、仅 path 后缀不同；若 siteBase 后续拆域，需改此函数或 payload 直接签 admin url。
 */
export function toAdminUrl(publicUrl: string): string {
  if (publicUrl.includes("/api/v1")) return publicUrl.replace("/api/v1", "/api/admin");
  if (publicUrl.includes("/api/admin")) return publicUrl;
  return publicUrl.replace(/\/$/, "") + "/api/admin";
}

/**
 * 按 session 的 sitebase_base_url 取 MCP 实例（不同 url → 不同 Python 子进程 → 不同 env）。
 * 无 url（dev 未登录 / mock）→ 默认实例（env 原值，向后兼容）。
 */
export function getMcpForTenant(sitebaseUrl?: string | null): McpToolClient {
  const adminUrl = sitebaseUrl ? toAdminUrl(sitebaseUrl) : undefined;
  const key = adminUrl ?? DEFAULT_POOL_KEY;

  let mcp = mcpPool.get(key);
  if (mcp) return mcp;

  mcp = new StdioMcpClient({ env: buildChildEnv(adminUrl) });
  mcpPool.set(key, mcp);

  // LRU 粗暴清理：超上限淘汰最早插入的（idle 回收未做，标注边界）
  if (mcpPool.size > MCP_POOL_MAX) {
    const firstKey = mcpPool.keys().next().value;
    if (firstKey) {
      const old = mcpPool.get(firstKey);
      old?.close().catch(() => { /* stdio 关闭失败不阻塞 */ });
      mcpPool.delete(firstKey);
    }
  }
  return mcp;
}

/** 探针用：读池大小（不暴露实例本身） */
export function poolSize(): number {
  return mcpPool.size;
}

/** 探针用：清空池（仅测试用，close 所有实例） */
export async function clearPoolForTest(): Promise<void> {
  const entries = [...mcpPool.entries()];
  mcpPool.clear();
  await Promise.all(
    entries.map(([, mcp]) => mcp.close().catch(() => {})),
  );
}
