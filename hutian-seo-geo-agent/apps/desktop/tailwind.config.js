import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "../web");

/** @type {import("tailwindcss").Config} */
export default {
  content: [
    path.resolve(__dirname, "./index.html"),
    path.resolve(__dirname, "./src/**/*.{ts,tsx}"),
    // 桌面壳零复制引用 web 工作台源码：必须把 web 所有 TSX 文件都扫进 Tailwind content。
    path.resolve(webDir, "./app/**/*.{ts,tsx}"),
    path.resolve(webDir, "./components/**/*.{ts,tsx}"),
    path.resolve(webDir, "./lib/**/*.{ts,tsx}"),
  ],
  darkMode: ["class", '[data-theme="dark"]', ".dark"],
  theme: {
    extend: {
      colors: {
        bg0: "var(--bg0)",
        bg1: "var(--bg1)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        line: "var(--line)",
        line2: "var(--line2)",
        text: "var(--text)",
        dim: "var(--dim)",
        faint: "var(--faint)",
        amber: "var(--amber)",
        amber2: "var(--amber2)",
        teal: "var(--teal)",
        green: "var(--green)",
        red: "var(--red)",
        violet: "var(--violet)",
        blue: "var(--blue)",
      },
      fontFamily: {
        sans: ["'Noto Sans SC'", "system-ui", "sans-serif"],
        grotesk: ["'Space Grotesk'", "'Noto Sans SC'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: { glow: "var(--shadow)" },
    },
  },
  plugins: [],
};
