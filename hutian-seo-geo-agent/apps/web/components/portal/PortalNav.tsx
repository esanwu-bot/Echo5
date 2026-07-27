"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/portal", label: "我的工作台" },
  { href: "/portal/settings", label: "站点设置" },
  { href: "/portal/members", label: "成员管理" },
  { href: "/portal/subscription", label: "订阅计费" },
  { href: "/portal/usage", label: "额度用量" },
  { href: "/portal/credentials", label: "凭证管理" },
  { href: "/portal/audit", label: "操作日志" },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="w-56 shrink-0 border-r border-white/10 bg-slate-950/50 p-4">
      <div className="mb-6 px-2 text-sm font-semibold tracking-wider text-slate-400">
        租户后台
      </div>
      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-violet-600/20 text-violet-200"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
