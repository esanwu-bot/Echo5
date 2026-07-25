"use client";

import { useEffect } from "react";

/**
 * Toast 反馈.  ← FR-W10 模型路由 toast / UX-06 反馈闭环
 *
 * 右上角浮层，3 秒自动消失。
 */

export interface Toast {
  id: string;
  text: string;
  accent?: "amber" | "teal" | "green" | "violet";
}

interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function Toasts({ toasts, onDismiss }: ToastsProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const accentColor =
    toast.accent === "teal"
      ? "text-teal"
      : toast.accent === "green"
        ? "text-green"
        : toast.accent === "violet"
          ? "text-violet"
          : "text-amber";

  return (
    <div className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line2 bg-bg1 px-3.5 py-2.5 shadow-glow">
      <svg className={`h-4 w-4 ${accentColor}`}>
        <use href="#w-check" />
      </svg>
      <span className="text-[12.5px] text-text">{toast.text}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-1 text-faint transition hover:text-text"
      >
        <svg className="h-3 w-3"><use href="#w-x" /></svg>
      </button>
    </div>
  );
}
