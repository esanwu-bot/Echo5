/**
 * 字体兜底策略（M5 P1-2：防止构建机 Google Fonts 不通 hang 构建）。
 *
 * next/font/google 在 BUILD 时会请求 fonts.gstatic.com 拉字体文件，如果构建机连不上 Google，
 * 就会无限重试验证或 hang 构建。方案：
 *   - NEXT_PUBLIC_BUILD_OFFLINE=true 或 BUILDKITE / GITHUB_ACTIONS 等 CI 环境 + 离线，
 *     直接使用本地系统字体栈兜底，不触发 next/font/google 的 build-time fetch。
 *   - 否则仍用 next/font/google（开发环境、有网生产构建机）。
 *   - 两边都暴露同名 --font-* CSS 变量，tailwind.config.ts 照常消费。
 *
 * 参考：Hard Constraints 「M5 deployment risk: next/font/google builds fetch fonts」条目。
 */

import {
  Space_Grotesk as GoogleSpaceGrotesk,
  JetBrains_Mono as GoogleJetBrainsMono,
  Noto_Sans_SC as GoogleNotoSansSC,
} from "next/font/google";

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

export function buildFonts(): {
  disp: NextFont;
  sans: NextFont;
  mono: NextFont;
} {
  if (isOfflineBuild()) {
    return {
      disp: makeLocalFallbackFont(
        ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        "--font-disp",
      ),
      sans: makeLocalFallbackFont(
        ["PingFang SC", "Microsoft YaHei", "Noto Sans SC", "system-ui", "sans-serif"],
        "--font-sans",
      ),
      mono: makeLocalFallbackFont(
        ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "Liberation Mono", "monospace"],
        "--font-mono",
      ),
    };
  }

  const disp = GoogleSpaceGrotesk({
    subsets: ["latin"],
    variable: "--font-disp",
    display: "swap",
  });
  const sans = GoogleNotoSansSC({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
  });
  const mono = GoogleJetBrainsMono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
  });
  return { disp, sans, mono };
}

export const fonts = buildFonts();
