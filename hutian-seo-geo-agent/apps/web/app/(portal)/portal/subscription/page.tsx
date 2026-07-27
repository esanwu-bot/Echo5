"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface Subscription {
  id: number;
  plan: string;
  status: string;
  seats_limit: number;
  current_period_start?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  grace_days: number;
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWithAuth("/portal/api/v1/subscription")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: Subscription };
        setSub(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!sub) return <div className="text-slate-400">加载中…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">订阅与计费</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card label="套餐" value={sub.plan} />
        <Card label="状态" value={sub.status} />
        <Card label="席位上限" value={String(sub.seats_limit)} />
        <Card label="宽限期" value={`${sub.grace_days} 天`} />
        <Card label="当前周期开始" value={sub.current_period_start || "-"} />
        <Card label="当前周期结束" value={sub.current_period_end || "-"} />
        <Card label="试用结束" value={sub.trial_ends_at || "-"} />
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
