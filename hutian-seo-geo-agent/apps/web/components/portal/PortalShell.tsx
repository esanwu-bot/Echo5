"use client";

import { useEffect, useState } from "react";
import { loadUser, login, logout, type TenantUser, type LoginCredentials } from "@/lib/portal/auth";
import { PortalNav } from "./PortalNav";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TenantUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(loadUser());
    setReady(true);
  }, []);

  const handleLogin = async (creds: LoginCredentials) => {
    const u = await login(creds);
    setUser(u);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        加载中…
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <PortalNav />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {user.display_name || user.email} · {user.email}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-md border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            退出
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

function LoginForm({
  onLogin,
}: {
  onLogin: (creds: LoginCredentials) => Promise<void>;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  const [form, setForm] = useState<LoginCredentials>({
    email: isDev ? "owner-a@hutian.dev" : "",
    password: isDev ? "dev-password-change-in-prod" : "",
    tenant_slug: isDev ? "tenant-a" : "",
    workspace_slug: isDev ? "ws-a" : "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-4 rounded-xl border border-white/10 bg-slate-900/50 p-6"
      >
        <h1 className="text-xl font-semibold">租户后台登录</h1>
        <p className="text-sm text-slate-400">
          portal 与 workbench 共享同一份登录态（httpOnly Cookie：HUTIAN_TENANT_TOKEN，SameSite=Strict，
          明文 token 不出现在响应 JSON / localStorage 里）。
        </p>
        {error && <div className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm text-slate-400">邮箱</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-400">密码</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">租户 slug</label>
            <input
              value={form.tenant_slug}
              onChange={(e) => setForm((f) => ({ ...f, tenant_slug: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-400">工作区 slug</label>
            <input
              value={form.workspace_slug}
              onChange={(e) => setForm((f) => ({ ...f, workspace_slug: e.target.value }))}
              className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
        </div>
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
    </div>
  );
}
