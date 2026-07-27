/** next-themes shim —— 移动端无 Next.js 运行时，用 localStorage + documentElement.class 实现。
 *  与桌面端 apps/desktop/src/next-themes-shim.ts 同一份逻辑，保持单一真相源。 */
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
