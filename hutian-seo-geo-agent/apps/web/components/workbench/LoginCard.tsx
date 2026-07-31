"use client";

import { useState } from "react";
import type { LoginCredentials } from "@/lib/portal/auth";

/**
 * Workbench 登录卡片（未登录遮罩的内容）。
 * 复用 portal 同一套后端 /portal/api/v1/auth/login，httpOnly cookie。
 *
 * 为了"开箱可用"，四个字段默认值填 demo seed 的已知账号（hutian-seo / hutian-seo / admin@hutian.local / hutian123），
 * 实际使用时用户自行修改。
 */
interface LoginCardProps {
  onLogin: (creds: LoginCredentials) => Promise<void>;
  /** 上一次登录失败的错误消息 */
  error?: string | null;
  /** 正在登录中 */
  loading?: boolean;
}

export default function LoginCard({
  onLogin,
  error,
  loading,
}: LoginCardProps) {
  const [tenantSlug, setTenantSlug] = useState("hutian-seo");
  const [workspaceSlug, setWorkspaceSlug] = useState("hutian-seo");
  const [email, setEmail] = useState("admin@hutian.local");
  const [password, setPassword] = useState("hutian123");

  const disabled = loading || !tenantSlug || !workspaceSlug || !email || !password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    await onLogin({ tenant_slug: tenantSlug, workspace_slug: workspaceSlug, email, password });
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-[min(92vw,420px)] flex-col gap-4 rounded-2xl border border-line bg-bg p-6 shadow-xl"
    >
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange to-violet">
            <span className="text-[13px] font-bold text-white">壶</span>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-text">壶天 · AI SEO / GEO 工作台</div>
            <div className="text-[11.5px] text-faint">登录后可按账号持久化会话历史</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="租户标识 (tenant_slug)">
          <input
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value.trim())}
            placeholder="hutian-seo"
            className={inputCls}
          />
        </Field>
        <Field label="工作空间 (workspace_slug)">
          <input
            value={workspaceSlug}
            onChange={(e) => setWorkspaceSlug(e.target.value.trim())}
            placeholder="hutian-seo"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="邮箱">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          placeholder="name@example.com"
          className={inputCls}
        />
      </Field>

      <Field label="密码">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={inputCls}
        />
      </Field>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={disabled}
        className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange to-violet text-[13px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "登录中…" : "登录"}
      </button>

      <div className="text-center text-[10.5px] text-faint">
        登录态 = httpOnly cookie HUTIAN_TENANT_TOKEN（SameSite=Strict），前端不存明文 token。
      </div>
    </form>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-line bg-bg2 px-3 text-[12.5px] text-text placeholder:text-faint focus:border-violet focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10.5px] tracking-wider text-faint">{label}</span>
      {children}
    </label>
  );
}
