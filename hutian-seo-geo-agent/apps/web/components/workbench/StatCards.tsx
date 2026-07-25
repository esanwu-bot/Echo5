"use client";

import { useEffect, useRef, useState } from "react";
import type { StatItem } from "@hutian/agent-protocol";

/**
 * 收尾指标卡.  ← FR-W05
 *
 * 4 卡（流量+89% / GEO 92% / 引用 2410 / 增速+12.5%），数字滚动动效。
 * 每张卡有独立 accent 色与副标题。
 */
export default function StatCards({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="animate-fade-in-up mx-4 mb-2 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {items.map((s, i) => (
        <StatCard key={i} stat={s} delay={i * 120} />
      ))}
    </div>
  );
}

const ACCENT_MAP: Record<string, { text: string; bg: string; border: string; icon: string }> = {
  amber: { text: "text-amber", bg: "bg-amber/8", border: "border-amber/25", icon: "text-amber" },
  teal: { text: "text-teal", bg: "bg-teal/8", border: "border-teal/25", icon: "text-teal" },
  violet: { text: "text-violet", bg: "bg-violet/8", border: "border-violet/25", icon: "text-violet" },
  green: { text: "text-green", bg: "bg-green/8", border: "border-green/25", icon: "text-green" },
};

function StatCard({ stat, delay }: { stat: StatItem; delay: number }) {
  const a = ACCENT_MAP[stat.accent] ?? ACCENT_MAP.amber;
  const display = useCountUp(stat.value, stat.dec ?? 0, delay);

  return (
    <div
      className={`rounded-xl border ${a.border} ${a.bg} p-3 transition hover:scale-[1.02]`}
      style={{ animation: `count-up 0.5s ${delay}ms both` }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-faint">{stat.label}</span>
        {stat.sub && (
          <span className="font-mono text-[9px] text-faint">{stat.sub}</span>
        )}
      </div>
      <div className={`font-grotesk text-2xl font-bold ${a.text}`}>
        {stat.prefix}
        {display}
        {stat.suffix}
      </div>
    </div>
  );
}

/** 数字滚动：从 0 到目标值，配合 count-up 动效 */
function useCountUp(target: number, dec: number, delay: number) {
  const [val, setVal] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now() + delay;
    const dur = 900;

    const tick = (t: number) => {
      if (t < start) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min((t - start) / dur, 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(target * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay]);

  return dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString();
}
