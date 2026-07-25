"use client";

/**
 * 思考态三点动效.  ← FR-W04 / UX-01
 *
 * 由 `thinking` 事件驱动出现/消失（reducer §5：单例，新消息/工具时清除）。
 */
export default function Thinking() {
  return (
    <div className="animate-fade-in-up flex items-center gap-2.5 px-4 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-blue text-white">
        <svg className="h-4 w-4"><use href="#w-robot" /></svg>
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-line bg-bg1 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-violet"
            style={{
              animation: "thinking-bounce 1.2s infinite",
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
        <span className="ml-1.5 text-[11px] text-faint">思考中…</span>
      </div>
    </div>
  );
}
