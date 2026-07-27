"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface AuditLog {
  id: number;
  created_at: string;
  actor_kind: string;
  action: string;
  target_kind: string;
  target_id: number;
  seat_id: number;
  meta_json: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWithAuth("/portal/api/v1/audit-logs")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: AuditLog[] };
        setLogs(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  if (error) return <div className="text-red-300">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">操作日志</h1>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">时间</th>
            <th>动作</th>
            <th>目标</th>
            <th>元信息</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t border-white/10">
              <td className="py-2">{l.created_at}</td>
              <td>{l.action}</td>
              <td>
                {l.target_kind}:{l.target_id}
              </td>
              <td className="max-w-xs truncate">{l.meta_json}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
