/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../web/components/workbench/**/*.{ts,tsx}",
    "../../web/app/(workbench)/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]', ".dark"],
  theme: {
    extend: {
      colors: {
        bg0: "var(--bg0)", bg1: "var(--bg1)", bg2: "var(--bg2)", bg3: "var(--bg3)",
        line: "var(--line)", line2: "var(--line2)",
        text: "var(--text)", dim: "var(--dim)", faint: "var(--faint)",
        amber: "var(--amber)", amber2: "var(--amber2)",
        teal: "var(--teal)", green: "var(--green)",
        red: "var(--red)", violet: "var(--violet)", blue: "var(--blue)",
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
