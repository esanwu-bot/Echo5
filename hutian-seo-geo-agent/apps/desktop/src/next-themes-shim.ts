/** next-themes shim —— 桌面端无 Next.js 运行时，用 localStorage + documentElement.class 实现。 */
import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem("theme");
  return v === "light" || v === "dark" ? v : "dark";
}

export function useTheme() {
  const [resolvedTheme, setResolved] = useState<Theme>(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((t: string) => {
    if (t === "light" || t === "dark") setResolved(t);
  }, []);

  return { resolvedTheme, setTheme } as const;
}
