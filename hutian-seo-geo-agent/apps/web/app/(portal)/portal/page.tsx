"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface Me {
  id: number;
  email: string;
  display_name: string;
  status: string;
  tenant_id: number;
  workspace_id: number;
  seat_id: number;
  role: string;
}

export default function PortalHomePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWithAuth("/portal/api/v1/me")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: Me };
        setMe(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!me) return <div className="text-slate-400">加载中…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">我的工作台</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card label="邮箱" value={me.email} />
        <Card label="显示名" value={me.display_name || "-"} />
        <Card label="角色" value={me.role} />
        <Card label="状态" value={me.status} />
        <Card label="租户 ID" value={String(me.tenant_id)} />
        <Card label="工作区 ID" value={String(me.workspace_id)} />
        <Card label="席位 ID" value={String(me.seat_id)} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
