"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/portal/auth";

interface Seat {
  id: number;
  user_id: number;
  email: string;
  display_name: string;
  role: string;
  status: string;
  created_at: string;
}

export default function MembersPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const load = () => {
    fetchWithAuth("/portal/api/v1/seats")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as { data: Seat[] };
        setSeats(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async () => {
    const res = await fetchWithAuth("/portal/api/v1/seats/invite", {
      method: "POST",
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    if (!res.ok) setError(`${res.status}`);
    else {
      setInviteEmail("");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">成员管理</h1>
      {error && <div className="text-sm text-red-300">{error}</div>}
      <div className="flex gap-2">
        <input
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="邮箱"
          className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm"
        >
          <option value="admin">admin</option>
          <option value="member">member</option>
        </select>
        <button
          onClick={invite}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"
        >
          邀请
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">邮箱</th>
            <th>角色</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {seats.map((s) => (
            <tr key={s.id} className="border-t border-white/10">
              <td className="py-2">{s.email}</td>
              <td>{s.role}</td>
              <td>{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
