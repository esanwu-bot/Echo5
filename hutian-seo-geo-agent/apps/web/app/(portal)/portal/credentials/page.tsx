"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface Credential {
  id: number;
  workspace_id: number;
  auth_kind: string;
  key_version: number;
  username: string;
  expires_at?: string;
  last_rotated_at?: string;
  status: string;
  created_at: string;
}

export default function CredentialsPage() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [error, setError] = useState("");

  const load = () => {
    fetchWithAuth("/portal/api/v1/credentials")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: Credential[] };
        setCreds(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (id: number, op: "rotate" | "revoke") => {
    const res = await fetchWithAuth(`/portal/api/v1/credentials/${id}/${op}`, {
      method: "POST",
    });
    if (!res.ok) setError(`${res.status}`);
    else load();
  };

  if (error && creds.length === 0) return <div className="text-red-300">{error}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">凭证管理</h1>
      {error && <div className="text-sm text-red-300">{error}</div>}
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">类型</th>
            <th>用户名</th>
            <th>版本</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {creds.map((c) => (
            <tr key={c.id} className="border-t border-white/10">
              <td className="py-2">{c.auth_kind}</td>
              <td>{c.username}</td>
              <td>{c.key_version}</td>
              <td>{c.status}</td>
              <td className="space-x-2">
                <button
                  onClick={() => action(c.id, "rotate")}
                  className="text-xs text-violet-300 hover:underline"
                >
                  轮换
                </button>
                <button
                  onClick={() => action(c.id, "revoke")}
                  className="text-xs text-red-300 hover:underline"
                >
                  吊销
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
