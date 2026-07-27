/**
 * 字体兜底策略（M5 P1-2：防止构建机 Google Fonts 不通 hang 构建）。
 *
 * next/font/google 在 BUILD 时会请求 fonts.gstatic.com 拉字体文件，如果构建机连不上 Google，
 * 就会无限重试验证或 hang 构建。方案：
 *   - NEXT_PUBLIC_BUILD_OFFLINE=true 或 HUTIAN_BUILD_OFFLINE=true 时，
 *     直接使用本地系统字体栈兜底，不触发 next/font/google 的 build-time fetch。
 *   - 否则仍用 next/font/google（开发环境、有网生产构建机）。
 *   - 两边都暴露同名 --font-* CSS 变量，tailwind.config.ts 照常消费。
 *
 * Next.js 约束：next/font/google 的 loader 必须在模块作用域顶层调用并赋值给 const，
 * 不能放在函数体内条件调用。故用顶层 const + 导出 fonts 对象。
 */

function isOfflineBuild(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NEXT_PUBLIC_BUILD_OFFLINE === "true") return true;
  return process.env.HUTIAN_BUILD_OFFLINE === "true";
}

type NextFont = { variable: string; className: string; style: { fontFamily: string } };

function makeLocalFallbackFont(
  families: string[],
  variable: string,
): NextFont {
  return {
    variable,
    className: `font-${variable.replace(/^--font-/, "")}`,
    style: { fontFamily: families.join(", ") },
  };
}

// 离线兜底：本地系统字体栈（不触发 next/font/google 的 build-time fetch）
const LOCAL_DISP = makeLocalFallbackFont(
  ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  "--font-disp",
);
const LOCAL_SANS = makeLocalFallbackFont(
  ["PingFang SC", "Microsoft YaHei", "Noto Sans SC", "system-ui", "sans-serif"],
  "--font-sans",
);
const LOCAL_MONO = makeLocalFallbackFont(
  ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "Liberation Mono", "monospace"],
  "--font-mono",
);

// 在线字体：next/font/google 必须在模块作用域顶层调用（Next.js 约束）
import {
  Space_Grotesk as GoogleSpaceGrotesk,
  JetBrains_Mono as GoogleJetBrainsMono,
  Noto_Sans_SC as GoogleNotoSansSC,
} from "next/font/google";

const GROTESK = GoogleSpaceGrotesk({
  subsets: ["latin"],
  variable: "--font-disp",
  display: "swap",
});
const NOTO = GoogleNotoSansSC({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const JETBRAINS = GoogleJetBrainsMono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const fonts = isOfflineBuild()
  ? { disp: LOCAL_DISP, sans: LOCAL_SANS, mono: LOCAL_MONO }
  : { disp: GROTESK, sans: NOTO, mono: JETBRAINS };
