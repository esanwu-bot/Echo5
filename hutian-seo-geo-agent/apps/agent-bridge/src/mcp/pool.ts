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
// 规模化债（review 校准）：MCP_POOL_MAX=8 对 SaaS 太小，多租户活跃 siteBase 实例数可能远超 8，
//   频繁 spawn/close Python 进程有开销；close().catch() 吞异常子进程泄漏不可见；idle 回收未做。
//   dev 够用；生产需：上限按活跃租户量调 + close 失败可观测 + idle 回收。

/** 最小权限 env：只透传 Python MCP 必需的变量，防敏感密钥泄露到子进程 */
const ALLOWED_ENV_PREFIXES = ["SITEBASE_", "PYTHONPATH", "PYTHON", "PATH", "HOME", "USERPROFILE", "TEMP", "TMP"];

function buildChildEnv(adminUrlOverride?: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (ALLOWED_ENV_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      env[key] = value;
    }
  }
  // 覆盖 SITEBASE_ADMIN_URL：让 Python 端路由到正确 siteBase 实例
  if (adminUrlOverride) env.SITEBASE_ADMIN_URL = adminUrlOverride;
  return env;
}

/**
 * public api url → admin api url 转换。
 * cms_instances.BaseURL 存 public 路径（/api/v1），Python SITEBASE_ADMIN_URL 期望 admin 路径（/api/admin）。
 * （T8.0 起 sitebase_instances 表升级为 cms_instances；本池子逻辑不变，T8.5 再升级 key 维度）
 *
 * 设计债（review 校准）：admin url 不在签名 payload 里，是签名值的派生猜测——
 *   原则上"实际连接的 url 应该是签名值本身、不该是签名值的派生"。
 *   正解是 cms_instances 表直接存 admin url、或 payload 直接签 MCP 要用的 admin url，
 *   让"哪个 url 给 MCP 用"在签发端（Go）就定死，消除 bridge 的 toAdminUrl 猜测。
 *   生产 siteBase 若 public/admin 不同域，"同 host 仅 path 不同"假设直接崩，这条债到那时必还。
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

/**
 * 探针用：取某 url 对应实例的 env（验雷二：SITEBASE_ADMIN_URL 只来自 url 覆盖）。
 * 验 process.env 原值不污染——即使 env 里已有 SITEBASE_ADMIN_URL，也被传入 url 覆盖。
 */
export function getMcpEnvForTest(sitebaseUrl: string): Record<string, string> {
  return buildChildEnv(toAdminUrl(sitebaseUrl));
}
