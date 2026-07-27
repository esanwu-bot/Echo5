"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface Workspace {
  id: number;
  slug: string;
  brand_name: string;
  industry: string;
  sitebase_instance_id: number;
  fallback_copy_json: string;
  status: string;
}

export default function SettingsPage() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth("/portal/api/v1/workspace")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: Workspace };
        setWs(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  const save = async () => {
    if (!ws) return;
    setSaving(true);
    const res = await fetchWithAuth("/portal/api/v1/workspace", {
      method: "PATCH",
      body: JSON.stringify({
        brand_name: ws.brand_name,
        industry: ws.industry,
        fallback_copy_json: ws.fallback_copy_json,
      }),
    });
    setSaving(false);
    if (!res.ok) setError(`${res.status}`);
    else setError("");
  };

  if (error && !ws) return <div className="text-red-300">{error}</div>;
  if (!ws) return <div className="text-slate-400">加载中…</div>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">站点设置</h1>
      {error && <div className="text-sm text-red-300">{error}</div>}
      <div className="space-y-3">
        <Field label="品牌名">
          <input
            value={ws.brand_name}
            onChange={(e) => setWs({ ...ws, brand_name: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="行业">
          <input
            value={ws.industry}
            onChange={(e) => setWs({ ...ws, industry: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Fallback Copy JSON">
          <textarea
            value={ws.fallback_copy_json}
            onChange={(e) => setWs({ ...ws, fallback_copy_json: e.target.value })}
            className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
            rows={4}
          />
        </Field>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-400">{label}</label>
      {children}
    </div>
  );
}
