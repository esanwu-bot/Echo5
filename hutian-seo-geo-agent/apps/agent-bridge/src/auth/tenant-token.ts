/**
 * 跨语言租户上下文内部 token 验签（对应 Go tenant-api/apps/tenant-api/token/token.go）。
 *
 * ADR-cross-lang-tenant-context：
 *   - Go tenant-api 验完租户签发 HMAC-SHA256 短期 token（5min）
 *   - bridge 收 BFF 转发的 X-Tenant-Token 头，验签后信任 payload 里的
 *     tenant/workspace/sitebase_base_url，下游无法篡改
 *   - 单一信任源：隔离逻辑只在 Go，bridge 不连 hutian 库
 *
 * token 格式：base64url(payloadJSON) + "." + base64url(hmac-sha256(payloadB64, key))
 * 与 Go 端 token.Payload 字段一一对应。
 *
 * dev 放行：env 未配 TENANT_INTERNAL_TOKEN_KEY 时返回 mode="disabled"，
 *   bridge 不强制验签（dev 无 key 也能跑）；生产配了 key 则强制验签，缺 token / 篡改 / 过期 → 抛错。
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** token payload（与 Go token.Payload 对应） */
export interface TenantTokenPayload {
  tenant_id: number;
  workspace_id: number;
  sitebase_instance_id: number;
  sitebase_base_url: string;
  seat_id?: number;
  exp: number;
  iat: number;
}

export type VerifyResult =
  | { ok: true; payload: TenantTokenPayload }
  | { ok: false; mode: "disabled" | "missing" | "invalid"; reason: string };

const ENV_KEY = process.env.TENANT_INTERNAL_TOKEN_KEY ?? "";
const REQUIRE_TOKEN = process.env.BRIDGE_REQUIRE_TOKEN === "true" || process.env.NODE_ENV === "production";

// P1 修复：fail-closed — 生产/严格模式下缺 key 直接启动失败，不再静默放行
if (REQUIRE_TOKEN && !ENV_KEY) {
  console.error("[FATAL] TENANT_INTERNAL_TOKEN_KEY is not set but BRIDGE_REQUIRE_TOKEN=true (or NODE_ENV=production). Bridge cannot start without token verification enabled.");
  process.exit(1);
}

/**
 * 验签 + 解析 payload。
 *   - env 未配 key → ok:false, mode:"disabled"（dev 放行，bridge 不阻断）
 *   - 配了 key 但 token 为空 → ok:false, mode:"missing"
 *   - 配了 key 但 token 签名无效/过期/格式错 → ok:false, mode:"invalid"
 *   - 验签通过 → ok:true, payload
 */
export function verifyTenantToken(rawToken: string | undefined | null): VerifyResult {
  // dev 放行：未配 key 不强制验签
  if (!ENV_KEY) {
    return { ok: false, mode: "disabled", reason: "TENANT_INTERNAL_TOKEN_KEY not set (dev bypass)" };
  }
  if (!rawToken) {
    return { ok: false, mode: "missing", reason: "X-Tenant-Token header missing" };
  }

  const parts = rawToken.split(".");
  if (parts.length !== 2) {
    return { ok: false, mode: "invalid", reason: "invalid token format (expected payload.signature)" };
  }
  const [payloadB64, sig] = parts;

  // 验签（恒定时间比较防时序攻击，对应 Go hmac.Equal）
  const expectedSig = sign(payloadB64);
  if (!safeEqual(sig, expectedSig)) {
    return { ok: false, mode: "invalid", reason: "signature verification failed" };
  }

  let payloadJSON: string;
  try {
    payloadJSON = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return { ok: false, mode: "invalid", reason: "decode payload failed" };
  }
  let payload: TenantTokenPayload;
  try {
    payload = JSON.parse(payloadJSON) as TenantTokenPayload;
  } catch {
    return { ok: false, mode: "invalid", reason: "unmarshal payload failed" };
  }

  // 过期检查
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, mode: "invalid", reason: "token expired" };
  }
  return { ok: true, payload };
}

function sign(payloadB64: string): string {
  return createHmac("sha256", ENV_KEY).update(payloadB64).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 是否启用了强制验签（配了 key） */
export function isTokenEnforced(): boolean {
  return ENV_KEY !== "";
}
