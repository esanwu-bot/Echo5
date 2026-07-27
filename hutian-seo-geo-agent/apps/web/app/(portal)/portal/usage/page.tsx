"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface Usage {
  meter_kind: string;
  window_start: string;
  count: number;
  limit: number;
  window_kind: string;
  overage_policy: string;
}

export default function UsagePage() {
  const [items, setItems] = useState<Usage[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWithAuth("/portal/api/v1/usage")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: Usage[] };
        setItems(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  if (error) return <div className="text-red-300">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">额度与用量</h1>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">计量项</th>
            <th>窗口</th>
            <th>已用</th>
            <th>上限</th>
            <th>超限策略</th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.meter_kind} className="border-t border-white/10">
              <td className="py-2">{u.meter_kind}</td>
              <td>{u.window_start}</td>
              <td>{u.count}</td>
              <td>{u.limit}</td>
              <td>{u.overage_policy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
