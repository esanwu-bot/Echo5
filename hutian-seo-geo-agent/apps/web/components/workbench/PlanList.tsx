"use client";

import type { PlanItem } from "@hutian/agent-protocol";

/**
 * 计划清单.  ← FR-W03 / UX-01
 *
 * 计划项随进度 pending → now → ok 逐项点亮。
 * now 项有脉冲动效，ok 项有 ✓ 标记。
 */
export default function PlanList({ items }: { items: PlanItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="animate-fade-in-up mx-4 mb-2 rounded-xl border border-line bg-bg1/60 p-3">
      <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-faint">
        <svg className="h-3 w-3"><use href="#w-target" /></svg>
        执行计划
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-2.5 transition ${
              item.status === "pending" ? "opacity-45" : "opacity-100"
            }`}
          >
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
              {item.status === "ok" ? (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-green/15 text-green">
                  <svg className="h-2.5 w-2.5"><use href="#w-check" /></svg>
                </span>
              ) : item.status === "now" ? (
                <span className="h-2 w-2 rounded-full bg-amber animate-[pulse-amber_1.4s_infinite]" />
              ) : (
                <span className="h-2 w-2 rounded-full border border-line2" />
              )}
            </span>
            <span
              className={`text-[12.5px] ${
                item.status === "now"
                  ? "font-semibold text-amber"
                  : item.status === "ok"
                    ? "text-dim line-through decoration-faint/40"
                    : "text-dim"
              }`}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
