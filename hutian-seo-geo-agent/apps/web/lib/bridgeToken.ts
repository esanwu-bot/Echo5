/**
 * BFF → tenant-api 签发 HMAC 内部 token → 透传给 bridge（ADR-cross-lang-tenant-context）。
 *
 * 流程：
 *   1. BFF（Next.js Route Handler，服务端）从请求读 httpOnly cookie HUTIAN_TENANT_TOKEN
 *   2. 调 tenant-api GET /portal/api/v1/internal/token（带 cookie JWT 验签）
 *   3. 拿到 HMAC 短期 token（5min），设 X-Tenant-Token 头传给 bridge
 *   4. bridge 验签后信任 payload 里的 tenant/workspace/sitebase 路由
 *
 * 为什么 BFF 不自己签：ADR 单一信任源——隔离逻辑只在 Go tenant-api，
 *   BFF 拿不到 hutian 库也不做 workspace 归属校验，只转发签名 token。
 *
 * 缓存：token 5min 有效，模块级缓存 4min 避免每个请求都打 tenant-api。
 *   按 user 维度缓存（cookie JWT 对应不同 user）—— key 用 JWT 前缀（前 16 字符，非完整 token 避免内存常驻明文）。
 *
 * dev 兼容：无 cookie（未登录/mock 模式）→ 返回 null，bridge 端按"未配 key 放行"处理。
 */

import type { NextRequest } from "next/server";

const TENANT_TOKEN_COOKIE = "HUTIAN_TENANT_TOKEN";
const TENANT_API_BASE =
  process.env.TENANT_API_URL ||
  process.env.NEXT_PUBLIC_TENANT_API_URL ||
  "http://localhost:4318";

/** token 缓存条目 */
interface CacheEntry {
  token: string;
  expireAt: number; // ms 时间戳
}

/** 模块级缓存：key = JWT 前缀（标识 user 会话），value = { token, expireAt } */
const tokenCache = new Map<string, CacheEntry>();

/** 缓存提前量：token 5min 有效，缓存按 4min 用，留 1min 余量防边界过期 */
const CACHE_TTL_MS = 4 * 60 * 1000;

/** 缓存上限，避免内存泄漏（多用户场景） */
const CACHE_MAX = 1000;

/**
 * 从 Next.js 请求拿 bridge 用的 HMAC 内部 token。
 *
 * @param req Next.js Route Handler 的 req 对象（读 cookie 用）
 * @returns HMAC token 字符串；未登录/dev mock 返回 null
 */
export async function getBridgeToken(req: NextRequest): Promise<string | null> {
  const jwt = req.cookies.get(TENANT_TOKEN_COOKIE)?.value;
  if (!jwt) {
    // 未登录（mock 模式 / dev 免登）→ 不签发，bridge 端按 dev 放行处理
    return null;
  }

  const cacheKey = jwt.slice(0, 16);
  const now = Date.now();
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expireAt > now) {
    return cached.token;
  }

  try {
    // 调 tenant-api 签发：GET 走 JWT cookie 验签，不需要 CSRF 头（GET 非简单写请求豁免）
    // BFF 服务端 fetch 需手动把浏览器 cookie 转发给 tenant-api
    const resp = await fetch(`${TENANT_API_BASE}/portal/api/v1/internal/token`, {
      method: "GET",
      headers: {
        Cookie: `${TENANT_TOKEN_COOKIE}=${jwt}`,
      },
    });
    if (!resp.ok) {
      // tenant-api 验签失败（401）或其他错误 → 不阻断 bridge（bridge 端会按 token 缺失处理）
      return null;
    }
    const json = (await resp.json()) as { data?: { token?: string; expires_in?: number } };
    const data = json.data;
    const token = data?.token;
    if (!token || !data) return null;

    // 缓存（按 expires_in，默认 5min）
    const ttl = (data.expires_in ?? 300) * 1000;
    tokenCache.set(cacheKey, {
      token,
      expireAt: now + Math.min(ttl, CACHE_TTL_MS),
    });

    // LRU 粗暴清理：超上限清最早的
    if (tokenCache.size > CACHE_MAX) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey) tokenCache.delete(firstKey);
    }

    return token;
  } catch {
    // tenant-api 不可达 → 不阻断 bridge（dev 容错）
    return null;
  }
}
